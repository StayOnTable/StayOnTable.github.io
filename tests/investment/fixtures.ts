import { INVESTMENT_SOURCE_SCHEMA_VERSION } from "../../src/lib/investment";

export function validInvestmentSource(): unknown {
  return {
    schemaVersion: INVESTMENT_SOURCE_SCHEMA_VERSION,
    publicationStatus: "published",
    source: "ibkr-readonly-plugin",
    asOfDate: "2026-09-02",
    dataDates: {
      positionsAsOf: "2026-09-02",
      tradesFrom: "2026-08-31",
      tradesThrough: "2026-09-02",
    },
    performance: {
      coverageStartDate: "2026-03-31",
      coverageEndDate: "2026-09-02",
      dailyTwr: [
        { date: "2026-03-31", returnPct: 50 },
        { date: "2026-04-01", returnPct: 1 },
        { date: "2026-04-03", returnPct: -0.5 },
        { date: "2026-07-01", returnPct: 2 },
        { date: "2026-08-31", returnPct: -1 },
        { date: "2026-09-01", returnPct: 0.5 },
        { date: "2026-09-02", returnPct: 1 },
      ],
    },
    positions: [
      {
        assetType: "stock-or-etf",
        displaySymbol: "DEMO-LONG",
        direction: "long",
        marketValue: { currency: "USD", signedAmount: 10000 },
      },
      {
        assetType: "stock-or-etf",
        displaySymbol: "DEMO-SHORT",
        direction: "short",
        marketValue: { currency: "USD", signedAmount: -5000 },
      },
      {
        assetType: "option",
        displaySymbol: "DEMO",
        direction: "short",
        marketValue: { currency: "USD", signedAmount: -2500 },
      },
      {
        assetType: "stock-or-etf",
        displaySymbol: "DEMO-LONG",
        direction: "long",
        marketValue: { currency: "USD", signedAmount: 2500 },
      },
      {
        assetType: "stock-or-etf",
        displaySymbol: "CLOSED",
        direction: "long",
        marketValue: { currency: "USD", signedAmount: 0 },
      },
    ],
    tradeFills: [
      {
        tradeDate: "2026-09-01",
        assetType: "stock-or-etf",
        displaySymbol: "DEMO-LONG",
        side: "buy",
        currency: "USD",
        amountAbsUsd: 200,
      },
      {
        tradeDate: "2026-09-01",
        assetType: "stock-or-etf",
        displaySymbol: "DEMO-LONG",
        side: "buy",
        currency: "USD",
        amountAbsUsd: 100,
      },
      {
        tradeDate: "2026-09-02",
        assetType: "option",
        displaySymbol: "DEMO",
        side: "sell",
        currency: "USD",
        amountAbsUsd: 350,
      },
    ],
  };
}
