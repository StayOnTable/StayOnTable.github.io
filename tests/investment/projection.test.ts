import assert from "node:assert/strict";
import test from "node:test";

import {
  INVESTMENT_DISCLAIMER,
  InvestmentSourceSnapshotSchema,
  PublicInvestmentPanelSchema,
  buildPublicInvestmentPanel,
} from "../../src/lib/investment";
import { validInvestmentSource } from "./fixtures";

test("projects one USD allocation without public position amounts", () => {
  const panel = buildPublicInvestmentPanel(validInvestmentSource());

  assert.equal(panel.schemaVersion, "investment-public-v3");
  assert.equal(panel.publicationStatus, "published");
  assert.equal(panel.source, "ibkr-readonly-plugin");
  assert.equal(panel.currency, "USD");
  assert.equal(panel.disclaimer, INVESTMENT_DISCLAIMER);
  assert.deepEqual(panel.positions, [
    {
      assetType: "stock-or-etf",
      displaySymbol: "DEMO-LONG",
      direction: "long",
      allocationPct: 62.5,
    },
    {
      assetType: "stock-or-etf",
      displaySymbol: "DEMO-SHORT",
      direction: "short",
      allocationPct: 25,
    },
    {
      assetType: "option",
      displaySymbol: "DEMO",
      direction: "short",
      allocationPct: 12.5,
    },
  ]);
  assert.equal(
    panel.positions.reduce((sum, position) => sum + position.allocationPct, 0),
    100,
  );
});

test("aggregates completed USD fills into amount and count only", () => {
  const panel = buildPublicInvestmentPanel(validInvestmentSource());

  assert.deepEqual(panel.weeklyTrades, [
    {
      tradeDate: "2026-09-02",
      assetType: "option",
      displaySymbol: "DEMO",
      side: "sell",
      amountAbsUsd: 350,
      fillCount: 1,
    },
    {
      tradeDate: "2026-09-01",
      assetType: "stock-or-etf",
      displaySymbol: "DEMO-LONG",
      side: "buy",
      amountAbsUsd: 300,
      fillCount: 2,
    },
  ]);
});

test("strict public schema rejects duplicate trade aggregate keys", () => {
  const panel = buildPublicInvestmentPanel(validInvestmentSource());
  const duplicate = panel.weeklyTrades[0];
  assert.ok(duplicate);

  const result = PublicInvestmentPanelSchema.safeParse({
    ...panel,
    weeklyTrades: [...panel.weeklyTrades, { ...duplicate }],
  });

  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(
      result.error.issues.some(
        (issue) =>
          issue.path.join(".") === "weeklyTrades.2" &&
          issue.message.includes("full public aggregate key"),
      ),
      true,
    );
  }
});

test("emits no position value, quantity, cost, IDs, exact time, P&L, or price", () => {
  const serialized = JSON.stringify(buildPublicInvestmentPanel(validInvestmentSource())).toLowerCase();

  [
    "marketvalue",
    "valuation",
    "quantity",
    "shares",
    "costbasis",
    "averagecost",
    "averagefillprice",
    "fillprice",
    "accountid",
    "orderid",
    "executionid",
    "timestamp",
    "pnl",
    "commission",
  ].forEach((forbidden) => assert.equal(serialized.includes(forbidden), false));
});

test("the builder output satisfies all strict public invariants", () => {
  assert.doesNotThrow(() =>
    PublicInvestmentPanelSchema.parse(buildPublicInvestmentPanel(validInvestmentSource())),
  );
});

test("fails closed when direction disagrees with signed USD market value", () => {
  const source = InvestmentSourceSnapshotSchema.parse(validInvestmentSource());
  source.positions[0] = { ...source.positions[0], direction: "short" };
  assert.throws(() => buildPublicInvestmentPanel(source));
});

test("fails closed instead of converting or silently omitting non-USD values", () => {
  const source = validInvestmentSource() as {
    positions: Array<{ marketValue: { currency: string } }>;
    tradeFills: Array<{ currency: string }>;
  };
  source.positions[0]!.marketValue.currency = "HKD";
  assert.throws(() => buildPublicInvestmentPanel(source));

  const tradeSource = validInvestmentSource() as {
    tradeFills: Array<{ currency: string }>;
  };
  tradeSource.tradeFills[0]!.currency = "CAD";
  assert.throws(() => buildPublicInvestmentPanel(tradeSource));
});

test("keeps incomplete current-month and current-quarter returns explicitly null", () => {
  const source = InvestmentSourceSnapshotSchema.parse(validInvestmentSource());
  source.performance.coverageStartDate = "2026-09-02";
  source.performance.dailyTwr = [{ date: "2026-09-02", returnPct: 0.5 }];

  const panel = buildPublicInvestmentPanel(source);
  assert.equal(panel.performance.monthlyReturnPct, null);
  assert.equal(panel.performance.quarterlyReturnPct, null);
});

test("rejects trade fills outside the declared weekly window", () => {
  const source = InvestmentSourceSnapshotSchema.parse(validInvestmentSource());
  source.tradeFills[0] = { ...source.tradeFills[0], tradeDate: "2026-08-28" };

  assert.throws(() => buildPublicInvestmentPanel(source));
});
