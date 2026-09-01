"use client";

import { MessageCircle } from "lucide-react";
import { useEffect, useRef } from "react";

const config = {
  repo: process.env.NEXT_PUBLIC_GISCUS_REPO,
  repoId: process.env.NEXT_PUBLIC_GISCUS_REPO_ID,
  category: process.env.NEXT_PUBLIC_GISCUS_CATEGORY,
  categoryId: process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID,
};

export function GiscusComments() {
  const containerRef = useRef<HTMLDivElement>(null);
  const ready = Object.values(config).every(Boolean);

  useEffect(() => {
    if (!ready || !containerRef.current) return;

    containerRef.current.replaceChildren();
    const script = document.createElement("script");
    script.src = "https://giscus.app/client.js";
    script.async = true;
    script.crossOrigin = "anonymous";
    script.setAttribute("data-repo", config.repo!);
    script.setAttribute("data-repo-id", config.repoId!);
    script.setAttribute("data-category", config.category!);
    script.setAttribute("data-category-id", config.categoryId!);
    script.setAttribute("data-mapping", "pathname");
    script.setAttribute("data-strict", "1");
    script.setAttribute("data-reactions-enabled", "1");
    script.setAttribute("data-emit-metadata", "0");
    script.setAttribute("data-input-position", "top");
    script.setAttribute("data-theme", "preferred_color_scheme");
    script.setAttribute("data-lang", "zh-CN");
    containerRef.current.appendChild(script);
  }, [ready]);

  if (!ready) {
    return (
      <aside className="comments-placeholder">
        <MessageCircle size={20} aria-hidden="true" />
        <div>
          <strong>留言区将在上线前开启</strong>
          <p>配置本站的 GitHub Discussions 后，这里会自动载入 Giscus。当前不会收集任何输入。</p>
        </div>
      </aside>
    );
  }

  return <div className="comments" ref={containerRef} aria-label="评论区" />;
}
