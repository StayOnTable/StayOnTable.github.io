"use client";

import { ArrowDownRight, ArrowUpRight, CalendarDays, CircleDollarSign, Info } from "lucide-react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PublicInvestmentPanel } from "@/lib/investment";
import { InvestmentDisclaimer } from "./investment-disclaimer";
import { PlaceholderBadge } from "./ui";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const optionFillPrice = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function signedPercent(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function Metric({ label, value, sample }: { label: string; value: string; sample: boolean }) {
  const direction = value.startsWith("-") ? "down" : "up";
  return (
    <div className="metric-card" data-sample={sample}>
      <span>{label}</span>
      <strong>{sample ? "待回填" : value}</strong>
      {!sample ? direction === "down" ? <ArrowDownRight size={16} /> : <ArrowUpRight size={16} /> : null}
    </div>
  );
}

export function InvestmentDashboard({ panel }: { panel: PublicInvestmentPanel }) {
  const sample =
    panel.grossSecuritiesMarketValueUsd === 0 &&
    panel.positions.length === 0 &&
    panel.weeklyOptionTrades.length === 0 &&
    panel.performance.weeklySeries.length === 1 &&
    panel.performance.weeklySeries[0]?.portfolioIndex === 100;
  const hasLiveChart = !sample && panel.performance.weeklySeries.length > 1;

  return (
    <>
      {sample ? (
        <aside className="investment-empty-notice">
          <CircleDollarSign size={20} aria-hidden="true" />
          <div>
            <strong>等待首次 IBKR 数据回填</strong>
            <p>当前页面只展示信息结构，没有使用或虚构任何真实账户数据。首次历史回填会在人工预览后公开。</p>
          </div>
          <PlaceholderBadge />
        </aside>
      ) : null}

      <section className="metric-grid" aria-label="投资表现摘要">
        <Metric label="本周收益率" value={signedPercent(panel.performance.weeklyReturnPct)} sample={sample} />
        <Metric label="今年以来" value={signedPercent(panel.performance.ytdReturnPct)} sample={sample} />
        <Metric label="开户以来" value={signedPercent(panel.performance.sinceInceptionReturnPct)} sample={sample} />
        <Metric label="最大回撤" value={signedPercent(panel.performance.maxDrawdownPct)} sample={sample} />
      </section>

      <section className="performance-panel">
        <div className="panel-heading">
          <div>
            <span>PERFORMANCE / TWR</span>
            <h2>账户累计表现</h2>
            <p>2025年4月以来，以100为起点的时间加权收益指数；不公开美元盈亏或账户净资产。</p>
          </div>
          <div className="as-of"><CalendarDays size={15} />{sample ? "等待数据" : `截至 ${panel.asOfDate}`}</div>
        </div>

        {hasLiveChart ? (
          <div className="performance-chart" role="img" aria-label="账户累计收益指数折线图">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={panel.performance.weeklySeries} margin={{ top: 14, right: 8, left: -18, bottom: 0 }} accessibilityLayer>
                <defs>
                  <linearGradient id="portfolioFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#315842" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#315842" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(29,36,31,.12)" strokeDasharray="3 5" vertical={false} />
                <XAxis dataKey="weekEnding" tick={{ fontSize: 10, fill: "#73786f" }} axisLine={false} tickLine={false} minTickGap={28} />
                <YAxis tick={{ fontSize: 10, fill: "#73786f" }} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
                <ReferenceLine y={100} stroke="#a54b39" strokeDasharray="4 4" />
                <Tooltip
                  formatter={(value) => [Number(value).toFixed(2), "组合指数"]}
                  labelFormatter={(label) => `周末 ${label}`}
                  contentStyle={{ background: "#fffdf7", border: "1px solid rgba(29,36,31,.2)", borderRadius: 3, fontSize: 11 }}
                />
                <Area type="monotone" dataKey="portfolioIndex" stroke="#315842" strokeWidth={2.5} fill="url(#portfolioFill)" activeDot={{ r: 4, fill: "#a54b39" }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="chart-placeholder" role="img" aria-label="收益曲线等待真实数据">
            <span className="chart-placeholder__axis">100</span>
            <i /><i /><i /><i /><i />
            <strong>收益曲线将在首次回填后出现</strong>
          </div>
        )}

        {!sample ? (
          <table className="sr-only">
            <caption>账户每周时间加权收益数据</caption>
            <thead><tr><th>周末</th><th>本周收益率</th><th>组合指数</th></tr></thead>
            <tbody>{panel.performance.weeklySeries.map((point) => <tr key={point.weekEnding}><td>{point.weekEnding}</td><td>{point.weeklyReturnPct}</td><td>{point.portfolioIndex}</td></tr>)}</tbody>
          </table>
        ) : null}
        <InvestmentDisclaimer />
      </section>

      <section className="positions-panel">
        <div className="panel-heading">
          <div>
            <span>PUBLIC POSITIONS / 公开持仓</span>
            <h2>持仓构成</h2>
            <p>占比只按公开证券的绝对市值重新归一化，不使用账户净资产。</p>
          </div>
          <div className="gross-value"><span>公开证券毛市值</span><strong>{sample ? "待回填" : usd.format(panel.grossSecuritiesMarketValueUsd)}</strong><small>不是账户净资产</small></div>
        </div>

        {panel.positions.length ? (
          <div className="positions-table-wrap">
            <table className="positions-table">
              <thead><tr><th>标的</th><th>类型 / 方向</th><th>绝对市值</th><th>公开占比</th></tr></thead>
              <tbody>
                {panel.positions.map((position) => (
                  <tr key={`${position.assetType}-${position.displaySymbol}`}>
                    <td><strong>{position.displaySymbol}</strong>{position.option ? <small>{position.option.expiration} · {position.option.strike} · {position.option.right.toUpperCase()} · {position.option.openContracts} 张</small> : null}</td>
                    <td><span className="direction-chip" data-direction={position.direction}>{position.assetType.toUpperCase()} · {position.direction === "long" ? "多头" : "空头"}</span></td>
                    <td>{usd.format(position.marketValueAbsUsd)}</td>
                    <td><div className="allocation"><i style={{ width: `${position.allocationPct}%` }} /><span>{position.allocationPct.toFixed(1)}%</span></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="table-empty">暂无公开持仓数据。股票数量、成本价、现金与融资信息不会在这里出现。</div>
        )}
        <div className="data-footnote"><Info size={14} /><span>期权市值不等于名义敞口或最大风险。</span></div>
        <InvestmentDisclaimer compact />
      </section>

      <section className="option-trades-panel" aria-labelledby="weekly-option-trades-title">
        <div className="panel-heading">
          <div>
            <span>WEEKLY OPTION TRADES / 期权成交</span>
            <h2 id="weekly-option-trades-title">本周期权操作</h2>
            <p>只展示按完整合约与买卖方向汇总后的周度成交，不公开逐笔时刻或内部流水标识。</p>
          </div>
          <div className="as-of"><CalendarDays size={15} />{sample ? "等待数据" : `截至 ${panel.asOfDate}`}</div>
        </div>

        {panel.weeklyOptionTrades.length ? (
          <div className="option-trades-table-wrap">
            <table className="option-trades-table">
              <thead>
                <tr><th>合约</th><th>方向</th><th>合约数</th><th>加权成交均价</th></tr>
              </thead>
              <tbody>
                {panel.weeklyOptionTrades.map((trade) => (
                  <tr key={`${trade.weekEnding}-${trade.underlying}-${trade.expiration}-${trade.strike}-${trade.right}-${trade.side}`}>
                    <td>
                      <strong>{trade.underlying}</strong>
                      <small>{trade.expiration} · {trade.strike} · {trade.right.toUpperCase()}</small>
                    </td>
                    <td><span className="trade-side-chip" data-side={trade.side}>{trade.side === "buy" ? "买入" : "卖出"}</span></td>
                    <td>{trade.contracts} 张</td>
                    <td>{optionFillPrice.format(trade.averageFillPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="option-trades-empty">
            <strong>{sample ? "等待首次期权成交回填" : "本周暂无公开期权成交"}</strong>
            <p>这里不会用逐笔记录填充空白；没有通过当周数据校验时，保持为空。</p>
          </div>
        )}

        <div className="data-footnote">
          <Info size={14} />
          <span>成交按周、合约与买卖方向聚合，均价按合约数加权；订单号、成交 ID 和逐笔时刻不公开。</span>
        </div>
        <InvestmentDisclaimer compact />
      </section>

      <section className="weekly-section">
        <div className="weekly-section__copy">
          <span>WEEKLY REVIEW / 每周复盘</span>
          <h2>数字自动更新，判断由本人确认</h2>
          <p>正式启用后，每周六 10:00 尝试更新数据；只有日终数据完整且通过隐私检查时才发布。交易与公开新闻会先生成草稿，正文经本人确认后上线。</p>
          <InvestmentDisclaimer compact />
        </div>
        <Link className="weekly-card" href="/investing/weekly/2026-w35/">
          <div><span>2026 W35</span><PlaceholderBadge /></div>
          <h3>本周没有真实数据，先把复盘框架搭好</h3>
          <p>查看周报的演示结构：本周发生了什么、判断如何变化、下周观察什么。</p>
          <strong>阅读结构演示 <ArrowUpRight size={16} /></strong>
          <InvestmentDisclaimer compact />
        </Link>
      </section>
    </>
  );
}
