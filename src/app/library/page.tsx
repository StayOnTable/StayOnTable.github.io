import type { Metadata } from "next";
import { GiscusComments } from "@/components/giscus-comments";
import { PageIntro } from "@/components/ui";
import { LibraryCardGrid } from "./library-card-grid";
import { libraryRecords } from "./library-records";

export const metadata: Metadata = {
  title: "每日输入",
  description: "每天读过的文章、看过的视频，以及真正留下来的知识。",
};

export default function LibraryPage() {
  return (
    <div className="shell page-shell library-page">
      <PageIntro
        compact
        eyebrow="LIBRARY / 每日输入"
        title="不只收藏，也留下改变"
        description={"这里收拢每天读过、听过与看过的内容。\n卡片先呈现简短描述，点开后再看完整摘要、个人观点与原始来源。"}
        aside={<div className="library-count"><span>本期示例</span><strong>{String(libraryRecords.length).padStart(2, "0")}</strong><small>条输入记录</small></div>}
      />

      <div className="topic-rail" aria-label="主题索引">
        <span>主题</span>
        <a href="#all" data-active="true">全部</a>
        <a href="#ai-product">AI 产品</a>
        <a href="#content">内容创作</a>
        <a href="#knowledge">知识管理</a>
        <a href="#communication">沟通</a>
      </div>

      <LibraryCardGrid records={libraryRecords} />

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
