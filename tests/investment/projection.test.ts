import assert from "node:assert/strict";
import test from "node:test";

import {
  INVESTMENT_DISCLAIMER,
  InvestmentSourceSnapshotSchema,
  PublicInvestmentPanelSchema,
  buildPublicInvestmentPanel,
} from "../../src/lib/investment";
import { validInvestmentSource } from "./fixtures";

test("projects longs, shorts, and detailed options using absolute public values", () => {
  const panel = buildPublicInvestmentPanel(validInvestmentSource());

  assert.equal(panel.disclaimer, INVESTMENT_DISCLAIMER);
  assert.equal(panel.grossSecuritiesMarketValueUsd, 17500);
  assert.equal(panel.positions.length, 3);
  assert.equal(
    panel.positions.reduce((sum, position) => sum + position.allocationPct, 0),
    100,
  );

  const shortEtf = panel.positions.find((position) => position.displaySymbol === "DEMO-SHORT");
  assert.deepEqual(
    shortEtf && {
      direction: shortEtf.direction,
      marketValueAbsUsd: shortEtf.marketValueAbsUsd,
    },
    { direction: "short", marketValueAbsUsd: 5000 },
  );

  const option = panel.positions.find((position) => position.assetType === "option");
  assert.deepEqual(option?.option, {
    underlying: "DEMO",
    expiration: "2025-06-20",
    strike: 100,
    right: "call",
    openContracts: 2,
  });
  assert.equal(option?.direction, "short");
});

test("aggregates option fills by week with a contract-weighted average", () => {
  const panel = buildPublicInvestmentPanel(validInvestmentSource());

  assert.deepEqual(panel.weeklyOptionTrades, [
    {
      weekEnding: "2025-04-04",
      underlying: "DEMO",
      expiration: "2025-06-20",
      strike: 100,
      right: "call",
      side: "sell",
      contracts: 3,
      averageFillPrice: 2,
    },
  ]);
});

test("strict public schema rejects a duplicate weekly option aggregate key", () => {
  const panel = buildPublicInvestmentPanel(validInvestmentSource());
  const duplicate = panel.weeklyOptionTrades[0];
  assert.ok(duplicate);

  const result = PublicInvestmentPanelSchema.safeParse({
    ...panel,
    weeklyOptionTrades: [...panel.weeklyOptionTrades, { ...duplicate }],
  });

  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(
      result.error.issues.some(
        (issue) =>
          issue.path.join(".") === "weeklyOptionTrades.1" &&
          issue.message.includes("full public aggregate key"),
      ),
      true,
    );
  }
});

test("emits no stock quantity, stock cost basis, raw IDs, or dollar P&L fields", () => {
  const serialized = JSON.stringify(buildPublicInvestmentPanel(validInvestmentSource())).toLowerCase();

  [
    "quantity",
    "shares",
    "costbasis",
    "averagecost",
    "accountid",
    "orderid",
    "executionid",
    "pnlusd",
    "realizedpnl",
    "unrealizedpnl",
  ].forEach((forbidden) => assert.equal(serialized.includes(forbidden), false));
});

test("the builder output satisfies all strict public invariants", () => {
  assert.doesNotThrow(() =>
    PublicInvestmentPanelSchema.parse(buildPublicInvestmentPanel(validInvestmentSource())),
  );
});

test("fails closed when normalized direction disagrees with signed market value", () => {
  const source = InvestmentSourceSnapshotSchema.parse(validInvestmentSource());
  source.positions[0] = { ...source.positions[0], direction: "short" };
  assert.throws(() => buildPublicInvestmentPanel(source));
});

test("keeps account inception return separate from a later chart baseline", () => {
  const base = validInvestmentSource() as {
    dailyTwrChunks: Array<Array<{ date: string; returnPct: number }>>;
    expectedTradingDates: string[];
    optionTrades: unknown[];
    [key: string]: unknown;
  };
  const source = {
    ...base,
    inceptionDate: "2024-12-27",
    chartStartDate: "2025-04-04",
    asOfDate: "2025-04-11",
    expectedTradingDates: [
      "2024-12-27",
      ...base.expectedTradingDates,
      "2025-04-07",
      "2025-04-11",
    ],
    dailyTwrChunks: [
      [{ date: "2024-12-27", returnPct: 10 }],
      ...base.dailyTwrChunks,
      [
        { date: "2025-04-07", returnPct: 1 },
        { date: "2025-04-11", returnPct: 0 },
      ],
    ],
    optionTrades: [],
  };

  const panel = buildPublicInvestmentPanel(source);
  assert.equal(panel.inceptionDate, "2024-12-27");
  assert.deepEqual(panel.performance.weeklySeries[0], {
    weekEnding: "2025-04-04",
    weeklyReturnPct: 0,
    portfolioIndex: 100,
  });
  assert.equal(panel.performance.weeklySeries.at(-1)?.portfolioIndex, 101);
  assert.notEqual(panel.performance.sinceInceptionReturnPct, 1);
  assert.doesNotThrow(() => PublicInvestmentPanelSchema.parse(panel));
});
