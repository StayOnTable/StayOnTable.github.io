import type { Metadata } from "next";
import { CalendarClock, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { GiscusComments } from "@/components/giscus-comments";
import { PageIntro, PlaceholderBadge } from "@/components/ui";
import { journeyEntries } from "@/content/journey";

export const metadata: Metadata = {
  title: "求职旅程",
  description: "经过脱敏与延迟发布的社招进度、面试复盘和阶段心得。",
};

export default function JourneyPage() {
  return (
    <div className="shell page-shell">
      <PageIntro
        eyebrow="JOURNEY / 求职旅程"
        title="把求职当作一次持续校准"
        description="这里记录我在社招过程里遇到的问题、做过的判断和每一轮复盘。公开的是可迁移的方法，不是敏感的实时行程。"
        aside={
          <div className="privacy-note">
            <LockKeyhole size={17} aria-hidden="true" />
            <p><strong>隐私保护中</strong><br />只显示发布日期；内容经过脱敏、延迟与人工确认。</p>
          </div>
        }
      />

      <div className="journey-summary" aria-label="当前求职状态">
        <div><span>当前阶段</span><strong>探索与面试并行</strong><PlaceholderBadge /></div>
        <div><span>关注方向</span><strong>AI 产品 · 内容工具</strong><PlaceholderBadge /></div>
        <div><span>更新节奏</span><strong>确认后不定期发布</strong></div>
      </div>

      <section className="timeline" aria-label="求职记录时间轴">
        <div className="timeline__line" aria-hidden="true" />
        {journeyEntries.map((entry, index) => (
          <article className="timeline-entry" key={entry.slug}>
            <div className="timeline-entry__date">
              <span className="timeline-entry__dot" aria-hidden="true" />
              <time dateTime={entry.publishedAt}>{entry.publishedAt}</time>
              <small>发布日期</small>
            </div>
            <Link className="timeline-card" href={entry.href}>
              <div className="timeline-card__topline">
                <span className="status-chip" data-status={entry.interviewStatus}>{entry.interviewStatus}</span>
                <span>记录 0{journeyEntries.length - index}</span>
              </div>
              <div>
                {entry.placeholder ? <PlaceholderBadge /> : null}
                <h2>{entry.company}</h2>
                <p className="timeline-card__role">{entry.role} · {entry.round}</p>
              </div>
              <blockquote>{entry.summary}</blockquote>
              <span className="timeline-card__link">阅读复盘 →</span>
            </Link>
          </article>
        ))}
      </section>

      <aside className="process-card">
        <CalendarClock size={20} aria-hidden="true" />
        <div>
          <strong>一条记录如何来到这里？</strong>
          <p>真实记录先留在私有端，经过去标识化、3–5 天随机延迟和逐条确认，公开页只保留对他人有帮助的部分。</p>
        </div>
      </aside>

      <GiscusComments />
    </div>
  );
}
