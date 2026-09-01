import type { Metadata } from "next";
import { ArrowUpRight, Coffee, Mail, MessagesSquare, NotebookPen } from "lucide-react";
import Link from "next/link";
import { ContentNotice, PageIntro } from "@/components/ui";

export const metadata: Metadata = {
  title: "关于",
  description: "关于立正、这个个人主页，以及如何加入交流社群。",
};

export default function AboutPage() {
  return (
    <div className="shell page-shell about-page">
      <PageIntro
        eyebrow="ABOUT / 关于"
        title="你好，我是立正。"
        description="我喜欢把复杂的问题拆开，把模糊的想法做成可以测试的东西。这个主页会慢慢长成我在内容、产品和长期学习上的公开工作台。"
        aside={<div className="about-monogram" aria-hidden="true"><span>立</span><small>KEEP<br />SHOWING<br />UP</small></div>}
      />

      <ContentNotice>这段个人介绍是基于本站方向写成的初稿，待本人补充真实经历与表达后再正式发布。</ContentNotice>

      <section className="about-grid">
        <article className="about-story">
          <span className="about-section-index">01 / MY STORY</span>
          <h2>为什么做这个地方</h2>
          <p>社交平台擅长让内容被看见，却不一定适合让一段思考被长期找到。我想保留一个属于自己的入口，让不同阶段的作品可以互相解释。</p>
          <p>这里既会有完成的文章，也会有仍在调整的项目；既记录高光，也留下判断失误后怎样修改方法。</p>
          <div className="about-beliefs">
            <div><NotebookPen size={20} /><strong>写下来</strong><span>写作帮助我暴露思考里的跳步。</span></div>
            <div><Coffee size={20} /><strong>做出来</strong><span>一个小实验比十个宏大设想更诚实。</span></div>
          </div>
        </article>

        <aside className="community-card">
          <div className="community-card__top"><MessagesSquare size={20} /><span>同频交流</span></div>
          <div className="qr-placeholder" role="img" aria-label="群聊二维码待补充">
            <span>群聊二维码</span>
            <strong>待补充</strong>
          </div>
          <h2>如果你也在做东西</h2>
          <p>欢迎来聊 AI 产品、内容工作流、求职复盘，以及那些还没有标准答案的问题。</p>
          <small>正式二维码上传前，这里不会跳转到任何群聊。</small>
        </aside>
      </section>

      <section className="contact-strip">
        <div><Mail size={19} /><span>邮件</span><strong>hello@example.com</strong><em>待替换</em></div>
        <Link href="/#xiaohongshu"><span>小红书</span><strong>账号待补充</strong><ArrowUpRight size={17} /></Link>
        <a href="https://github.com/" target="_blank" rel="noreferrer"><span>GitHub</span><strong>主页待补充</strong><ArrowUpRight size={17} /></a>
      </section>
    </div>
  );
}
