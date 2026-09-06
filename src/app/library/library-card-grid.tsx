"use client";

/* External thumbnails are rendered as supplied public assets in this static site. */
/* eslint-disable @next/next/no-img-element */

import {
  ArrowUpRight,
  Bookmark,
  CalendarDays,
  ExternalLink,
  Maximize2,
  Play,
  Radio,
  ScrollText,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { LibraryRecord } from "./library-records";

const sourceIcons = {
  文章: ScrollText,
  视频: Play,
  播客: Radio,
  论文: Bookmark,
};

function LibraryMedia({ record, expanded = false }: { record: LibraryRecord; expanded?: boolean }) {
  const Icon = sourceIcons[record.sourceType];

  return (
    <div
      className="library-card__media"
      data-expanded={expanded || undefined}
      data-source-type={record.sourceType}
    >
      {record.thumbnail ? (
        <img
          alt={record.thumbnail.alt}
          decoding="async"
          loading="lazy"
          referrerPolicy="no-referrer"
          src={record.thumbnail.src}
        />
      ) : (
        <div className="library-card__media-placeholder" aria-label={`${record.sourceType}缩略图待补充`} role="img">
          <Icon aria-hidden="true" size={expanded ? 34 : 27} strokeWidth={1.5} />
          <span>{record.sourceType}</span>
          <small>THUMBNAIL / 待补充</small>
        </div>
      )}
    </div>
  );
}

export function LibraryCardGrid({ records }: { records: LibraryRecord[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();
  const selected = useMemo(
    () => records.find((record) => record.id === selectedId) ?? null,
    [records, selectedId],
  );

  function openRecord(record: LibraryRecord) {
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSelectedId(record.id);
  }

  function closeRecord() {
    setSelectedId(null);
  }

  useEffect(() => {
    if (!selected) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRecord();
        return;
      }

      if (event.key !== "Tab" || !modalRef.current) return;

      const focusable = Array.from(
        modalRef.current.querySelectorAll<HTMLElement>(
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
      <section className="library-grid" id="all" aria-label="知识输入记录">
        {records.map((record, index) => {
          const Icon = sourceIcons[record.sourceType];

          return (
            <article
              className="library-card"
              data-layout={index % 4 === 0 || index % 4 === 3 ? "wide" : "compact"}
              data-source-type={record.sourceType}
              id={record.topicId}
              key={record.id}
            >
              <button
                aria-haspopup="dialog"
                aria-label={`展开：${record.title}`}
                className="library-card__hit-area"
                onClick={() => openRecord(record)}
                type="button"
              >
                <span className="sr-only">展开内容</span>
              </button>

              <LibraryMedia record={record} />

              <div className="library-card__body">
                <div className="library-card__meta">
                  <span className="library-card__kind"><Icon aria-hidden="true" size={13} />{record.sourceType}</span>
                  <span aria-hidden="true">·</span>
                  <span>{record.creator}</span>
                  {record.placeholder ? <span className="placeholder-badge">示例占位</span> : null}
                </div>

                <h2>{record.title}</h2>
                <p>{record.takeaway}</p>

                <footer className="library-card__footer">
                  <span><CalendarDays aria-hidden="true" size={13} />{record.date}</span>
                  <span>{record.topic}</span>
                  <span className="library-card__expand">展开查看 <Maximize2 aria-hidden="true" size={13} /></span>
                </footer>
              </div>
            </article>
          );
        })}
      </section>

      {selected
        ? createPortal(
            <div
              className="library-dialog-backdrop"
              onMouseDown={(event) => {
                if (event.currentTarget === event.target) closeRecord();
              }}
              role="presentation"
            >
              <div
                aria-describedby={descriptionId}
                aria-labelledby={titleId}
                aria-modal="true"
                className="library-dialog"
                ref={modalRef}
                role="dialog"
              >
                <button
                  aria-label="关闭展开内容"
                  className="library-dialog__close"
                  onClick={closeRecord}
                  ref={closeButtonRef}
                  type="button"
                >
                  <X aria-hidden="true" size={19} />
                </button>

                <div className="library-dialog__visual">
                  <LibraryMedia expanded record={selected} />
                  <div className="library-dialog__index" aria-hidden="true">{selected.date.replaceAll("-", " / ")}</div>
                </div>

                <div className="library-dialog__content">
                  <div className="library-card__meta">
                    <span>{selected.sourceType}</span>
                    <span aria-hidden="true">·</span>
                    <span>{selected.creator}</span>
                    <span aria-hidden="true">·</span>
                    <span>{selected.topic}</span>
                    {selected.placeholder ? <span className="placeholder-badge">示例占位</span> : null}
                  </div>

                  <h2 id={titleId}>{selected.title}</h2>
                  <p className="library-dialog__takeaway">{selected.takeaway}</p>

                  <div className="library-dialog__details" id={descriptionId}>
                    <p>{selected.expanded.intro}</p>
                    <ul>
                      {selected.expanded.points.map((point) => <li key={point}>{point}</li>)}
                    </ul>
                  </div>

                  <div className="library-dialog__actions">
                    {selected.sourceUrl ? (
                      <a className="button button--primary" href={selected.sourceUrl} rel="noreferrer" target="_blank">
                        查看原始来源 <ExternalLink aria-hidden="true" size={14} />
                      </a>
                    ) : (
                      <span className="library-dialog__source-missing">原始来源待补充</span>
                    )}
                    {selected.href !== "/library/" ? (
                      <Link className="text-link" href={selected.href} onClick={closeRecord}>
                        阅读完整记录 <ArrowUpRight aria-hidden="true" size={15} />
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
