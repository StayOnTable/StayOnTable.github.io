import assert from "node:assert/strict";
import test from "node:test";
import {
  computeInvestmentReflectionSha256,
  investmentReflectionContentSchema,
  investmentReflections,
  loadInvestmentReflections,
} from "../../src/app/investing/investment-reflections";

test("the approved investment reflection preserves the user's exact prose", () => {
  assert.equal(investmentReflections.length, 1);
  assert.equal(investmentReflections[0].date, "2026-09-03");
  assert.equal(investmentReflections[0].title, "Snowflake财报后暴涨22%");
  assert.equal(
    investmentReflections[0].body,
    "Snowflake财报后暴涨22%，我在前几天清仓卖飞了，但是落袋为安不遗憾。与其接盘估值离谱、靠逼空续命的软件公司，不如保持耐心，逢低布局 (Dip Buying) 那些拥有恐怖现金流、利润率极高且估值便宜的硬件巨头。",
  );
});

test("approved investment prose is pinned to its canonical SHA-256", () => {
  const source = investmentReflections[0];
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
