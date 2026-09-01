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

test("accepts the checked-in placeholder through both privacy and schema gates", () => {
  assert.doesNotThrow(() => assertPublicInvestmentPrivacy(samplePanel));
  assert.doesNotThrow(() => PublicInvestmentPanelSchema.parse(samplePanel));
});

test("requires the exact full disclaimer", () => {
  const panel = buildPublicInvestmentPanel(validInvestmentSource());
  const missingDisclaimer = { ...panel, disclaimer: "仅个人复盘，非投资建议。" };

  assert.equal(panel.disclaimer, INVESTMENT_DISCLAIMER);
  assert.throws(() => PublicInvestmentPanelSchema.parse(missingDisclaimer));
});

test("rejects financing, account-equity, credentials, IDs, and dollar P&L keys", () => {
  const unsafe = {
    safe: {
      marketValueAbsUsd: 100,
      cashBalance: -5000,
      marginRequirement: 1000,
      netLiquidationValue: 25000,
      accountId: "redacted-in-test",
      flexToken: "redacted-in-test",
      orderId: 42,
      pnlUsd: 500,
      realizedPnlUsd: 500,
    },
  };

  const paths = scanPublicInvestmentPayload(unsafe).map((violation) => violation.path);
  assert.deepEqual(paths, [
    "$.safe.cashBalance",
    "$.safe.marginRequirement",
    "$.safe.netLiquidationValue",
    "$.safe.accountId",
    "$.safe.flexToken",
    "$.safe.orderId",
    "$.safe.pnlUsd",
    "$.safe.realizedPnlUsd",
  ]);
  assert.throws(
    () => assertPublicInvestmentPrivacy(unsafe),
    (error: unknown) => error instanceof InvestmentPrivacyError,
  );
});

test("rejects embedded IBKR account identifiers and local connection details", () => {
  const violations = scanPublicInvestmentPayload({
    label: "account: U1234567",
    endpoint: "localhost:4002",
  });

  assert.equal(violations.some((violation) => violation.code === "ACCOUNT_IDENTIFIER"), true);
  assert.equal(violations.some((violation) => violation.code === "CONNECTION_DETAIL"), true);
});

test("does not reject allowed gross/absolute market values or option fill fields", () => {
  const panel = buildPublicInvestmentPanel(validInvestmentSource());
  assert.deepEqual(scanPublicInvestmentPayload(panel), []);
});

test("strict public schema rejects unknown fields even when their name looks harmless", () => {
  const panel = buildPublicInvestmentPanel(validInvestmentSource());
  assert.throws(() => PublicInvestmentPanelSchema.parse({ ...panel, internalNote: "hidden" }));
});

test("rejects cash, financing, margin, or account equity disguised as a public position", () => {
  const panel = buildPublicInvestmentPanel(validInvestmentSource());
  const disguisedCash = {
    ...panel,
    grossSecuritiesMarketValueUsd: 50000,
    positions: [
      {
        assetType: "other",
        displaySymbol: "USD CASH",
        direction: "long",
        marketValueAbsUsd: 50000,
        allocationPct: 100,
      },
    ],
  };

  assert.throws(() => assertPublicInvestmentPrivacy(disguisedCash));
  assert.throws(() => PublicInvestmentPanelSchema.parse(disguisedCash));
});

test("rejects a stale weekly series whose last date is older than asOfDate", () => {
  const panel = buildPublicInvestmentPanel(validInvestmentSource());
  assert.throws(() =>
    PublicInvestmentPanelSchema.parse({ ...panel, asOfDate: "2025-04-11" }),
  );
});
