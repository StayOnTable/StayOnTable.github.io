import type { Metadata } from "next";
import { BookOpenCheck, BrainCircuit, ShieldCheck, Waypoints } from "lucide-react";
import { AskPreview } from "@/components/ask-preview";
import { PageIntro, PlaceholderBadge } from "@/components/ui";

export const metadata: Metadata = {
  title: "问问立正",
  description: "课代表立正：先问清目标与约束，再给出有来源的行动建议。",
};

const principles = [
  { icon: Waypoints, title: "先澄清，再建议", body: "把模糊问题变成可以判断、可以行动的问题。" },
  { icon: BookOpenCheck, title: "回答带来源", body: "尽量区分原始材料、综合判断和仍待验证的推断。" },
  { icon: ShieldCheck, title: "不复制私人记忆", body: "只使用公开或明确授权的材料，不扮演某个人的数字分身。" },
] as const;

export default function AskPage() {
  return (
    <div className="shell page-shell ask-page">
      <PageIntro
        eyebrow="ASK / 问问立正"
        title="先把问题问对，再一起往前走"
        description="这是一个正在重做的问答助手：它不会急着输出标准答案，而会先理解你的目标、时限和不可牺牲的约束。"
        aside={<div className="coming-chip"><BrainCircuit size={18} /><span>MiniMax 云端版本</span><strong>即将开放</strong></div>}
      />

      <div className="ask-layout">
        <AskPreview />
        <aside className="ask-side">
          <div className="ask-side__note"><PlaceholderBadge /><p>这是首版交互概念。正式上线前会替换示例问题，并完成安全与引用测试。</p></div>
          {principles.map(({ icon: Icon, title, body }) => (
            <div className="principle" key={title}>
              <Icon size={19} aria-hidden="true" />
              <div><strong>{title}</strong><p>{body}</p></div>
            </div>
          ))}
        </aside>
      </div>

      <section className="answer-example">
        <div className="answer-example__header"><span>回答会长什么样？</span><small>EXAMPLE / 示例结构</small></div>
        <div className="answer-example__grid">
          <div><span>01</span><strong>我对问题的理解</strong><p>复述目标、时间和关键限制，让你先确认我们说的是同一件事。</p></div>
          <div><span>02</span><strong>证据与判断</strong><p>把引用到的公开材料，与基于它们做出的综合判断清楚分开。</p></div>
          <div><span>03</span><strong>下一步实验</strong><p>给出一个足够小、可以在短周期内验证的行动，而不是宏大的建议。</p></div>
        </div>
        <p className="ai-disclaimer">AI 生成 · 基于公开材料的独立综合，不代表立正本人。</p>
      </section>
    </div>
  );
}
