import { INVESTMENT_SOURCE_SCHEMA_VERSION } from "../../src/lib/investment";

export function validInvestmentSource(): unknown {
  return {
    schemaVersion: INVESTMENT_SOURCE_SCHEMA_VERSION,
    asOfDate: "2025-04-04",
    inceptionDate: "2025-04-01",
    expectedTradingDates: ["2025-04-01", "2025-04-02", "2025-04-03", "2025-04-04"],
    dailyTwrChunks: [
      [
        { date: "2025-04-01", returnPct: 1 },
        { date: "2025-04-02", returnPct: -0.5 },
        { date: "2025-04-03", returnPct: 0.25 },
      ],
      [
        { date: "2025-04-03", returnPct: 0.25 },
        { date: "2025-04-04", returnPct: 1.5 },
      ],
    ],
    positions: [
      {
        assetType: "stock",
        displaySymbol: "DEMO-LONG",
        direction: "long",
        marketValueUsd: 10000,
      },
      {
        assetType: "etf",
        displaySymbol: "DEMO-SHORT",
        direction: "short",
        marketValueUsd: -5000,
      },
      {
        assetType: "option",
        displaySymbol: "DEMO 2025-06-20 100C",
        direction: "short",
        marketValueUsd: -2500,
        option: {
          underlying: "DEMO",
          expiration: "2025-06-20",
          strike: 100,
          right: "call",
          openContracts: 2,
        },
      },
      {
        assetType: "stock",
        displaySymbol: "CLOSED",
        direction: "long",
        marketValueUsd: 0,
      },
    ],
    optionTrades: [
      {
        tradeDate: "2025-04-02",
        underlying: "DEMO",
        expiration: "2025-06-20",
        strike: 100,
        right: "call",
        side: "sell",
        contracts: 2,
        fillPrice: 1,
      },
      {
        tradeDate: "2025-04-04",
        underlying: "DEMO",
        expiration: "2025-06-20",
        strike: 100,
        right: "call",
        side: "sell",
        contracts: 1,
        fillPrice: 4,
      },
    ],
  };
}
