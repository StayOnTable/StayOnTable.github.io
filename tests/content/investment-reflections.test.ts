import assert from "node:assert/strict";
import test from "node:test";
import {
  computeInvestmentReflectionSha256,
  investmentReflectionContentSchema,
  investmentReflections,
  loadInvestmentReflections,
} from "../../src/app/investing/investment-reflections";

test("the approved investment reflection preserves the user's exact prose", () => {
  const reflection = investmentReflections.find(
    (item) => item.id === "snowflake-earnings-and-dip-buying",
  );
  assert.ok(reflection);
  assert.equal(investmentReflections.length, 2);
  assert.equal(reflection.date, "2026-09-03");
  assert.equal(reflection.title, "Snowflake财报后暴涨22%");
  assert.equal(
    reflection.body,
    "Snowflake财报后暴涨22%，我在前几天清仓卖飞了，但是落袋为安不遗憾。与其接盘估值离谱、靠逼空续命的软件公司，不如保持耐心，逢低布局 (Dip Buying) 那些拥有恐怖现金流、利润率极高且估值便宜的硬件巨头。",
  );
});

test("the newly approved semiconductor reflection matches its reviewed revision", () => {
  const reflection = investmentReflections.find(
    (item) => item.id === "semiconductor-strength-and-buying-discipline",
  );
  assert.ok(reflection);
  assert.equal(reflection.date, "2026-09-04");
  assert.equal(reflection.title, "半导体走强，更要保持买入纪律");
  assert.equal(
    reflection.body,
    "周五，半导体与存储板块明显走强，闪迪（SNDK）仍处相对高位；Snowflake 及软件股相较之下缺少持续性，SNOW 从前一日约 385 美元的高点回落至约 337 美元。回头看，没有在急涨时追高，是更合适的选择。接下来我会更谨慎地控制买卖节奏。我仍没有看到市场对 AI capex 最终 ROI 的充分信心，因此较大的波动可能还会持续。近期我在分批配置 Broadcom（AVGO）和 Qualcomm（QCOM）；我的判断是，它们仍可能处在估值偏低、等待催化剂的阶段，这让我想到 Palantir 过去等待重估的一段走势，但类比并不等于结论。此前逢低布局的 Meta 近期也在回升。对我而言，面对基本面认可的公司，buy the dip 应建立在耐心、分批和仓位纪律上，而不是追涨。",
  );
});

test("approved investment prose is pinned to its canonical SHA-256", () => {
  const source = investmentReflections.find(
    (item) => item.id === "snowflake-earnings-and-dip-buying",
  );
  assert.ok(source);
  const content = investmentReflectionContentSchema.parse({
    id: source.id,
    date: source.date,
    title: source.title,
    body: source.body,
    sources: source.sources,
  });

  assert.equal(computeInvestmentReflectionSha256(content), source.contentSha256);
  assert.throws(
    () => loadInvestmentReflections([{ ...source, body: `${source.body} 未经确认的补充` }]),
    /SHA-256/,
  );
});
