"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

const BUSUANZI_SCRIPT = "https://cdn.busuanzi.cc/busuanzi/3.6.9/busuanzi.min.js";

export function SiteVisitCounter() {
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    const ids = ["busuanzi_today_pv", "busuanzi_today_uv", "busuanzi_site_pv"];
    const nodes = ids
      .map((id) => document.getElementById(id))
      .filter((node): node is HTMLElement => Boolean(node));
    const normalizeServiceError = () => {
      const hasServiceError = nodes.some((node) =>
        /禁用|错误|异常|失败/.test(node.textContent ?? ""),
      );
      if (hasServiceError) setUnavailable(true);
    };
    const observer = new MutationObserver(normalizeServiceError);
    nodes.forEach((node) => observer.observe(node, { childList: true, subtree: true }));

    const timeout = window.setTimeout(() => {
      const values = nodes.map((node) => node.textContent?.trim());
      if (values.every((value) => !value || value === "加载中")) setUnavailable(true);
    }, 6000);
    return () => {
      observer.disconnect();
      window.clearTimeout(timeout);
    };
  }, []);

  const fallback = unavailable ? "暂不可用" : "加载中";

  return (
    <aside className="visit-counter" aria-label="网站访问统计">
      <Script
        id="busuanzi-counter"
        onError={() => setUnavailable(true)}
        src={BUSUANZI_SCRIPT}
        strategy="afterInteractive"
      />
      <div className="visit-counter__metric">
        <span>今日浏览</span>
        <strong aria-live="polite" id="busuanzi_today_pv">{fallback}</strong>
      </div>
      <div className="visit-counter__metric">
        <span>今日访客</span>
        <strong aria-live="polite" id="busuanzi_today_uv">{fallback}</strong>
      </div>
      <div className="visit-counter__metric">
        <span>累计访问</span>
        <strong aria-live="polite" id="busuanzi_site_pv">{fallback}</strong>
      </div>
      <a
        className="visit-counter__source"
        href="https://www.busuanzi.cc/count.php?search=stayontable.github.io"
        rel="noreferrer"
        target="_blank"
      >
        实时统计 · 不蒜子（可能处理访问记录）
      </a>
    </aside>
  );
}
