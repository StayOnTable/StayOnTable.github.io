import assert from "node:assert/strict";
import test from "node:test";

import {
  InvestmentDataQualityError,
  buildPublicPerformance,
  calculateFlowAdjustedReturnPct,
  compoundReturnPct,
  normalizeDailyTwrChunks,
} from "../../src/lib/investment";

test("removes external deposits and withdrawals from adapter-side return", () => {
  assert.equal(
    calculateFlowAdjustedReturnPct({
      openingValueUsd: 100000,
      closingValueUsd: 152000,
      netExternalFlowUsd: 50000,
      flowTiming: "end",
    }),
    2,
  );
  assert.equal(
    calculateFlowAdjustedReturnPct({
      openingValueUsd: 100000,
      closingValueUsd: 82000,
      netExternalFlowUsd: -20000,
      flowTiming: "end",
    }),
    2,
  );
  assert.equal(
    calculateFlowAdjustedReturnPct({
      openingValueUsd: 100000,
      closingValueUsd: 153000,
      netExternalFlowUsd: 50000,
      flowTiming: "start",
    }),
    2,
  );
});

test("compounds returns across overlapping Flex chunks without double counting", () => {
  const normalized = normalizeDailyTwrChunks(
    [
      [
        { date: "2025-04-01", returnPct: 10 },
        { date: "2025-04-02", returnPct: 0 },
      ],
      [
        { date: "2025-04-02", returnPct: 0 },
        { date: "2025-04-03", returnPct: -10 },
      ],
    ],
    ["2025-04-01", "2025-04-02", "2025-04-03"],
  );

  assert.equal(normalized.length, 3);
  assert.equal(compoundReturnPct(normalized), -1);
});

test("fails closed when overlapping chunks disagree", () => {
  assert.throws(
    () =>
      normalizeDailyTwrChunks(
        [
          [{ date: "2025-04-01", returnPct: 1 }],
          [{ date: "2025-04-01", returnPct: 2 }],
        ],
        ["2025-04-01"],
      ),
    (error: unknown) =>
      error instanceof InvestmentDataQualityError &&
      error.code === "DUPLICATE_TWR_CONFLICT",
  );
});

test("detects an expected trading-day gap but does not invent weekend gaps", () => {
  assert.throws(
    () =>
      normalizeDailyTwrChunks(
        [
          [
            { date: "2025-04-04", returnPct: 0.5 },
            { date: "2025-04-08", returnPct: 0.25 },
          ],
        ],
        ["2025-04-04", "2025-04-07", "2025-04-08"],
      ),
    (error: unknown) =>
      error instanceof InvestmentDataQualityError &&
      error.code === "MISSING_TRADING_DATES",
  );

  assert.doesNotThrow(() =>
    normalizeDailyTwrChunks(
      [
        [
          { date: "2025-04-04", returnPct: 0.5 },
          { date: "2025-04-07", returnPct: 0.25 },
        ],
      ],
      ["2025-04-04", "2025-04-07"],
    ),
  );
});

test("builds Friday-labelled weekly series and whole-account drawdown", () => {
  const performance = buildPublicPerformance(
    [
      { date: "2025-03-31", returnPct: 10 },
      { date: "2025-04-01", returnPct: -5 },
      { date: "2025-04-04", returnPct: 2 },
      { date: "2025-04-07", returnPct: 1 },
      { date: "2025-04-11", returnPct: -1 },
    ],
    "2025-04-11",
  );

  assert.deepEqual(
    performance.weeklySeries.map((point) => point.weekEnding),
    ["2025-04-04", "2025-04-11"],
  );
  assert.equal(performance.weeklySeries[1].weeklyReturnPct, -0.01);
  assert.equal(performance.maxDrawdownPct, -5);
  assert.equal(performance.ytdReturnPct, 6.579341);
});

test("does not synthesize a zero-return row for a fully closed market week", () => {
  const normalized = normalizeDailyTwrChunks(
    [
      [
        { date: "2025-04-04", returnPct: 0 },
        { date: "2025-04-14", returnPct: 1 },
      ],
    ],
    ["2025-04-04", "2025-04-14"],
  );
  const performance = buildPublicPerformance(normalized, "2025-04-14", "2025-04-04");

  assert.deepEqual(performance.weeklySeries, [
    { weekEnding: "2025-04-04", weeklyReturnPct: 0, portfolioIndex: 100 },
    { weekEnding: "2025-04-14", weeklyReturnPct: 1, portfolioIndex: 101 },
  ]);
  assert.equal(
    performance.weeklySeries.some((point) => point.weekEnding === "2025-04-11"),
    false,
  );
});
