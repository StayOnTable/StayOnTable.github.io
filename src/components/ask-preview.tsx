"use client";

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  ExternalLink,
  LoaderCircle,
  LockKeyhole,
  MessageSquareText,
  RotateCcw,
  Send,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";

type Question = {
  key: string;
  number: string;
  label: string;
  options: readonly string[];
};

type AskAnswer = {
  judgment: string;
  reasoning: Array<{
    kind: "direct_source" | "current_thesis" | "synthesis" | "inference";
    text: string;
    sourceIds: string[];
  }>;
  nextExperiment: {
    action: string;
    timeframe: string;
    continueIf: string;
    adjustIf: string;
    stopIf: string;
  };
  recommendedSourceIds: string[];
  boundary: string;
};

type AskResult = {
  answer: AskAnswer;
  sources: Array<{
    id: string;
    title: string;
    section: string;
    sourceType: string;
    url: string;
    publishedAt: string;
  }>;
  meta: { model: string; sourceCount: number };
  disclaimer: string;
};

type ConversationTurn = {
  question: string;
  result: AskResult;
};

const OTHER_OPTION = "其他";
const ASK_API_URL = process.env.NEXT_PUBLIC_ASK_API_URL?.trim() ?? "";
const basicQuestions: readonly Question[] = [
  {
    key: "problem",
    number: "01",
    label: "你现在最想解决哪类问题？",
    options: ["求职与职业选择", "做一个 AI 产品", "内容与个人品牌", "学习与长期成长", OTHER_OPTION],
  },
  {
    key: "outcome",
    number: "02",
    label: "你希望先得到什么结果？",
    options: ["今天先理清判断", "一周内跑完一次验证", "一个月内做出可展示成果", "先获得可追溯资料", OTHER_OPTION],
  },
  {
    key: "constraint",
    number: "03",
    label: "哪项约束最不能被牺牲？",
    options: ["不影响主业", "收入与现金流", "健康与精力", "长期积累", OTHER_OPTION],
  },
] as const;

const scenarioOptions: Record<string, readonly string[]> = {
  "求职与职业选择": ["岗位方向", "面试准备", "Offer 取舍", "职业阶段选择", OTHER_OPTION],
  "做一个 AI 产品": ["目标用户", "核心场景", "最小验证", "成功标准", OTHER_OPTION],
  "内容与个人品牌": ["选题定位", "内容形式", "更新节奏", "与产品联动", OTHER_OPTION],
  "学习与长期成长": ["学习路径", "实践项目", "时间安排", "复盘方式", OTHER_OPTION],
};

const fallbackScenarioOptions = ["判断标准", "已有尝试", "当前阻碍", "可用资源", OTHER_OPTION] as const;

function isAnswered(question: Question, answers: Record<string, string>, otherAnswers: Record<string, string>) {
  const answer = answers[question.key];
  return Boolean(answer && (answer !== OTHER_OPTION || otherAnswers[question.key]?.trim()));
}

function resolvedAnswer(key: string, answers: Record<string, string>, otherAnswers: Record<string, string>) {
  return (answers[key] === OTHER_OPTION ? otherAnswers[key]?.trim() : answers[key]) ?? "";
}

function conversationHistory(turns: ConversationTurn[]) {
  return turns.slice(-3).flatMap((turn) => [
    { role: "user" as const, content: turn.question },
    {
      role: "assistant" as const,
      content: [
        turn.result.answer.judgment,
        ...turn.result.answer.reasoning.map((item) => item.text),
        `下一步：${turn.result.answer.nextExperiment.action}`,
      ].join("\n"),
    },
  ]);
}

function ChoiceQuestion({
  question,
  answers,
  otherAnswers,
  onChoose,
  onOtherChange,
}: {
  question: Question;
  answers: Record<string, string>;
  otherAnswers: Record<string, string>;
  onChoose: (key: string, value: string) => void;
  onOtherChange: (key: string, value: string) => void;
}) {
  const selected = answers[question.key];

  return (
    <fieldset className="ask-question">
      <legend><i>{question.number}</i><span>{question.label}</span></legend>
      <div className="ask-options">
        {question.options.map((option) => (
          <label className="ask-option" data-selected={selected === option} key={option}>
            <input
              checked={selected === option}
              name={question.key}
              onChange={() => onChoose(question.key, option)}
              type="radio"
              value={option}
            />
            <span>{option}</span>
            {selected === option ? <Check size={14} aria-hidden="true" /> : null}
          </label>
        ))}
      </div>
      {selected === OTHER_OPTION ? (
        <label className="ask-other">
          <span>补充你的情况</span>
          <input
            autoFocus
            maxLength={120}
            onChange={(event) => onOtherChange(question.key, event.target.value)}
            placeholder="用一句话写下你的选项"
            type="text"
            value={otherAnswers[question.key] ?? ""}
          />
        </label>
      ) : null}
    </fieldset>
  );
}

function AnswerCard({ turn, index }: { turn: ConversationTurn; index: number }) {
  const { answer, sources, disclaimer } = turn.result;
  return (
    <article className="ask-answer">
      <div className="ask-answer__question"><span>Q{String(index + 1).padStart(2, "0")}</span><p>{turn.question}</p></div>
      <div className="ask-answer__judgment"><span>核心判断</span><p>{answer.judgment}</p></div>

      {answer.reasoning.length > 0 ? (
        <div className="ask-answer__reasoning">
          <strong>判断与分析</strong>
          {answer.reasoning.map((item, itemIndex) => (
            <p data-kind={item.kind} key={`${item.kind}-${itemIndex}`}>{item.text}</p>
          ))}
        </div>
      ) : null}

      <div className="ask-answer__experiment">
        <div><span>下一步实验</span><em>{answer.nextExperiment.timeframe}</em></div>
        <p>{answer.nextExperiment.action}</p>
        <dl>
          <div><dt>继续</dt><dd>{answer.nextExperiment.continueIf}</dd></div>
          <div><dt>调整</dt><dd>{answer.nextExperiment.adjustIf}</dd></div>
          <div><dt>停止</dt><dd>{answer.nextExperiment.stopIf}</dd></div>
        </dl>
      </div>

      {answer.boundary && answer.boundary !== "无" ? (
        <div className="ask-answer__boundary"><strong>边界</strong><p>{answer.boundary}</p></div>
      ) : null}

      {sources.length > 0 ? (
        <div className="ask-answer__sources">
          <strong>参考来源</strong>
          <ol>
            {sources.map((source, sourceIndex) => (
              <li key={source.id}>
                <a href={source.url} rel="noreferrer" target="_blank">
                  <span>{String(sourceIndex + 1).padStart(2, "0")}</span>
                  <div>
                    <b>{source.title}</b>
                    {source.section || source.publishedAt ? (
                      <small>{[source.section, source.publishedAt].filter(Boolean).join(" · ")}</small>
                    ) : null}
                  </div>
                  <ExternalLink size={13} aria-hidden="true" />
                </a>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
      <p className="ask-answer__disclaimer">{disclaimer}</p>
    </article>
  );
}

export function AskPreview() {
  const [stage, setStage] = useState<"basics" | "scenario" | "brief" | "answer">("basics");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [otherAnswers, setOtherAnswers] = useState<Record<string, string>>({});
  const [question, setQuestion] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const scenarioQuestion = useMemo<Question>(() => ({
    key: "scenario",
    number: "04",
    label: "在这个场景里，你现在最卡在哪一步？",
    options: scenarioOptions[answers.problem] ?? fallbackScenarioOptions,
  }), [answers.problem]);

  const basicsComplete = basicQuestions.every((item) => isAnswered(item, answers, otherAnswers));
  const scenarioComplete = isAnswered(scenarioQuestion, answers, otherAnswers);

  function choose(key: string, value: string) {
    setAnswers((current) => {
      const next = { ...current, [key]: value };
      if (key === "problem") delete next.scenario;
      return next;
    });
    if (key === "problem") {
      setOtherAnswers((current) => {
        const next = { ...current };
        delete next.scenario;
        return next;
      });
    }
  }

  function reset() {
    setAnswers({});
    setOtherAnswers({});
    setQuestion("");
    setFollowUp("");
    setTurns([]);
    setError("");
    setStage("basics");
  }

  async function ask(nextQuestion: string) {
    if (!ASK_API_URL) {
      setError("问答服务尚未连接。请先启动本地 Ask 服务。");
      return;
    }
    const normalizedQuestion = nextQuestion.trim() || "请根据我的选择，帮我形成判断和一个可以验证的下一步。";
    setLoading(true);
    setError("");
    try {
      const response = await fetch(ASK_API_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          problem: resolvedAnswer("problem", answers, otherAnswers),
          outcome: resolvedAnswer("outcome", answers, otherAnswers),
          constraint: resolvedAnswer("constraint", answers, otherAnswers),
          scenario: resolvedAnswer("scenario", answers, otherAnswers),
          question: normalizedQuestion,
          history: conversationHistory(turns),
        }),
      });
      const payload = await response.json() as AskResult | { error?: string };
      if (!response.ok || !("answer" in payload)) {
        throw new Error("error" in payload && payload.error ? payload.error : "问答暂时不可用");
      }
      setTurns((current) => [...current, { question: normalizedQuestion, result: payload }]);
      setQuestion("");
      setFollowUp("");
      setStage("answer");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "问答暂时不可用");
    } finally {
      setLoading(false);
    }
  }

  const progressStage = stage === "basics" ? "基础问题" : stage === "scenario" ? "场景追问" : stage === "brief" ? "提问简报" : "来源回答";

  return (
    <div className="ask-demo">
      <div className="ask-demo__header">
        <div className="assistant-avatar"><Sparkles size={19} aria-hidden="true" /></div>
        <div><strong>问问立正</strong><span><i data-ready={Boolean(ASK_API_URL)} /> {ASK_API_URL ? "问答通道已配置" : "等待本地问答服务"}</span></div>
        <LockKeyhole size={17} aria-label="会话不保存，密钥只在服务端" />
      </div>

      <div className="ask-demo__progress" aria-label={`当前步骤：${progressStage}`}>
        <span data-active={stage === "basics"}>1 · 选择问题</span>
        <i aria-hidden="true" />
        <span data-active={stage === "scenario"}>2 · 场景追问</span>
        <i aria-hidden="true" />
        <span data-active={stage === "brief" || stage === "answer"}>3 · 检索回答</span>
      </div>

      {stage === "basics" ? (
        <form className="ask-form" onSubmit={(event) => { event.preventDefault(); if (basicsComplete) setStage("scenario"); }}>
          <div className="ask-demo__intro">
            <MessageSquareText size={20} aria-hidden="true" />
            <p>不必先写一大段背景。选完三个关键问题后，我会根据你的场景再追问一次。</p>
          </div>
          {basicQuestions.map((item) => (
            <ChoiceQuestion
              answers={answers}
              key={item.key}
              onChoose={choose}
              onOtherChange={(key, value) => setOtherAnswers((current) => ({ ...current, [key]: value }))}
              otherAnswers={otherAnswers}
              question={item}
            />
          ))}
          <button className="button button--primary" disabled={!basicsComplete} type="submit">
            继续到场景追问 <ArrowRight size={17} />
          </button>
          <p>选择暂存在当前浏览器页面，不建立长期画像。</p>
        </form>
      ) : null}

      {stage === "scenario" ? (
        <form className="ask-form ask-form--scenario" onSubmit={(event) => { event.preventDefault(); if (scenarioComplete) setStage("brief"); }}>
          <button className="ask-back" onClick={() => setStage("basics")} type="button"><ArrowLeft size={15} /> 返回修改前三题</button>
          <div className="ask-demo__intro">
            <MessageSquareText size={20} aria-hidden="true" />
            <p>你选择了“{resolvedAnswer("problem", answers, otherAnswers)}”。再补一个场景信息，就能组成一份更具体的问题。</p>
          </div>
          <ChoiceQuestion
            answers={answers}
            onChoose={choose}
            onOtherChange={(key, value) => setOtherAnswers((current) => ({ ...current, [key]: value }))}
            otherAnswers={otherAnswers}
            question={scenarioQuestion}
          />
          <button className="button button--primary" disabled={!scenarioComplete} type="submit">
            生成提问简报 <ArrowRight size={17} />
          </button>
          <p>提交后只检索公开 Context；问答不会写入数据库。</p>
        </form>
      ) : null}

      {stage === "brief" ? (
        <form className="ask-brief" onSubmit={(event) => { event.preventDefault(); void ask(question); }}>
          <div className="ask-brief__heading"><span><Check size={16} /> 提问简报已组成</span><button onClick={reset} type="button"><RotateCcw size={14} /> 重新选择</button></div>
          <dl>
            <div><dt>问题</dt><dd>{resolvedAnswer("problem", answers, otherAnswers)}</dd></div>
            <div><dt>期望</dt><dd>{resolvedAnswer("outcome", answers, otherAnswers)}</dd></div>
            <div><dt>约束</dt><dd>{resolvedAnswer("constraint", answers, otherAnswers)}</dd></div>
            <div><dt>卡点</dt><dd>{resolvedAnswer("scenario", answers, otherAnswers)}</dd></div>
          </dl>
          <label className="ask-detail">
            <span>再补充一句具体问题 <em>可选，但会让回答更贴近你</em></span>
            <textarea
              maxLength={800}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="例如：大厂更稳，但 AI startup 承诺更大的 scope；我应该追问哪些事实？"
              rows={4}
              value={question}
            />
          </label>
          {error ? <p className="ask-error" role="alert"><AlertCircle size={14} />{error}</p> : null}
          <button className="button button--primary" disabled={!ASK_API_URL || loading} type="submit">
            {loading ? <><LoaderCircle className="ask-spin" size={17} /> 正在检索公开材料</> : <><Sparkles size={17} /> 生成有来源的回答</>}
          </button>
          <p>{ASK_API_URL ? "问题会发送到本地服务；会话不保存。" : "本地 Ask 服务启动后即可试用。"}</p>
        </form>
      ) : null}

      {stage === "answer" ? (
        <div className="ask-conversation">
          <div className="ask-conversation__toolbar"><span><Check size={15} /> 回答已生成</span><button onClick={reset} type="button"><RotateCcw size={14} /> 新问题</button></div>
          <div className="ask-conversation__turns" aria-live="polite">
            {turns.map((turn, index) => <AnswerCard index={index} key={`${turn.question}-${index}`} turn={turn} />)}
          </div>
          <form className="ask-follow-up" onSubmit={(event) => { event.preventDefault(); if (followUp.trim()) void ask(followUp); }}>
            <label htmlFor="ask-follow-up">继续追问</label>
            <div>
              <input
                disabled={loading}
                id="ask-follow-up"
                maxLength={800}
                onChange={(event) => setFollowUp(event.target.value)}
                placeholder="针对刚才的判断，再问一个具体问题"
                value={followUp}
              />
              <button aria-label="发送追问" disabled={loading || !followUp.trim()} type="submit">
                {loading ? <LoaderCircle className="ask-spin" size={17} /> : <Send size={17} />}
              </button>
            </div>
          </form>
          {error ? <p className="ask-error" role="alert"><AlertCircle size={14} />{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
