import type { Metadata } from "next";

import { GiscusComments } from "@/components/giscus-comments";
import { Eyebrow } from "@/components/ui";
import { journeyEntries, journeyMoments } from "@/content/journey";

import { JourneyTimeline } from "./journey-timeline";
import styles from "./journey.module.css";

export const metadata: Metadata = {
  title: "求职旅程",
  description: "社招进度、面试节点、简短复盘与沿途手记。",
};

export default function JourneyPage() {
  return (
    <div className={`shell page-shell ${styles.page}`}>
      <header className={styles.intro}>
        <Eyebrow>JOURNEY / 求职旅程</Eyebrow>
        <div className={styles.introCopy}>
          <h1>最近走到哪一步？</h1>
          <p>面试节点、简短复盘，以及一些还在发生的心情。</p>
        </div>
      </header>

      <section className={styles.timelineSection} aria-labelledby="journey-timeline-title">
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.sectionKicker}>INTERVIEW MAP</span>
            <h2 id="journey-timeline-title">面试时间线</h2>
          </div>
          <p>日期与高度展示进度；移入节点查看简述，点击展开完整复盘。</p>
        </div>
        <JourneyTimeline entries={journeyEntries} />
      </section>

      <div className={styles.contextGrid}>
        <section className={styles.statusPanel} aria-labelledby="journey-status-title">
          <div className={styles.panelHeading}>
            <span>STATUS</span>
            <h2 id="journey-status-title">正在进行</h2>
          </div>
          <dl className={styles.statusList}>
            <div>
              <dt>当前阶段</dt>
              <dd>大厂与 AI startup 并行</dd>
            </div>
            <div>
              <dt>关注方向</dt>
              <dd>推荐算法 · 大模型算法</dd>
            </div>
          </dl>
        </section>

        <section className={styles.momentsPanel} aria-labelledby="journey-moments-title">
          <div className={styles.momentsHeading}>
            <div className={styles.panelHeading}>
              <span>FIELD NOTES</span>
              <h2 id="journey-moments-title">此刻手记</h2>
            </div>
            <span className={styles.demoBadge}>示例占位</span>
          </div>
          <ol className={styles.momentList}>
            {journeyMoments.map((moment) => (
              <li key={moment.slug}>
                <time dateTime={moment.publishedAt}>{moment.publishedAt}</time>
                <p>{moment.text}</p>
              </li>
            ))}
          </ol>
          <p className={styles.momentsNotice}>当前为版式示例，之后替换为 JoJo 确认过的真实短句。</p>
        </section>
      </div>

      <GiscusComments />
    </div>
  );
}
