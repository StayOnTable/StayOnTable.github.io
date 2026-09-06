import type { Metadata } from "next";
import { ArrowUpRight, BookOpenCheck, BrainCircuit, ShieldCheck, Waypoints } from "lucide-react";
import { AskPreview } from "@/components/ask-preview";
import { PageIntro } from "@/components/ui";

export const metadata: Metadata = {
  title: "问问立正",
  description: "基于立正公开 Context 的独立问答实验：先问清目标与约束，再给出可溯源的行动建议。",
};

const contextRepository = "https://github.com/sunyuzheng/lizheng-open-context";
const lizhengProfile = "https://www.lizheng.ai/";
const workToMoneyCourse = "https://www.bilibili.com/cheese/play/ep1459702";

const principles = [
  { icon: Waypoints, title: "先澄清，再建议", body: "先确认目标、时间和约束，不用一个宽泛答案覆盖所有场景。" },
  { icon: BookOpenCheck, title: "正文自然，来源后置", body: "回答直接陈述判断，参考文章统一放在末尾，不让引用打断阅读。" },
  { icon: ShieldCheck, title: "不扮演本人", body: "只使用公开或明确授权的材料，不模仿口吻，也不建立数字分身。" },
] as const;

const evaluationExamples = [
  {
    index: "01",
    question: "我想闭门做三个月 AI 内容工具；如何先用一周验证它是不是在解决真实问题？",
    judgment: "一周验证的核心是验证“问题”，而不是验证“产品”；开发投入先控制在最小演示层。",
    evidence: [
      {
        label: "判断依据",
        text: "先从自己工作中真实存在、反复发生的问题出发，再尝试用 AI 解决；不要先追逐工具，再寻找可以套用的场景。",
      },
      {
        label: "进一步判断",
        text: "这一周需要确认痛点是否真实、是否反复出现，以及当前替代方式有多低效；得到这些信号后，再决定是否继续开发。",
      },
    ],
    next: {
      timeframe: "7 天",
      action: "围绕内容工作中最耗时的环节、目前的解决方式，以及用户愿意付出的时间或成本，进行几次结构化访谈；只有当相同痛点反复出现，再进入产品开发。",
    },
    sources: [
      {
        title: "AI时代的超级个体，最重要的不是生产力：不要用更快的速度原地打转",
        url: "https://www.superlinear.academy/c/posts/opc",
        publishedAt: "2026-03-19",
      },
      {
        title: "AI焦虑的三种形态和解决方法：从《道德经》第三章说起",
        url: "https://www.superlinear.academy/c/ai-resources/anxiety",
        publishedAt: "2026-04-21",
      },
      {
        title: "用“AI产品的六个层次”，分类AI Architect学员项目，结果如何？",
        url: "https://www.superlinear.academy/c/share-your-projects/projects-classification",
        publishedAt: "2026-04-25",
      },
    ],
  },
  {
    index: "02",
    question: "我每天都很忙，应该怎样识别自己是不是在做 fake work？",
    judgment: "识别 fake work 的核心标准，是这件事完成后，是否有人因此做出不同的决定或行动；如果它只是证明自己在工作，就很可能是 fake work。",
    evidence: [
      {
        label: "判断依据",
        text: "Fake work 往往是用可见的动作代替难以衡量的价值。一份报告若改变了下一步决策，就在创造价值；若唯一作用是证明团队在推进，就很可能只是表演式工作。",
      },
      {
        label: "适用边界",
        text: "有些工作的价值需要较长时间才会显现，短期看不到下游变化，不等于它没有价值；判断时仍要结合反馈周期和信息透明度。",
      },
    ],
    next: {
      timeframe: "7 天",
      action: "每次准备开始一项工作前，先写下：“这件事完成后，谁会因此做出不同的决定？”一周后回看；如果记录本身开始制造焦虑或表演感，就停止这种做法。",
    },
    sources: [
      {
        title: "如何识别与消灭 fake work",
        url: "https://www.superlinear.academy/c/ai-resources/fake-work",
        publishedAt: "2026-08-28",
      },
    ],
  },
] as const;

export default function AskPage() {
  return (
    <div className="shell page-shell ask-page">
      <PageIntro
        compact
        eyebrow="ASK / 问问立正"
        title="把问题说清，也把答案的来处说清"
        description="选择几个关键条件，看看一个基于公开 Context 的问答助手，会怎样理解你的问题、标注依据，并把建议变成下一步。"
        aside={<div className="coming-chip"><BrainCircuit size={18} /><span>MiniMax + Open Context</span><strong>本地版本可用</strong></div>}
      />

      <section className="ask-context" aria-labelledby="ask-context-title">
        <div className="ask-context__copy">
          <span>PROJECT BACKGROUND / 项目背景</span>
          <h2 id="ask-context-title">从一套公开 Context，重新搭建问答体验</h2>
          <p>
            <a href={lizhengProfile} rel="noreferrer" target="_blank">课代表立正</a>
            是康奈尔大学经济学博士，曾任腾讯数据科学副总监并带领 30 人 Data &amp; AI 团队，也曾在 Amazon、Meta 任职；他是 B 站知识区 UP 主，并主讲
            <a href={workToMoneyCourse} rel="noreferrer" target="_blank">《真本事：如何从会工作到会赚钱？》</a>。
          </p>
          <p>我正在基于他主动开源的 Context，把文章、精选评论、视频与核心主张整理成一个可检索、可溯源的问答入口，并保留来源、时间与内容边界。</p>
          <p>“问问立正”会以这套公开材料为知识来源，独立搭建检索、判断分层与引用流程。它不是人格模仿，也不代表立正本人回答。</p>
          <a className="ask-context__repository" href={contextRepository} rel="noreferrer" target="_blank">
            查看立正 Open Context 源仓库 <ArrowUpRight size={15} aria-hidden="true" />
          </a>
        </div>
        <ol className="ask-context__flow" aria-label="未来问答流程">
          <li><span>01</span><div><strong>问清场景</strong><p>用选择题降低开始门槛，需要时再填写“其他”。</p></div></li>
          <li><span>02</span><div><strong>检索 Context</strong><p>优先找到带原始链接和发布日期的公开材料。</p></div></li>
          <li><span>03</span><div><strong>区分判断</strong><p>把来源、综合与 AI 推断明确分开，不混成一种口吻。</p></div></li>
          <li><span>04</span><div><strong>落到下一步</strong><p>给出一个短周期内可以执行、也可以被证伪的行动。</p></div></li>
        </ol>
      </section>

      <div className="ask-layout">
        <AskPreview />
        <aside className="ask-side">
          <div className="ask-side__note"><span className="placeholder-badge">本地可用</span><p>前端已经接好窄权限问答接口。未连接后端时自动保持关闭；API Key 永远只保存在服务端。</p></div>
          {principles.map(({ icon: Icon, title, body }) => (
            <div className="principle" key={title}>
              <Icon size={19} aria-hidden="true" />
              <div><strong>{title}</strong><p>{body}</p></div>
            </div>
          ))}
        </aside>
      </div>

      <section className="ask-examples" aria-labelledby="ask-examples-title">
        <div className="ask-examples__header">
          <div><span>LIVE EVALUATION / 实测题</span><h2 id="ask-examples-title">先用真实调用验证，再留下两则代表性回答</h2></div>
          <span className="placeholder-badge">真实调用节选</span>
        </div>
        <div className="ask-examples__grid">
          {evaluationExamples.map((example) => (
            <article className="ask-example" key={example.index}>
              <div className="ask-example__meta"><span>实测 {example.index}</span><em>MiniMax-M2.7 · 2026-09-05</em></div>
              <h3>“{example.question}”</h3>
              <div className="ask-example__answer"><span>核心判断</span><p>{example.judgment}</p></div>
              {example.evidence.map((item) => (
                <div className="ask-example__answer" key={item.label}><span>{item.label}</span><p>{item.text}</p></div>
              ))}
              <div className="ask-example__answer"><span>下一步实验 · {example.next.timeframe}</span><p>{example.next.action}</p></div>
              <div className="ask-example__source">
                <strong>参考来源</strong>
                <ul>
                  {example.sources.map((source) => (
                    <li key={source.url}>
                      <a href={source.url} rel="noreferrer" target="_blank">
                        <span>{source.title}</span>
                        <small>{source.publishedAt}</small>
                        <ArrowUpRight size={12} aria-hidden="true" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
        <p className="ai-disclaimer">以下内容为 2026-09-05 使用 MiniMax-M2.7 基于立正公开 Context 的真实调用节选；为便于阅读作了压缩，核心判断与来源链接保持不变。AI 生成 · 基于公开材料的独立综合，不代表立正本人。</p>
      </section>
    </div>
  );
}
