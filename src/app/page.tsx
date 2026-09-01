import type { Metadata } from "next";
import { ArrowDown, ArrowUpRight, BookOpen, CircleDot, Sparkles } from "lucide-react";
import Link from "next/link";
import { InvestmentDisclaimer } from "@/components/investment-disclaimer";
import { ArrowLink, Eyebrow, PlaceholderBadge, SectionHeading } from "@/components/ui";
import { notes, projects, siteMeta, xiaohongshuPosts } from "@/content/site";

export const metadata: Metadata = {
  title: "首页",
  description: siteMeta.description,
};

export default function HomePage() {
  return (
    <>
      <section className="home-hero shell">
        <div className="home-hero__copy">
          <Eyebrow>个人主页 · 持续建设中</Eyebrow>
          <h1>
            把思考变成
            <br />
            <em>可以被看见</em>的作品。
          </h1>
          <p className="home-hero__lead">
            这里收集我的写作、项目、求职旅程、每日输入与投资复盘。不是完成后的陈列柜，而是一张持续生长的工作台。
          </p>
          <div className="hero-actions">
            <Link className="button button--primary" href="/projects/">
              看看最近在做什么 <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
            <Link className="button button--quiet" href="/about/">
              先认识我
            </Link>
          </div>
          <p className="hero-placeholder-note">
            <PlaceholderBadge /> 首页介绍为示例文案，等待本人最终确认。
          </p>
        </div>

        <div className="signal-card" aria-label="当前状态">
          <div className="signal-card__topline">
            <span>NOW / 2026</span>
            <span className="live-dot"><i /> ONGOING</span>
          </div>
          <div className="signal-card__center">
            <span className="signal-card__label">现在最在意的事</span>
            <strong>做出能被使用、<br />也能被讨论的东西。</strong>
          </div>
          <div className="signal-card__grid">
            <div><span>01</span><p>内容工作流</p></div>
            <div><span>02</span><p>AI 产品实验</p></div>
            <div><span>03</span><p>求职与复盘</p></div>
          </div>
          <ArrowDown className="signal-card__arrow" size={20} aria-hidden="true" />
        </div>
      </section>

      <section className="now-strip" aria-label="近期状态">
        <div className="shell now-strip__inner">
          <div className="now-strip__title"><CircleDot size={16} /> 此刻在做</div>
          <div className="now-strip__item"><span>BUILD</span> 视频动效工作流</div>
          <div className="now-strip__item"><span>WRITE</span> 把输入变成文章</div>
          <div className="now-strip__item"><span>EXPLORE</span> 个人 AI 助手</div>
        </div>
      </section>

      <section className="section shell">
        <SectionHeading
          eyebrow="LATEST NOTES"
          title="最近写下的东西"
          description="文章先讲清一个具体问题，再留下可以继续讨论的入口。"
          href="/library/"
          linkLabel="查看全部记录"
        />
        <div className="notes-grid">
          {notes.slice(0, 3).map((note, index) => (
            <article className="note-card" key={note.slug}>
              <div className="note-card__meta">
                <span>0{index + 1}</span>
                <span>{note.kind}</span>
              </div>
              <div>
                {note.placeholder ? <PlaceholderBadge /> : null}
                <h3><Link href={note.href}>{note.title}</Link></h3>
                <p>{note.summary}</p>
              </div>
              <div className="note-card__footer">
                <time dateTime={note.publishedAt}>{note.publishedAt}</time>
                <span>{note.readTime}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section section--rule shell">
        <SectionHeading
          eyebrow="SELECTED PROJECTS"
          title="正在变成产品的想法"
          description="每个项目都尽量留下过程、取舍和可以亲手体验的结果。"
          href="/projects/"
        />
        <div className="project-stack">
          {projects.map((project, index) => (
            <Link className="project-row" data-tone={project.tone} href={project.href} key={project.slug}>
              <span className="project-row__number">0{index + 1}</span>
              <div className="project-row__copy">
                <div>{project.placeholder ? <PlaceholderBadge /> : null}<span className="project-stage">{project.stage}</span></div>
                <h3>{project.title}</h3>
                <p>{project.summary}</p>
              </div>
              <div className="project-row__tags">
                {project.tags.map((tag) => <span key={tag}>{tag}</span>)}
              </div>
              <ArrowUpRight className="project-row__arrow" size={22} aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>

      <section className="split-feature shell">
        <article className="xiaohongshu-card" id="xiaohongshu">
          <div className="xiaohongshu-card__icon">小</div>
          <div className="xiaohongshu-card__body">
            <Eyebrow>SOCIAL NOTES</Eyebrow>
            <h2>小红书上的短内容</h2>
            <p>短一些的观察、工具尝试和制作过程，会先在这里发生。</p>
            <div className="account-chip">
              <span>{siteMeta.xiaohongshu.handle}</span>
              <PlaceholderBadge />
            </div>
            <div className="xiaohongshu-posts" aria-label="小红书内容摘要">
              {xiaohongshuPosts.map((post) => (
                <div className="xiaohongshu-post" key={post.title}>
                  <div>
                    <strong>{post.title}</strong>
                    <small>{post.summary}</small>
                  </div>
                  {post.sourceUrl ? (
                    <a href={post.sourceUrl} rel="noreferrer" target="_blank" aria-label={`打开小红书原文：${post.title}`}>
                      <ArrowUpRight size={15} aria-hidden="true" />
                    </a>
                  ) : (
                    <span className="xiaohongshu-post__pending">待链接</span>
                  )}
                </div>
              ))}
            </div>
          </div>
          <span className="xiaohongshu-card__stamp" aria-hidden="true">随手记</span>
        </article>

        <article className="investing-preview">
          <div className="investing-preview__header">
            <div>
              <Eyebrow>WEEKLY PORTFOLIO</Eyebrow>
              <h2>把交易也写成复盘</h2>
            </div>
            <Sparkles size={20} aria-hidden="true" />
          </div>
          <div className="investing-preview__empty">
            <span className="mini-chart" aria-hidden="true"><i /><i /><i /><i /><i /><i /></span>
            <div>
              <strong>等待首次数据回填</strong>
              <p>首次回填与人工预览通过后，计划每周六 10:00 更新。</p>
            </div>
          </div>
          <InvestmentDisclaimer compact />
          <ArrowLink href="/investing/">打开投资复盘</ArrowLink>
        </article>
      </section>

      <section className="closing-note shell">
        <BookOpen size={22} aria-hidden="true" />
        <p>“我希望这里最终不像一份静态简历，而像一个你随时可以走进来的房间。”</p>
        <ArrowLink href="/about/">关于这个空间</ArrowLink>
      </section>
    </>
  );
}
