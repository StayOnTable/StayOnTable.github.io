import type { Metadata } from "next";
import { ArrowUpRight, Bookmark, Play, Radio, ScrollText } from "lucide-react";
import Link from "next/link";
import { GiscusComments } from "@/components/giscus-comments";
import { PageIntro, PlaceholderBadge } from "@/components/ui";
import { libraryEntries } from "@/content/site";

export const metadata: Metadata = {
  title: "每日输入",
  description: "每天读过的文章、看过的视频，以及真正留下来的知识。",
};

const sourceIcons = {
  文章: ScrollText,
  视频: Play,
  播客: Radio,
  论文: Bookmark,
};

const topicIds: Record<string, string> = {
  "AI 产品": "ai-product",
  内容创作: "content",
  知识管理: "knowledge",
  沟通: "communication",
};

export default function LibraryPage() {
  return (
    <div className="shell page-shell">
      <PageIntro
        eyebrow="LIBRARY / 每日输入"
        title="不只收藏，也留下改变"
        description="每天看过的文章、视频和观点，会被压缩成一句真正有用的判断。这里关心的不是信息数量，而是它后来如何参与了行动。"
        aside={<div className="library-count"><span>本期示例</span><strong>04</strong><small>条输入记录</small></div>}
      />

      <div className="topic-rail" aria-label="主题索引">
        <span>主题</span>
        <a href="#all" data-active="true">全部</a>
        <a href="#ai-product">AI 产品</a>
        <a href="#content">内容创作</a>
        <a href="#knowledge">知识管理</a>
        <a href="#communication">沟通</a>
      </div>

      <section className="library-list" id="all" aria-label="知识输入记录">
        {libraryEntries.map((entry) => {
          const Icon = sourceIcons[entry.sourceType];
          return (
            <article
              className="library-entry"
              id={topicIds[entry.topic]}
              key={`${entry.date}-${entry.title}`}
            >
              <div className="library-entry__date">
                <time dateTime={entry.date}>{entry.date}</time>
                <span>{entry.topic}</span>
              </div>
              <div className="library-entry__icon"><Icon size={18} aria-hidden="true" /></div>
              <div className="library-entry__copy">
                <div className="library-entry__meta">
                  <span>{entry.sourceType}</span>
                  <span aria-hidden="true">·</span>
                  <span>{entry.creator}</span>
                  {entry.placeholder ? <PlaceholderBadge /> : null}
                </div>
                <h2>{entry.title}</h2>
                <p><strong>留下来的：</strong>{entry.takeaway}</p>
                {entry.sourceUrl ? (
                  <a className="library-entry__source" href={entry.sourceUrl} rel="noreferrer" target="_blank">
                    查看原始来源 <ArrowUpRight size={13} aria-hidden="true" />
                  </a>
                ) : (
                  <span className="library-entry__source" data-disabled="true">原始来源待补充</span>
                )}
              </div>
              <Link className="icon-link" href={entry.href} aria-label={`打开：${entry.title}`}>
                <ArrowUpRight size={18} aria-hidden="true" />
              </Link>
            </article>
          );
        })}
      </section>

      <aside className="submit-teaser">
        <div>
          <span className="submit-teaser__label">LATER / 共建书架</span>
          <h2>你也发现了值得留下的内容？</h2>
          <p>后续会开放推荐入口。每条提交先经过审核，再进入公共知识库。</p>
        </div>
        <button type="button" className="button button--disabled" disabled>推荐入口 · 即将开放</button>
      </aside>

      <GiscusComments />
    </div>
  );
}
