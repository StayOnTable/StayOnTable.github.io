"use client";

import { ArrowUpRight, CalendarDays, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { InvestmentReflection } from "@/app/investing/investment-reflections";
import { InvestmentDisclaimer } from "./investment-disclaimer";

function displayDate(date: string) {
  return date.replaceAll("-", " / ");
}

export function InvestmentReflectionsPanel({
  reflections,
}: {
  reflections: InvestmentReflection[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();
  const recentReflections = reflections.slice(0, 3);
  const modalOpen = selectedId !== null;

  function openHistory(id: string) {
    returnFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    setSelectedId(id);
  }

  function closeHistory() {
    setSelectedId(null);
  }

  useEffect(() => {
    if (!modalOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeHistory();
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
  }, [modalOpen]);

  return (
    <>
      <aside className="investment-reflections" aria-labelledby="recent-investment-reflections">
        <div className="investment-reflections__heading">
          <div>
            <span>FIELD NOTES / 投资随想</span>
            <h2 id="recent-investment-reflections">最近的投资心得</h2>
          </div>
          <span>{String(reflections.length).padStart(2, "0")}</span>
        </div>

        <div className="investment-reflections__recent">
          {recentReflections.map((reflection) => (
            <button
              aria-haspopup="dialog"
              className="investment-reflection-preview"
              key={reflection.id}
              onClick={() => openHistory(reflection.id)}
              type="button"
            >
              <time dateTime={reflection.date}>{displayDate(reflection.date)}</time>
              <strong>{reflection.title}</strong>
              <p>{reflection.body}</p>
              <span>查看全部心得 <ArrowUpRight aria-hidden="true" size={14} /></span>
            </button>
          ))}
        </div>

        {reflections.length === 0 ? (
          <p className="investment-reflections__empty">新的投资心得会从这里开始记录。</p>
        ) : null}
      </aside>

      {modalOpen
        ? createPortal(
            <div
              className="investment-reflections-dialog-backdrop"
              onMouseDown={(event) => {
                if (event.currentTarget === event.target) closeHistory();
              }}
              role="presentation"
            >
              <div
                aria-describedby={descriptionId}
                aria-labelledby={titleId}
                aria-modal="true"
                className="investment-reflections-dialog"
                ref={modalRef}
                role="dialog"
              >
                <header className="investment-reflections-dialog__header">
                  <div>
                    <span>INVESTMENT FIELD NOTES</span>
                    <h2 id={titleId}>投资心得 · 全部记录</h2>
                    <p id={descriptionId}>按时间倒序保留当时的判断、感受与选择。</p>
                  </div>
                  <button
                    aria-label="关闭投资心得"
                    onClick={closeHistory}
                    ref={closeButtonRef}
                    type="button"
                  >
                    <X aria-hidden="true" size={20} />
                  </button>
                </header>

                <div className="investment-reflections-dialog__history">
                  {reflections.map((reflection) => (
                    <article
                      data-selected={reflection.id === selectedId || undefined}
                      key={reflection.id}
                    >
                      <div className="investment-reflections-dialog__date">
                        <CalendarDays aria-hidden="true" size={14} />
                        <time dateTime={reflection.date}>{displayDate(reflection.date)}</time>
                      </div>
                      <h3>{reflection.title}</h3>
                      <p>{reflection.body}</p>
                      {reflection.sources.length ? (
                        <div className="investment-reflections-dialog__sources">
                          <span>相关公开来源</span>
                          {reflection.sources.map((source) => (
                            <a href={source.url} key={source.url} rel="noreferrer" target="_blank">
                              {source.label} <ArrowUpRight aria-hidden="true" size={13} />
                            </a>
                          ))}
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
                <InvestmentDisclaimer compact />
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
