import type { CSSProperties } from "react";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { InvestmentDisclaimer } from "@/components/investment-disclaimer";
import { countJourneyInterviewReviews, journeyEntries } from "@/content/journey";
import investmentJson from "@/content/investment-public.json";
import { projects } from "@/content/site";
import { PublicInvestmentPanelSchema } from "@/lib/investment";
import { toCumulativeReturnSeries } from "@/lib/investment/display";

const investmentPanel = PublicInvestmentPanelSchema.parse(investmentJson);

type JourneyChartLane = "pass" | "waiting" | "no-hc" | "fail" | "origin";

type JourneyChartPoint = {
  companyColor: string;
  lane: JourneyChartLane;
  x: number;
  y: number;
};

type JourneyPointVariables = CSSProperties & {
  "--point-color": string;
  "--point-x": string;
  "--point-y": string;
};

const JOURNEY_LANE_Y: Record<JourneyChartLane, number> = {
  pass: 16,
  waiting: 45,
  "no-hc": 65,
  fail: 82,
  origin: 45,
};

const JOURNEY_COMPANY_COLORS = [
  "#315842",
  "#a54b39",
  "#3f6173",
  "#8d682f",
  "#70556f",
  "#39736c",
  "#525f7b",
  "#9a5540",
  "#5c7451",
] as const;

function normalizeCompany(company: string): string {
  return company.trim().toLocaleLowerCase("zh-CN");
}

function journeyChartLane(entry: (typeof journeyEntries)[number]): JourneyChartLane {
  const status = entry.interviewStatus.trim().toLocaleLowerCase("en-US");
  if (status === "pass") return "pass";
  if (entry.tags.some((tag) => tag.trim().toLocaleUpperCase("en-US") === "HC")) return "no-hc";
  if (status === "fail") return "fail";
  if (status === "waiting" || status === "hold") return "waiting";
  return "origin";
}

function buildJourneyChartPoints(
  entries: readonly (typeof journeyEntries)[number][],
): JourneyChartPoint[] {
  const companyColors = new Map<string, string>();

  return entries.map((entry, index) => {
    const company = normalizeCompany(entry.company);
    if (!companyColors.has(company)) {
      companyColors.set(
        company,
        JOURNEY_COMPANY_COLORS[companyColors.size % JOURNEY_COMPANY_COLORS.length],
      );
    }

    const lane = journeyChartLane(entry);
    const x = entries.length < 2 ? 50 : 5 + (index / (entries.length - 1)) * 90;

    return {
      companyColor: companyColors.get(company) ?? JOURNEY_COMPANY_COLORS[0],
      lane,
      x,
      y: JOURNEY_LANE_Y[lane],
    };
  });
}

function buildJourneyChartPath(points: readonly JourneyChartPoint[]): string | null {
  if (points.length < 2) return null;

  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
}

function buildSparklinePath(values: number[]): string | null {
  if (values.length < 2) return null;

  const width = 260;
  const height = 68;
  const padding = 5;
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const span = Math.max(maximum - minimum, 0.0001);

  return values
    .map((value, index) => {
      const x = padding + (index / (values.length - 1)) * (width - padding * 2);
      const y = height - padding - ((value - minimum) / span) * (height - padding * 2);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function formatPreviewPercent(value: number | null) {
  if (value === null) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export function HomeWorkbenchPreview() {
  const sortedJourneyEntries = [...journeyEntries].sort(
    (left, right) => left.eventDate.localeCompare(right.eventDate),
  );
  const interviewReviewCount = countJourneyInterviewReviews(sortedJourneyEntries);
  const latestJourneyEntry = sortedJourneyEntries.at(-1);
  const journeyChartPoints = buildJourneyChartPoints(sortedJourneyEntries);
  const journeyChartPath = buildJourneyChartPath(journeyChartPoints);
  const cumulativeInvestmentSeries = toCumulativeReturnSeries(
    investmentPanel.performance.weeklySeries,
  );
  const investmentPath = buildSparklinePath(
    cumulativeInvestmentSeries.map((point) => point.cumulativeReturnPct),
  );
  const latestCumulativeInvestmentReturn =
    cumulativeInvestmentSeries.at(-1)?.cumulativeReturnPct ?? null;
  const investmentIsPreview = investmentPanel.publicationStatus === "preview";

  return (
    <aside className="workbench-showcase" aria-label="工作台内容概览">
      <header className="workbench-showcase__header">
        <div>
          <span>WORKBENCH</span>
          <strong>工作台概览</strong>
        </div>
        <small>点击进入各个区域</small>
      </header>

      <div className="workbench-showcase__grid">
        <Link
          aria-label={`求职旅程：${interviewReviewCount} 次面试复盘。最近一条是${latestJourneyEntry ? `${latestJourneyEntry.company}，${latestJourneyEntry.interviewStatus}` : "等待首个节点"}。折线高度依次表示通过、等待、无 HC 和未通过。点击进入求职旅程。`}
          className="workbench-tile workbench-tile--journey"
          href="/journey/"
        >
          <div className="workbench-tile__topline">
            <span>JOURNEY / 求职旅程</span>
            <ArrowUpRight size={15} aria-hidden="true" />
          </div>
          <div className="workbench-journey__summary">
            <strong>{interviewReviewCount} 次面试复盘</strong>
            <span>{latestJourneyEntry ? `最近 · ${latestJourneyEntry.company} · ${latestJourneyEntry.interviewStatus}` : "等待首个节点"}</span>
          </div>
          <div className="workbench-journey__chart" aria-hidden="true">
            <svg preserveAspectRatio="none" viewBox="0 0 100 100">
              <path className="workbench-journey__guide" d="M 5 45 H 95" />
              {journeyChartPath ? (
                <path className="workbench-journey__path" d={journeyChartPath} />
              ) : null}
            </svg>
            {journeyChartPoints.map((point, index) => (
              <i
                className={`workbench-journey__point${index === journeyChartPoints.length - 1 ? " is-current" : ""}`}
                data-lane={point.lane}
                key={sortedJourneyEntries[index].slug}
                style={{
                  "--point-color": point.companyColor,
                  "--point-x": `${point.x}%`,
                  "--point-y": `${point.y}%`,
                } as JourneyPointVariables}
              />
            ))}
          </div>
          <div className="workbench-journey__legend" aria-hidden="true">
            <span>↑ PASS</span>
            <span>— WAITING</span>
            <span>↘ 无 HC</span>
            <span>↓ FAIL</span>
          </div>
        </Link>

        <Link className="workbench-tile workbench-tile--projects" href="/projects/">
          <div className="workbench-tile__topline">
            <span>PROJECTS <b>/ 03</b></span>
            <ArrowUpRight size={15} aria-hidden="true" />
          </div>
          <div className="workbench-project-list">
            {projects.slice(0, 2).map((project, index) => (
              <div key={project.slug}>
                <span>0{index + 1}</span>
                <p><strong>{project.slug === "motion-workflow" ? "视频动效工作流" : project.title}</strong><small>{project.placeholder ? "预告" : "公开"} · {project.stage}</small></p>
              </div>
            ))}
          </div>
          <div className="workbench-workflow" aria-hidden="true">
            <span /><span /><span /><i />
          </div>
        </Link>

        <Link className="workbench-tile workbench-tile--library" href="/library/">
          <div className="workbench-tile__topline">
            <span>LIBRARY <b>/ 每日输入</b></span>
            <ArrowUpRight size={15} aria-hidden="true" />
          </div>
          <div className="workbench-library__cards" aria-hidden="true">
            <i /><i /><i />
          </div>
          <strong className="workbench-library__title">文章 · 视频 · 播客</strong>
          <small className="workbench-library__status">卡片式示例结构</small>
        </Link>

        <Link
          aria-label={`投资复盘：本周收益率 ${formatPreviewPercent(investmentPanel.performance.weeklyReturnPct)}，本月收益率 ${formatPreviewPercent(investmentPanel.performance.monthlyReturnPct)}，本季度收益率 ${formatPreviewPercent(investmentPanel.performance.quarterlyReturnPct)}，数据截至 ${investmentPanel.asOfDate}${investmentIsPreview ? "。这是本地预览，尚未公开发布" : ""}。点击进入投资复盘。`}
          className="workbench-tile workbench-tile--investing"
          href="/investing/"
        >
          <div className="workbench-investing__copy">
            <div className="workbench-tile__topline">
              <span>INVESTING / 投资复盘</span>
              <ArrowUpRight size={15} aria-hidden="true" />
            </div>
            {investmentIsPreview ? <em className="workbench-investing__preview">本地预览 · 尚未公开发布</em> : null}
            <div className="workbench-investing__metrics">
              <span><small>本周</small><strong>{formatPreviewPercent(investmentPanel.performance.weeklyReturnPct)}</strong></span>
              <span><small>本月</small><strong>{formatPreviewPercent(investmentPanel.performance.monthlyReturnPct)}</strong></span>
              <span><small>本季度</small><strong>{formatPreviewPercent(investmentPanel.performance.quarterlyReturnPct)}</strong></span>
            </div>
            <small>{investmentPanel.performance.coverageStartDate} — {investmentPanel.performance.coverageEndDate}</small>
            <InvestmentDisclaimer compact />
          </div>
          <div className="workbench-investing__chart" data-empty={investmentPath ? "false" : "true"} aria-hidden="true">
            <span>累计 {investmentPanel.performance.measure.toUpperCase()} · {formatPreviewPercent(latestCumulativeInvestmentReturn)}</span>
            <svg viewBox="0 0 260 68" preserveAspectRatio="none">
              <path className="workbench-chart__grid" d="M 4 17 H 256 M 4 34 H 256 M 4 51 H 256" />
              {investmentPath ? (
                <path className="workbench-chart__line" d={investmentPath} />
              ) : (
                <path className="workbench-chart__empty" d="M 6 47 H 254" />
              )}
            </svg>
          </div>
        </Link>
      </div>
    </aside>
  );
}
