"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  EyeOff,
  Info,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { PublicInvestmentPanel } from "@/lib/investment";
import { toCumulativeReturnSeries } from "@/lib/investment/display";
import { InvestmentDisclaimer } from "./investment-disclaimer";
import { PlaceholderBadge } from "./ui";

const usdFormatter = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "USD",
  currencyDisplay: "code",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const POSITION_COLORS = [
  "#315842",
  "#a54b39",
  "#3f6173",
  "#b18439",
  "#70556f",
  "#39736c",
  "#746142",
  "#7b5860",
  "#516f4a",
  "#5b6178",
] as const;
const DONUT_RADIUS = 78;
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;

function formatUsd(value: number) {
  return usdFormatter.format(value);
}

function signedPercent(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatPercent(value: number | null) {
  return value === null ? "—" : signedPercent(value);
}

function chartPercent(value: number, digits: number) {
  const rounded = Number(value.toFixed(digits));
  return `${rounded > 0 ? "+" : ""}${rounded.toFixed(digits)}%`;
}

function assetTypeLabel(assetType: PublicInvestmentPanel["positions"][number]["assetType"]) {
  if (assetType === "stock-or-etf") return "股票 / ETF";
  if (assetType === "option") return "期权";
  return "其他";
}

function buildPerformanceChart(
  series: PublicInvestmentPanel["performance"]["weeklySeries"],
) {
  const width = 1000;
  const height = 300;
  const padding = { top: 18, right: 18, bottom: 34, left: 46 };
  const cumulativeSeries = toCumulativeReturnSeries(series);
  const values = cumulativeSeries.map((point) => point.cumulativeReturnPct);
  const rawMinimum = Math.min(0, ...values);
  const rawMaximum = Math.max(0, ...values);
  const rawSpan = Math.max(rawMaximum - rawMinimum, 1);
  const minimum = rawMinimum - rawSpan * 0.08;
  const maximum = rawMaximum + rawSpan * 0.08;
  const span = maximum - minimum;
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const yFor = (value: number) => padding.top + ((maximum - value) / span) * plotHeight;
  const points = cumulativeSeries.map((point, index) => ({
    ...point,
    x: padding.left + (index / Math.max(series.length - 1, 1)) * plotWidth,
    y: yFor(point.cumulativeReturnPct),
  }));
  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
  const baselineY = yFor(0);
  const areaPath = `${linePath} L ${points.at(-1)?.x ?? padding.left} ${baselineY} L ${points[0]?.x ?? padding.left} ${baselineY} Z`;
  const gridLines = Array.from({ length: 5 }, (_, index) => {
    const ratio = index / 4;
    return {
      value: maximum - span * ratio,
      y: padding.top + plotHeight * ratio,
    };
  });
  const labelIndices = [...new Set([0, Math.floor((series.length - 1) / 2), series.length - 1])];

  return {
    width,
    height,
    padding,
    points,
    linePath,
    areaPath,
    baselineY,
    gridLines,
    labelIndices,
    axisDigits: rawSpan < 8 ? 1 : 0,
  };
}

function buildPositionDonut(positions: PublicInvestmentPanel["positions"]) {
  const sorted = [...positions].sort((left, right) => right.allocationPct - left.allocationPct);
  const total = sorted.reduce((sum, position) => sum + position.allocationPct, 0);
  let cursor = 0;
  return sorted.map((position, index) => {
    const normalizedFraction = total > 0 ? position.allocationPct / total : 0;
    const startFraction = cursor;
    cursor += normalizedFraction;
    return {
      position,
      color: POSITION_COLORS[index % POSITION_COLORS.length],
      startFraction,
      normalizedFraction,
    };
  });
}

function Metric({ label, value }: { label: string; value: number | null }) {
  const direction = value === null || value === 0 ? "flat" : value < 0 ? "down" : "up";

  return (
    <div className="metric-card" data-direction={direction}>
      <span>{label}</span>
      <strong>{formatPercent(value)}</strong>
      {value === null ? <small>暂无完整数据</small> : <small>TWR</small>}
      {direction === "down" ? (
        <ArrowDownRight size={16} aria-hidden="true" />
      ) : direction === "up" ? (
        <ArrowUpRight size={16} aria-hidden="true" />
      ) : null}
    </div>
  );
}

export function InvestmentDashboard({ panel }: { panel: PublicInvestmentPanel }) {
  const [activePosition, setActivePosition] = useState<number | null>(null);
  const preview = panel.publicationStatus === "preview";
  const hasPerformanceChart = panel.performance.weeklySeries.length > 1;
  const performanceChart = buildPerformanceChart(panel.performance.weeklySeries);
  const positionSlices = buildPositionDonut(panel.positions);
  const activeSlice = activePosition === null ? null : positionSlices[activePosition];
  const pieDescription = positionSlices.length
    ? positionSlices
      .map(({ position }) => `${position.displaySymbol} ${position.allocationPct.toFixed(1)}%`)
      .join("，")
    : "当前没有可公开的证券持仓";

  return (
    <>
      {preview ? (
        <aside className="investment-preview-notice" role="status">
          <EyeOff size={20} aria-hidden="true" />
          <div>
            <strong>本地预览 · 尚未公开发布</strong>
            <p>以下是只读插件数据经过脱敏后的页面预览；完成核对与首次发布确认前，线上站点不会替换现有版本。</p>
          </div>
          <span>LOCAL PREVIEW</span>
        </aside>
      ) : null}

      <section className="metric-grid metric-grid--three" aria-label="投资表现摘要">
        <Metric label="本周收益率" value={panel.performance.weeklyReturnPct} />
        <Metric label="本月收益率" value={panel.performance.monthlyReturnPct} />
        <Metric label="本季度收益率" value={panel.performance.quarterlyReturnPct} />
      </section>

      <section className="performance-panel">
        <div className="panel-heading">
          <div>
            <span>PERFORMANCE / {panel.performance.measure.toUpperCase()}</span>
            <h2>投资历程</h2>
            <p>
              从 2026 年 4 月开始记录；图中呈现 {panel.performance.coverageStartDate} 至
              {panel.performance.coverageEndDate} 之间自记录起点以来的累计收益率，以 0% 为基线。
            </p>
          </div>
          <div className="as-of"><CalendarDays size={15} />截至 {panel.performance.coverageEndDate}</div>
        </div>

        <div className="performance-context" aria-label="收益数据口径">
          <div><span>收益口径</span><strong>{panel.performance.measure.toUpperCase()}</strong></div>
          <div><span>曲线基线</span><strong>0%</strong></div>
          <div><span>周度节点</span><strong>{panel.performance.weeklySeries.length}</strong></div>
        </div>

        <div className="performance-methodology">
          <Info size={15} aria-hidden="true" />
          <p>
            TWR（时间加权收益率）衡量整个账户组合的投资表现，并非只看当前持仓浮盈：已实现与未实现的收益或亏损都会反映在组合收益中；股息、利息等现金收益在 IBKR 纳入该指标时也会计入。入金与出金作为外部现金流被中和，成交金额本身不会被当作收益。
          </p>
        </div>

        {hasPerformanceChart ? (
          <div className="performance-chart" role="img" aria-label={`${panel.performance.coverageStartDate} 至 ${panel.performance.coverageEndDate} 自记录起点以来的账户累计收益率百分比折线图`}>
            <svg viewBox={`0 0 ${performanceChart.width} ${performanceChart.height}`}>
              <defs>
                <linearGradient id="portfolioFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#315842" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#315842" stopOpacity={0} />
                </linearGradient>
              </defs>
              {performanceChart.gridLines.map((line) => (
                <g key={line.y}>
                  <line className="performance-chart__grid" x1={performanceChart.padding.left} x2={performanceChart.width - performanceChart.padding.right} y1={line.y} y2={line.y} />
                  <text className="performance-chart__axis-label" x={performanceChart.padding.left - 8} y={line.y + 3} textAnchor="end">{chartPercent(line.value, performanceChart.axisDigits)}</text>
                </g>
              ))}
              <line className="performance-chart__baseline" x1={performanceChart.padding.left} x2={performanceChart.width - performanceChart.padding.right} y1={performanceChart.baselineY} y2={performanceChart.baselineY} />
              <path className="performance-chart__area" d={performanceChart.areaPath} />
              <path className="performance-chart__line" d={performanceChart.linePath} />
              {performanceChart.points.map((point, index) => (
                <circle className="performance-chart__point" cx={point.x} cy={point.y} data-current={index === performanceChart.points.length - 1} key={point.weekEnding} r={index === performanceChart.points.length - 1 ? 4 : 2}>
                  <title>{point.weekEnding} · 累计收益 {signedPercent(point.cumulativeReturnPct)} · 当周收益 {signedPercent(point.weeklyReturnPct)}</title>
                </circle>
              ))}
              {performanceChart.labelIndices.map((index) => {
                const point = performanceChart.points[index];
                return point ? <text className="performance-chart__date-label" key={point.weekEnding} x={point.x} y={performanceChart.height - 9} textAnchor={index === 0 ? "start" : index === performanceChart.points.length - 1 ? "end" : "middle"}>{point.weekEnding}</text> : null;
              })}
            </svg>
          </div>
        ) : (
          <div className="chart-placeholder" role="img" aria-label="收益曲线等待更多可用数据">
            <span className="chart-placeholder__axis">0%</span>
            <i /><i /><i /><i /><i />
            <strong>有两个以上周度节点后显示曲线</strong>
          </div>
        )}

        <table className="sr-only">
          <caption>自 2026 年 4 月起的账户每周收益数据</caption>
          <thead><tr><th>节点日期</th><th>本周收益率</th><th>自记录起点以来累计收益率</th></tr></thead>
          <tbody>{toCumulativeReturnSeries(panel.performance.weeklySeries).map((point) => <tr key={point.weekEnding}><td>{point.weekEnding}</td><td>{point.weeklyReturnPct}%</td><td>{point.cumulativeReturnPct}%</td></tr>)}</tbody>
        </table>
        <InvestmentDisclaimer />
      </section>

      <section className="positions-panel">
        <div className="panel-heading">
          <div>
            <span>PUBLIC POSITIONS / 公开持仓</span>
            <h2>持仓构成</h2>
            <p>仅展示公开持仓占比和标的代码；占比按证券市值的绝对值重新归一化，不展示持仓金额、数量、成本或账户净值。</p>
          </div>
          <div className="as-of"><CalendarDays size={15} />持仓截至 {panel.dataDates.positionsAsOf}</div>
        </div>

        {positionSlices.length ? (
          <div className="position-pie-layout">
            <div className="position-donut">
              <svg aria-label={`持仓占比：${pieDescription}`} role="group" viewBox="0 0 200 200">
                <circle className="position-donut__track" cx="100" cy="100" fill="none" r={DONUT_RADIUS} />
                {positionSlices.map(({ position, color, startFraction, normalizedFraction }, index) => (
                  <circle
                    aria-label={`${position.displaySymbol}，占比 ${position.allocationPct.toFixed(1)}%`}
                    className="position-donut__slice"
                    cx="100"
                    cy="100"
                    data-active={activePosition === index || undefined}
                    fill="none"
                    key={`${position.assetType}-${position.displaySymbol}-${index}`}
                    onBlur={() => setActivePosition(null)}
                    onFocus={() => setActivePosition(index)}
                    onMouseEnter={() => setActivePosition(index)}
                    onMouseLeave={() => setActivePosition(null)}
                    r={DONUT_RADIUS}
                    role="img"
                    stroke={color}
                    strokeDasharray={`${normalizedFraction * DONUT_CIRCUMFERENCE} ${DONUT_CIRCUMFERENCE}`}
                    strokeDashoffset={-startFraction * DONUT_CIRCUMFERENCE}
                    tabIndex={0}
                  >
                    <title>{position.displaySymbol} · {position.allocationPct.toFixed(1)}%</title>
                  </circle>
                ))}
              </svg>
              <div className="position-donut__center" aria-live="polite">
                <strong>{activeSlice ? activeSlice.position.displaySymbol : "公开持仓"}</strong>
                <span>{activeSlice ? `${activeSlice.position.allocationPct.toFixed(1)}%` : "持仓占比"}</span>
              </div>
            </div>
            <ol className="position-pie-legend" aria-label="持仓占比图例">
              {positionSlices.map(({ position, color }, index) => (
                <li data-active={activePosition === index || undefined} key={`${position.assetType}-${position.displaySymbol}-${index}`}>
                  <i aria-hidden="true" style={{ backgroundColor: color }}>{String(index + 1).padStart(2, "0")}</i>
                  <strong>{position.displaySymbol}</strong>
                  <span>{position.allocationPct.toFixed(1)}%</span>
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <div className="table-empty">当前只读快照中没有可公开的证券持仓。</div>
        )}

        <table className="sr-only">
          <caption>公开持仓占比</caption>
          <thead><tr><th>标的</th><th>占比</th></tr></thead>
          <tbody>{positionSlices.map(({ position }, index) => <tr key={`${position.displaySymbol}-${index}`}><td>{position.displaySymbol}</td><td>{position.allocationPct}%</td></tr>)}</tbody>
        </table>
        <div className="data-footnote"><Info size={14} /><span>公开持仓占比不代表整个账户的净资产配置；期权占比是市值占比，不代表名义敞口或最大风险。</span></div>
        <InvestmentDisclaimer compact />
      </section>

      <section className="weekly-trades-panel" aria-labelledby="weekly-trades-title">
        <div className="panel-heading">
          <div>
            <span>WEEKLY FILLS / 已成交快照</span>
            <h2 id="weekly-trades-title">本周成交订单</h2>
            <p>来自 IBKR 只读插件当前可用的已成交快照，按美东交易日、标的、资产类型与买卖方向汇总；成交金额以 USD 绝对值展示。</p>
          </div>
          <div className="as-of"><CalendarDays size={15} />{panel.dataDates.tradesFrom} — {panel.dataDates.tradesThrough}</div>
        </div>

        <div className="weekly-trades-table-wrap">
          <table className="weekly-trades-table">
            <thead><tr><th>成交日期（美东）</th><th>标的</th><th>类型</th><th>方向</th><th>成交金额（USD）</th><th>成交笔数</th></tr></thead>
            <tbody>
              {panel.weeklyTrades.length ? panel.weeklyTrades.map((trade, index) => (
                <tr key={`${trade.tradeDate}-${trade.displaySymbol}-${trade.assetType}-${trade.side}-${index}`}>
                  <td><time dateTime={trade.tradeDate}>{trade.tradeDate}</time></td>
                  <td><strong>{trade.displaySymbol}</strong><small>{panel.currency}</small></td>
                  <td>{assetTypeLabel(trade.assetType)}</td>
                  <td><span className="trade-side-chip" data-side={trade.side}>{trade.side === "buy" ? "买入" : "卖出"}</span></td>
                  <td>{formatUsd(trade.amountAbsUsd)}</td>
                  <td>{trade.fillCount} 笔</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6}>
                    <div className="weekly-trades-empty">
                      <strong>本周暂无可公开的成交记录</strong>
                      <p>没有成交时保持为空，不用演示数据填充。</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="data-footnote">
          <Info size={14} />
          <span>成交金额为绝对值；不公开订单号、成交 ID、精确时刻、佣金或已实现盈亏。</span>
        </div>
        <InvestmentDisclaimer compact />
      </section>

      <section className="weekly-section">
        <div className="weekly-section__copy">
          <span>WEEKLY REVIEW / 每周复盘</span>
          <h2>数据先预览，判断再确认</h2>
          <p>每周六 10:00 读取只读插件的可用快照，先生成本地预览；通过隐私检查并确认后，再发布数值与复盘正文。</p>
          <InvestmentDisclaimer compact />
        </div>
        <Link className="weekly-card" href="/investing/weekly/2026-w35/">
          <div><span>2026 W35</span><PlaceholderBadge /></div>
          <h3>把动作放回当时的判断里</h3>
          <p>查看周报结构演示：本周发生了什么、判断如何变化、下周观察什么。</p>
          <strong>阅读结构演示 <ArrowUpRight size={16} /></strong>
          <InvestmentDisclaimer compact />
        </Link>
      </section>
    </>
  );
}
