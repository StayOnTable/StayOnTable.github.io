import { ArrowRight, LockKeyhole, MessageSquareText, Sparkles } from "lucide-react";

const questions = [
  { number: "01", label: "你现在真正想解决的问题是什么？", placeholder: "例如：我正在判断要不要做一个新的 AI 产品……" },
  { number: "02", label: "你希望得到什么结果，截止时间是什么？", placeholder: "例如：两周内完成一次可以验证需求的测试……" },
  { number: "03", label: "哪些约束是你不愿意牺牲的？", placeholder: "例如：不影响主业；预算在 1,000 元以内……" },
] as const;

export function AskPreview() {
  return (
    <div className="ask-demo">
      <div className="ask-demo__header">
        <div className="assistant-avatar"><Sparkles size={19} aria-hidden="true" /></div>
        <div><strong>课代表立正</strong><span><i /> 概念预览 · 尚未接入模型</span></div>
        <LockKeyhole size={17} aria-label="会话内处理" />
      </div>
      <div className="ask-demo__intro">
        <MessageSquareText size={20} aria-hidden="true" />
        <p>我不会立刻给答案。先用三个问题把目标、时间和约束说清，再根据你的场景补问一次。</p>
      </div>
      <form className="ask-form">
        {questions.map((question) => (
          <label key={question.number}>
            <span><i>{question.number}</i>{question.label}</span>
            <textarea placeholder={question.placeholder} disabled rows={2} />
          </label>
        ))}
        <button className="button button--primary" type="button" disabled>
          继续到场景追问 <ArrowRight size={17} />
        </button>
        <p>当前仅展示流程，不会提交或保存任何内容。</p>
      </form>
    </div>
  );
}
