import type { Metadata } from "next";
import { ArrowRight, Boxes, Captions, GitBranch, Layers3, PlayCircle } from "lucide-react";
import Link from "next/link";
import { PageIntro, PlaceholderBadge } from "@/components/ui";
import { projects } from "@/content/site";

export const metadata: Metadata = {
  title: "项目",
  description: "开源工作流、AI 产品实验和这个个人主页的建设记录。",
};

export default function ProjectsPage() {
  return (
    <div className="shell page-shell">
      <PageIntro
        eyebrow="PROJECTS / 项目"
        title="让想法留下可操作的形状"
        description="这里不会只放一张最终截图。每个项目都会尽量展示它解决的问题、关键取舍、当前状态，以及可以亲手体验的部分。"
        aside={<div className="project-counter"><span>ACTIVE</span><strong>03</strong><small>个公开项目</small></div>}
      />

      <section className="featured-project" id="motion-workflow">
        <div className="featured-project__copy">
          <div className="featured-project__meta"><span>01 · FEATURED</span><PlaceholderBadge /></div>
          <h2>视频动效与剪辑工作流</h2>
          <p>把重复发生的剪辑动作——素材整理、字幕、节奏点、动效和导出——变成一套可组合的公开系统。</p>
          <div className="tag-list"><span>Remotion</span><span>Templates</span><span>Creator tools</span></div>
          <div className="project-actions">
            <button className="button button--primary" type="button" disabled><PlayCircle size={17} /> Demo 整理中</button>
            <a className="text-link" href="#workflow">查看工作流 <ArrowRight size={16} /></a>
          </div>
        </div>
        <div className="workflow-board" id="workflow" aria-label="剪辑工作流示意图">
          <div className="workflow-board__header"><span>WORKFLOW / 00:42</span><span>1080 × 1920</span></div>
          <div className="workflow-stage"><Captions size={27} /><strong>一个模板，复用一次表达</strong><small>CAPTION PRESET · 04</small></div>
          <div className="workflow-timeline">
            <span className="track-label">VIDEO</span><i className="clip clip--one" /><i className="clip clip--two" />
            <span className="track-label">TEXT</span><i className="clip clip--three" /><i className="clip clip--four" />
            <span className="track-label">AUDIO</span><i className="wave" />
          </div>
        </div>
      </section>

      <section className="project-detail-grid">
        <article className="project-detail-card" id="ask-lizheng">
          <div className="project-detail-card__icon"><Layers3 size={22} /></div>
          <div className="project-detail-card__number">02</div>
          <PlaceholderBadge />
          <h2>{projects[1].title}</h2>
          <p>{projects[1].summary}</p>
          <ul><li>3 个关键问题 + 1 个场景追问</li><li>公开语料与来源引用</li><li>会话内个性化，不建立隐式画像</li></ul>
          <Link className="arrow-link" href="/ask/"><span>查看概念页</span><ArrowRight size={16} /></Link>
        </article>
        <article className="project-detail-card" id="personal-site">
          <div className="project-detail-card__icon"><GitBranch size={22} /></div>
          <div className="project-detail-card__number">03</div>
          <h2>{projects[2].title}</h2>
          <p>{projects[2].summary}</p>
          <ul><li>内容与代码分离</li><li>隐私白名单发布</li><li>GitHub Pages 静态托管</li></ul>
          <span className="arrow-link arrow-link--muted"><span>你正在浏览这个项目</span><Boxes size={16} /></span>
        </article>
      </section>
    </div>
  );
}
