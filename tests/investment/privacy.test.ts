import assert from "node:assert/strict";
import test from "node:test";

import samplePanel from "../../src/content/investment-public.json";
import {
  INVESTMENT_DISCLAIMER,
  InvestmentPrivacyError,
  PublicInvestmentPanelSchema,
  assertPublicInvestmentPrivacy,
  buildPublicInvestmentPanel,
  scanPublicInvestmentPayload,
} from "../../src/lib/investment";
import { validInvestmentSource } from "./fixtures";

const SYNTHETIC_ACCOUNT_ID = ["U", "123", "4567"].join("");
const SYNTHETIC_LOCAL_ENDPOINT = ["local", "host", ":40", "02"].join("");

test("accepts the checked-in published v3 snapshot through privacy and schema gates", () => {
  assert.equal(samplePanel.publicationStatus, "published");
  assert.doesNotThrow(() => assertPublicInvestmentPrivacy(samplePanel));
  assert.doesNotThrow(() => PublicInvestmentPanelSchema.parse(samplePanel));
});

test("requires the exact full disclaimer", () => {
  const panel = buildPublicInvestmentPanel(validInvestmentSource());
  const missingDisclaimer = { ...panel, disclaimer: "仅个人复盘，非投资建议。" };

  assert.equal(panel.disclaimer, INVESTMENT_DISCLAIMER);
  assert.throws(() => PublicInvestmentPanelSchema.parse(missingDisclaimer));
});

test("rejects position amount, account, financing, quantity, exact-time, fee, and dollar P&L keys", () => {
  const unsafe = {
    safe: {
      amountAbs: 100,
      cashBalance: -5000,
      marginRequirement: 1000,
      netLiquidationValue: 25000,
      accountId: "redacted-in-test",
      token: "redacted-in-test",
      orderId: 42,
      quantity: 5,
      executionTime: "09:30:00",
      commission: 1,
      pnlUsd: 500,
    },
  };

  const paths = scanPublicInvestmentPayload(unsafe).map((violation) => violation.path);
  assert.deepEqual(paths, [
    "$.safe.amountAbs",
    "$.safe.cashBalance",
    "$.safe.marginRequirement",
    "$.safe.netLiquidationValue",
    "$.safe.accountId",
    "$.safe.token",
    "$.safe.orderId",
    "$.safe.quantity",
    "$.safe.executionTime",
    "$.safe.commission",
    "$.safe.pnlUsd",
  ]);
  assert.throws(
    () => assertPublicInvestmentPrivacy(unsafe),
    (error: unknown) => error instanceof InvestmentPrivacyError,
  );
});

test("rejects embedded IBKR account identifiers and local connection details", () => {
  const violations = scanPublicInvestmentPayload({
    label: `account: ${SYNTHETIC_ACCOUNT_ID}`,
    endpoint: SYNTHETIC_LOCAL_ENDPOINT,
  });

  assert.equal(violations.some((violation) => violation.code === "ACCOUNT_IDENTIFIER"), true);
  assert.equal(violations.some((violation) => violation.code === "CONNECTION_DETAIL"), true);
});

test("allows USD-only allocations and aggregated trade amounts", () => {
  const panel = buildPublicInvestmentPanel(validInvestmentSource());
  assert.deepEqual(scanPublicInvestmentPayload(panel), []);
});

test("strict public schema rejects every unknown field", () => {
  const panel = buildPublicInvestmentPanel(validInvestmentSource());
  assert.throws(() => PublicInvestmentPanelSchema.parse({ ...panel, internalNote: "hidden" }));
  assert.throws(() =>
    PublicInvestmentPanelSchema.parse({
      ...panel,
      weeklyTrades: [{ ...panel.weeklyTrades[0], orderId: "private" }],
    }),
  );
});

test("rejects cash, financing, margin, or account equity disguised as a position", () => {
  const panel = buildPublicInvestmentPanel(validInvestmentSource());
  const disguisedCash = {
    ...panel,
    positions: [
      {
        assetType: "other",
        displaySymbol: "USD CASH",
        direction: "long",
        allocationPct: 100,
      },
    ],
  };

  assert.throws(() => assertPublicInvestmentPrivacy(disguisedCash));
  assert.throws(() => PublicInvestmentPanelSchema.parse(disguisedCash));
});

test("rejects option contract details hidden inside displaySymbol", () => {
  const panel = buildPublicInvestmentPanel(validInvestmentSource());
  const detailedLabels = [
    "DEMO 2027-06-17 105C",
    "DEMO270617C00105000",
  ];

  detailedLabels.forEach((displaySymbol) => {
    const unsafePosition = {
      ...panel,
      positions: panel.positions.map((position) =>
        position.assetType === "option" ? { ...position, displaySymbol } : position,
      ),
    };
    const unsafeTrade = {
      ...panel,
      weeklyTrades: panel.weeklyTrades.map((trade) =>
        trade.assetType === "option" ? { ...trade, displaySymbol } : trade,
      ),
    };

    assert.throws(() => assertPublicInvestmentPrivacy(unsafePosition));
    assert.throws(() => PublicInvestmentPanelSchema.parse(unsafePosition));
    assert.throws(() => assertPublicInvestmentPrivacy(unsafeTrade));
    assert.throws(() => PublicInvestmentPanelSchema.parse(unsafeTrade));
  });
});

test("rejects a stale top-level date that is not the latest section date", () => {
  const panel = buildPublicInvestmentPanel(validInvestmentSource());
  assert.throws(() =>
    PublicInvestmentPanelSchema.parse({ ...panel, asOfDate: "2026-09-01" }),
  );
});
