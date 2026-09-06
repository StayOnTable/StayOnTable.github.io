"use client";

import type { CSSProperties, FormEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import { Maximize2, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { JourneyBody } from "@/components/journey-body";
import type { JourneyEntry } from "@/content/journey";

import styles from "./journey.module.css";

type TimelineLane = "pass" | "waiting" | "no-hc" | "fail" | "origin";
type TimelineTone = { solid: string; soft: string };
type TimelineVariables = CSSProperties & {
  "--company-color": string;
  "--company-soft": string;
  "--lane-y": string;
};
type ScrollbarVariables = CSSProperties & {
  "--scroll-progress": string;
};

const LANE_Y: Record<TimelineLane, number> = {
  pass: 24,
  waiting: 50,
  "no-hc": 68,
  fail: 77,
  origin: 50,
};

const COMPANY_TONES: readonly TimelineTone[] = [
  { solid: "#315842", soft: "#dfe8dd" },
  { solid: "#a54b39", soft: "#efded6" },
  { solid: "#3f6173", soft: "#dfe8ed" },
  { solid: "#8d682f", soft: "#efe5d1" },
  { solid: "#70556f", soft: "#e8dfe8" },
  { solid: "#39736c", soft: "#dceae7" },
  { solid: "#525f7b", soft: "#e0e4ed" },
  { solid: "#9a5540", soft: "#efdfd8" },
  { solid: "#5c7451", soft: "#e1e8dd" },
] as const;

function normalizeCompany(company: string): string {
  return company.trim().toLocaleLowerCase("zh-CN");
}

function timelineLane(entry: JourneyEntry): TimelineLane {
  const status = entry.interviewStatus.trim().toLocaleLowerCase("en-US");
  if (status === "pass") return "pass";
  if (entry.tags.some((tag) => tag.trim().toLocaleUpperCase("en-US") === "HC")) return "no-hc";
  if (status === "fail") return "fail";
  if (status === "waiting" || status === "hold") return "waiting";
  return "origin";
}

function timelineDate(date: string): string {
  return date.replaceAll("-", ".");
}

export function JourneyTimeline({ entries }: { entries: readonly JourneyEntry[] }) {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [scrollState, setScrollState] = useState({ max: 0, value: 0 });
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const viewportId = useId();
  const titleId = useId();
  const descriptionId = useId();
  const chronologicalEntries = useMemo(
    () => [...entries].sort((left, right) =>
      left.eventDate.localeCompare(right.eventDate) || left.slug.localeCompare(right.slug),
    ),
    [entries],
  );
  const selected = useMemo(
    () => chronologicalEntries.find((entry) => entry.slug === selectedSlug) ?? null,
    [chronologicalEntries, selectedSlug],
  );
  const companyTones = useMemo(() => {
    const tones = new Map<string, TimelineTone>();
    chronologicalEntries.forEach((entry) => {
      const company = normalizeCompany(entry.company);
      if (!tones.has(company)) {
        tones.set(company, COMPANY_TONES[tones.size % COMPANY_TONES.length]);
      }
    });
    return tones;
  }, [chronologicalEntries]);
  const selectedTone = selected
    ? companyTones.get(normalizeCompany(selected.company)) ?? COMPANY_TONES[0]
    : COMPANY_TONES[0];
  const scrollPercent = scrollState.max > 0
    ? Math.round((scrollState.value / scrollState.max) * 100)
    : 0;

  function openEntry(entry: JourneyEntry) {
    returnFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    setSelectedSlug(entry.slug);
  }

  function closeEntry() {
    setSelectedSlug(null);
  }

  function scrollTimelineTo(nextValue: number) {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const value = Math.min(scrollState.max, Math.max(0, nextValue));
    viewport.scrollTo({ left: value, behavior: "instant" });
    setScrollState((current) => ({ ...current, value }));
  }

  function handleScrollControl(event: FormEvent<HTMLInputElement>) {
    scrollTimelineTo(Number(event.currentTarget.value));
  }

  function handleScrollKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    const smallStep = Math.max(1, Math.round(scrollState.max / 24));
    const largeStep = Math.max(smallStep, Math.round(scrollState.max / 6));
    let nextValue: number | null = null;

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextValue = scrollState.value + smallStep;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextValue = scrollState.value - smallStep;
    } else if (event.key === "PageDown") {
      nextValue = scrollState.value + largeStep;
    } else if (event.key === "PageUp") {
      nextValue = scrollState.value - largeStep;
    } else if (event.key === "Home") {
      nextValue = 0;
    } else if (event.key === "End") {
      nextValue = scrollState.max;
    }

    if (nextValue === null) return;
    event.preventDefault();
    scrollTimelineTo(nextValue);
  }

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    let animationFrame = 0;
    const syncScrollState = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        const max = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
        const value = Math.min(max, Math.max(0, viewport.scrollLeft));
        setScrollState((current) =>
          Math.abs(current.max - max) < 1 && Math.abs(current.value - value) < 1
            ? current
            : { max, value },
        );
      });
    };

    syncScrollState();
    viewport.addEventListener("scroll", syncScrollState, { passive: true });
    window.addEventListener("resize", syncScrollState);
    const resizeObserver = new ResizeObserver(syncScrollState);
    resizeObserver.observe(viewport);
    if (viewport.firstElementChild) resizeObserver.observe(viewport.firstElementChild);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      viewport.removeEventListener("scroll", syncScrollState);
      window.removeEventListener("resize", syncScrollState);
      resizeObserver.disconnect();
    };
  }, [chronologicalEntries.length]);

  useEffect(() => {
    if (!selected) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeEntry();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      window.requestAnimationFrame(() => returnFocusRef.current?.focus());
    };
  }, [selected]);

  return (
    <>
      <div className={styles.timelineLegend} aria-label="时间线节点高度说明">
        <span><b>↑</b> pass</span>
        <span><b>—</b> waiting</span>
        <span><b>↘</b> 无 HC</span>
        <span><b>↓</b> fail</span>
      </div>
      <div className={styles.timelineViewport} id={viewportId} ref={viewportRef} tabIndex={0}>
        <ol
          className={styles.timelineTrack}
          style={{ "--journey-count": entries.length } as CSSProperties}
        >
          {chronologicalEntries.map((entry, index) => {
            const recordNumber = String(index + 1).padStart(2, "0");
            const lane = timelineLane(entry);
            const nextEntry = chronologicalEntries[index + 1];
            const nextLane = nextEntry ? timelineLane(nextEntry) : null;
            const companyTone = companyTones.get(normalizeCompany(entry.company)) ?? COMPANY_TONES[0];
            const itemStyle = {
              "--company-color": companyTone.solid,
              "--company-soft": companyTone.soft,
              "--lane-y": `${LANE_Y[lane]}%`,
            } as TimelineVariables;
            const accessibleSummary = [
              entry.placeholder ? "示例占位" : "公开记录",
              entry.company,
              entry.role,
              entry.round,
              entry.interviewStatus,
              `节点日期 ${entry.eventDate}`,
              entry.summary,
              "点击在本页展开详情",
            ].join("，");

            return (
              <li className={styles.timelineItem} data-lane={lane} key={entry.slug} style={itemStyle}>
                {nextLane ? (
                  <svg
                    aria-hidden="true"
                    className={styles.timelineSegment}
                    preserveAspectRatio="none"
                    viewBox="0 0 100 100"
                  >
                    <line
                      vectorEffect="non-scaling-stroke"
                      x1="0"
                      x2="100"
                      y1={LANE_Y[lane]}
                      y2={LANE_Y[nextLane]}
                    />
                  </svg>
                ) : null}
                <button
                  aria-expanded={selected?.slug === entry.slug}
                  aria-haspopup="dialog"
                  aria-label={accessibleSummary}
                  className={styles.timelineLink}
                  onClick={() => openEntry(entry)}
                  type="button"
                >
                  <span className={styles.node} aria-hidden="true">
                    <span>{recordNumber}</span>
                  </span>

                  <span className={styles.nodeLabel} aria-hidden="true">
                    {entry.placeholder ? <span className={styles.placeholderLabel}>示例</span> : null}
                    <time dateTime={entry.eventDate}>{timelineDate(entry.eventDate)}</time>
                    <strong>{entry.company}</strong>
                    <small>{entry.round} · {entry.interviewStatus}{lane === "no-hc" ? " · 无 HC" : ""}</small>
                  </span>

                  <span className={styles.revealPanel} aria-hidden="true">
                    <span className={styles.revealTopline}>
                      <span className={styles.statusChip}>{entry.interviewStatus}</span>
                      {entry.placeholder ? <span>示例占位</span> : <span>公开记录</span>}
                    </span>
                    <strong>{entry.company}</strong>
                    <span className={styles.revealRole}>{entry.role} · {entry.round}</span>
                    <span className={styles.revealDate}>节点日期 {entry.eventDate}</span>
                    <span className={styles.revealSummary}>{entry.summary}</span>
                    <span className={styles.revealLink}>
                      本页展开 <Maximize2 size={13} aria-hidden="true" />
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
      <div
        className={styles.timelineScrollControl}
        data-scrollable={scrollState.max > 0 ? "true" : "false"}
        style={{
          "--scroll-progress": `${scrollPercent}%`,
        } as ScrollbarVariables}
      >
        <span aria-hidden="true">← 较早</span>
        <input
          aria-controls={viewportId}
          aria-label="拖动查看求职时间线的后续节点"
          aria-valuetext={`已浏览 ${scrollPercent}%`}
          disabled={scrollState.max <= 0}
          max={Math.max(1, Math.round(scrollState.max))}
          min="0"
          onInput={handleScrollControl}
          onKeyDown={handleScrollKeyDown}
          step="1"
          type="range"
          value={Math.min(Math.round(scrollState.value), Math.max(1, Math.round(scrollState.max)))}
        />
        <span aria-hidden="true">最近 →</span>
      </div>

      {selected
        ? createPortal(
            <div
              className={styles.dialogBackdrop}
              onMouseDown={(event) => {
                if (event.currentTarget === event.target) closeEntry();
              }}
              role="presentation"
            >
              <div
                aria-describedby={descriptionId}
                aria-labelledby={titleId}
                aria-modal="true"
                className={styles.dialog}
                ref={dialogRef}
                role="dialog"
                style={{
                  "--company-color": selectedTone.solid,
                  "--company-soft": selectedTone.soft,
                } as TimelineVariables}
              >
                <button
                  aria-label="关闭面试记录详情"
                  className={styles.dialogClose}
                  onClick={closeEntry}
                  ref={closeButtonRef}
                  type="button"
                >
                  <X aria-hidden="true" size={19} />
                </button>

                <header className={styles.dialogHeader}>
                  <div className={styles.dialogTopline}>
                    <span className={styles.statusChip}>{selected.interviewStatus}</span>
                    <span className={selected.placeholder ? styles.dialogPlaceholder : undefined}>
                      {selected.placeholder ? "示例占位" : "公开记录"}
                    </span>
                  </div>
                  <h2 id={titleId}>{selected.company}</h2>
                  <p>{selected.role} · {selected.round}</p>
                </header>

                <dl className={styles.dialogMeta}>
                  <div>
                    <dt>岗位</dt>
                    <dd>{selected.role}</dd>
                  </div>
                  <div>
                    <dt>轮次</dt>
                    <dd>{selected.round}</dd>
                  </div>
                  <div>
                    <dt>节点日期</dt>
                    <dd><time dateTime={selected.eventDate}>{selected.eventDate}</time></dd>
                  </div>
                  <div>
                    <dt>当前状态</dt>
                    <dd>{selected.interviewStatus}</dd>
                  </div>
                </dl>

                <div className={styles.dialogCopy}>
                  <section>
                    <span className={styles.dialogSectionLabel}>NOTES / 复盘正文</span>
                    <JourneyBody body={selected.body} className={styles.dialogBody} />
                    <span className={styles.visuallyHidden} id={descriptionId}>
                      {selected.summary}
                    </span>
                  </section>
                </div>

                <footer className={styles.dialogFooter}>
                  <div className={styles.dialogTags} aria-label="记录标签">
                    {selected.tags.map((tag) => <span key={tag}>#{tag}</span>)}
                  </div>
                </footer>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
