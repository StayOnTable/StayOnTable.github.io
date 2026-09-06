import assert from "node:assert/strict";
import test from "node:test";

import {
  InvestmentDataQualityError,
  buildPublicPerformance,
  compoundReturnPct,
  normalizeDailyTwrPoints,
} from "../../src/lib/investment";

test("compounds plugin TWR percentages without dollar account values", () => {
  assert.equal(
    compoundReturnPct([
      { date: "2026-08-31", returnPct: 10 },
      { date: "2026-09-01", returnPct: -10 },
    ]),
    -1,
  );
});

test("de-duplicates identical plugin dates and fails on conflicting values", () => {
  assert.deepEqual(
    normalizeDailyTwrPoints([
      { date: "2026-09-02", returnPct: 0.5 },
      { date: "2026-09-01", returnPct: 0.25 },
      { date: "2026-09-02", returnPct: 0.5 },
    ]),
    [
      { date: "2026-09-01", returnPct: 0.25 },
      { date: "2026-09-02", returnPct: 0.5 },
    ],
  );

  assert.throws(
    () =>
      normalizeDailyTwrPoints([
        { date: "2026-09-02", returnPct: 0.5 },
        { date: "2026-09-02", returnPct: 0.75 },
      ]),
    (error: unknown) =>
      error instanceof InvestmentDataQualityError &&
      error.code === "DUPLICATE_TWR_CONFLICT",
  );
});

test("publishes only weekly, current-month, and current-quarter TWR", () => {
  const performance = buildPublicPerformance(
    [
      { date: "2026-03-31", returnPct: 50 },
      { date: "2026-04-01", returnPct: 1 },
      { date: "2026-04-03", returnPct: -0.5 },
      { date: "2026-07-01", returnPct: 2 },
      { date: "2026-08-31", returnPct: -1 },
      { date: "2026-09-01", returnPct: 0.5 },
      { date: "2026-09-02", returnPct: 1 },
    ],
    "2026-03-31",
    "2026-09-02",
  );

  assert.equal(performance.measure, "twr");
  assert.equal(performance.coverageStartDate, "2026-04-01");
  assert.equal(performance.coverageEndDate, "2026-09-02");
  assert.deepEqual(performance.weeklySeries, [
    { weekEnding: "2026-04-03", weeklyReturnPct: 0.495, portfolioIndex: 100.495 },
    { weekEnding: "2026-07-01", weeklyReturnPct: 2, portfolioIndex: 102.5049 },
    { weekEnding: "2026-09-02", weeklyReturnPct: 0.48995, portfolioIndex: 103.007123 },
  ]);
  assert.equal(performance.weeklyReturnPct, 0.48995);
  assert.equal(performance.monthlyReturnPct, 1.505);
  assert.equal(performance.quarterlyReturnPct, 2.499749);
  assert.deepEqual(Object.keys(performance).sort(), [
    "coverageEndDate",
    "coverageStartDate",
    "measure",
    "monthlyReturnPct",
    "quarterlyReturnPct",
    "weeklyReturnPct",
    "weeklySeries",
  ]);
});

test("clips public history at April 1 without applying older returns", () => {
  const performance = buildPublicPerformance(
    [
      { date: "2025-09-02", returnPct: 900 },
      { date: "2026-04-06", returnPct: 1 },
      { date: "2026-09-02", returnPct: 2 },
    ],
    "2025-09-02",
    "2026-09-02",
  );

  assert.equal(performance.coverageStartDate, "2026-04-06");
  assert.equal(performance.weeklySeries[0]?.portfolioIndex, 101);
  assert.equal(performance.weeklySeries.at(-1)?.portfolioIndex, 103.02);
});

test("keeps 2026-04-01 as the fixed history anchor in later years", () => {
  const performance = buildPublicPerformance(
    [
      { date: "2026-04-01", returnPct: 1 },
      { date: "2027-01-04", returnPct: 2 },
      { date: "2027-05-03", returnPct: 3 },
    ],
    "2026-04-01",
    "2027-05-03",
  );

  assert.equal(performance.coverageStartDate, "2026-04-01");
  assert.equal(performance.weeklySeries[0]?.weekEnding, "2026-04-01");
});

test("uses null instead of inventing incomplete month or quarter returns", () => {
  const performance = buildPublicPerformance(
    [
      { date: "2026-08-31", returnPct: 1 },
      { date: "2026-09-02", returnPct: -0.5 },
    ],
    "2026-08-31",
    "2026-09-02",
  );

  assert.equal(performance.monthlyReturnPct, -0.5);
  assert.equal(performance.quarterlyReturnPct, null);
});

test("fails closed when declared plugin coverage does not match the TWR endpoints", () => {
  assert.throws(
    () =>
      buildPublicPerformance(
        [
          { date: "2026-09-01", returnPct: 0.25 },
          { date: "2026-09-02", returnPct: 0.5 },
        ],
        "2026-08-31",
        "2026-09-02",
      ),
    (error: unknown) =>
      error instanceof InvestmentDataQualityError &&
      error.code === "TWR_COVERAGE_MISMATCH",
  );
});

test("does not synthesize a zero-return row for a market-closed week", () => {
  const performance = buildPublicPerformance(
    [
      { date: "2026-08-21", returnPct: 0 },
      { date: "2026-09-01", returnPct: 1 },
    ],
    "2026-08-21",
    "2026-09-01",
  );

  assert.deepEqual(performance.weeklySeries, [
    { weekEnding: "2026-08-21", weeklyReturnPct: 0, portfolioIndex: 100 },
    { weekEnding: "2026-09-01", weeklyReturnPct: 1, portfolioIndex: 101 },
  ]);
});
