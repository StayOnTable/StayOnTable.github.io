import {
  INVESTMENT_DISCLAIMER,
  PUBLIC_INVESTMENT_SCHEMA_VERSION,
} from "./constants";
import { roundNumber, weekEndingFriday } from "./date";
import { assertPublicInvestmentPrivacy } from "./privacy";
import {
  PublicInvestmentPanelSchema,
  type PublicInvestmentPanel,
  type PublicPosition,
  type PublicWeeklyOptionTrade,
} from "./schema";
import {
  InvestmentSourceSnapshotSchema,
  type InvestmentSourceOptionTrade,
  type InvestmentSourcePosition,
  type PrivateInvestmentSourceAdapter,
} from "./source";
import {
  InvestmentDataQualityError,
  buildPublicPerformance,
  normalizeDailyTwrChunks,
} from "./twr";

function projectPositions(sourcePositions: readonly InvestmentSourcePosition[]): {
  grossSecuritiesMarketValueUsd: number;
  positions: PublicPosition[];
} {
  const positions = sourcePositions
    .map((position) => ({
      assetType: position.assetType,
      displaySymbol: position.displaySymbol,
      direction: position.direction,
      marketValueAbsUsd: roundNumber(Math.abs(position.marketValueUsd), 2),
      ...(position.option ? { option: { ...position.option } } : {}),
    }))
    .filter((position) => position.marketValueAbsUsd > 0)
    .sort(
      (left, right) =>
        right.marketValueAbsUsd - left.marketValueAbsUsd ||
        left.displaySymbol.localeCompare(right.displaySymbol),
    );

  const grossSecuritiesMarketValueUsd = roundNumber(
    positions.reduce((sum, position) => sum + position.marketValueAbsUsd, 0),
    2,
  );

  let allocated = 0;
  const publicPositions: PublicPosition[] = positions.map((position, index) => {
    const isLast = index === positions.length - 1;
    const allocationPct =
      grossSecuritiesMarketValueUsd === 0
        ? 0
        : isLast
          ? roundNumber(100 - allocated)
          : roundNumber(
              (position.marketValueAbsUsd / grossSecuritiesMarketValueUsd) * 100,
            );
    allocated = roundNumber(allocated + allocationPct);
    return { ...position, allocationPct };
  });

  return { grossSecuritiesMarketValueUsd, positions: publicPositions };
}

type OptionTradeAccumulator = Omit<PublicWeeklyOptionTrade, "contracts" | "averageFillPrice"> & {
  contracts: number;
  weightedFillTotal: number;
};

function optionTradeKey(trade: InvestmentSourceOptionTrade): string {
  return [
    weekEndingFriday(trade.tradeDate),
    trade.underlying,
    trade.expiration,
    trade.strike,
    trade.right,
    trade.side,
  ].join("|");
}

export function aggregateWeeklyOptionTrades(
  sourceTrades: readonly InvestmentSourceOptionTrade[],
  expectedTradingDates: readonly string[] = [],
): PublicWeeklyOptionTrade[] {
  const grouped = new Map<string, OptionTradeAccumulator>();
  const publicWeekEndings = new Map<string, string>();
  expectedTradingDates.forEach((date) => {
    const weekLabel = weekEndingFriday(date);
    const existing = publicWeekEndings.get(weekLabel);
    if (!existing || existing < date) publicWeekEndings.set(weekLabel, date);
  });

  sourceTrades.forEach((trade) => {
    const key = optionTradeKey(trade);
    const weekLabel = weekEndingFriday(trade.tradeDate);
    const publicWeekEnding = publicWeekEndings.get(weekLabel) ?? weekLabel;
    const existing = grouped.get(key);
    if (existing) {
      existing.contracts += trade.contracts;
      existing.weightedFillTotal += trade.contracts * trade.fillPrice;
      return;
    }

    grouped.set(key, {
      weekEnding: publicWeekEnding,
      underlying: trade.underlying,
      expiration: trade.expiration,
      strike: trade.strike,
      right: trade.right,
      side: trade.side,
      contracts: trade.contracts,
      weightedFillTotal: trade.contracts * trade.fillPrice,
    });
  });

  return [...grouped.values()]
    .map(({ weightedFillTotal, ...trade }) => ({
      ...trade,
      averageFillPrice: roundNumber(weightedFillTotal / trade.contracts),
    }))
    .sort(
      (left, right) =>
        left.weekEnding.localeCompare(right.weekEnding) ||
        left.underlying.localeCompare(right.underlying) ||
        left.expiration.localeCompare(right.expiration) ||
        left.strike - right.strike ||
        left.right.localeCompare(right.right) ||
        left.side.localeCompare(right.side),
    );
}

export function buildPublicInvestmentPanel(sourceValue: unknown): PublicInvestmentPanel {
  const source = InvestmentSourceSnapshotSchema.parse(sourceValue);

  if (source.inceptionDate > source.asOfDate) {
    throw new InvestmentDataQualityError(
      "OUT_OF_RANGE_DATE",
      "Inception date must not be later than the public as-of date",
    );
  }

  const chartStartDate = source.chartStartDate;
  if (
    chartStartDate &&
    (chartStartDate < source.inceptionDate || chartStartDate > source.asOfDate)
  ) {
    throw new InvestmentDataQualityError(
      "OUT_OF_RANGE_DATE",
      "Chart start date must stay within the inception/as-of range",
    );
  }

  const expectedTradingDates = [...source.expectedTradingDates].sort();
  if (
    expectedTradingDates.some(
      (date) => date < source.inceptionDate || date > source.asOfDate,
    )
  ) {
    throw new InvestmentDataQualityError(
      "OUT_OF_RANGE_DATE",
      "Expected trading dates must stay within the inception/as-of range",
    );
  }
  if (expectedTradingDates.at(-1) !== source.asOfDate) {
    throw new InvestmentDataQualityError(
      "AS_OF_DATE_MISMATCH",
      "The as-of date must be the latest expected finalized trading date",
    );
  }

  if (chartStartDate) {
    const datesInChartStartWeek = expectedTradingDates.filter(
      (date) => weekEndingFriday(date) === weekEndingFriday(chartStartDate),
    );
    if (
      !expectedTradingDates.includes(chartStartDate) ||
      datesInChartStartWeek.at(-1) !== chartStartDate
    ) {
      throw new InvestmentDataQualityError(
        "OUT_OF_RANGE_DATE",
        "Chart start date must be the final expected trading day of its week",
      );
    }
  }

  const dailyPoints = normalizeDailyTwrChunks(
    source.dailyTwrChunks,
    source.expectedTradingDates,
  );
  if (
    dailyPoints.some((point) => point.date < source.inceptionDate || point.date > source.asOfDate)
  ) {
    throw new InvestmentDataQualityError(
      "OUT_OF_RANGE_DATE",
      "Daily TWR points must stay within the inception/as-of range",
    );
  }

  const performance = buildPublicPerformance(
    dailyPoints,
    source.asOfDate,
    chartStartDate,
  );
  const { grossSecuritiesMarketValueUsd, positions } = projectPositions(source.positions);

  if (
    source.optionTrades.some(
      (trade) => trade.tradeDate < source.inceptionDate || trade.tradeDate > source.asOfDate,
    )
  ) {
    throw new InvestmentDataQualityError(
      "OUT_OF_RANGE_DATE",
      "Option trades must stay within the inception/as-of range",
    );
  }

  const panel = {
    schemaVersion: PUBLIC_INVESTMENT_SCHEMA_VERSION,
    asOfDate: source.asOfDate,
    inceptionDate: source.inceptionDate,
    disclaimer: INVESTMENT_DISCLAIMER,
    grossSecuritiesMarketValueUsd,
    performance,
    positions,
    weeklyOptionTrades: aggregateWeeklyOptionTrades(
      source.optionTrades,
      source.expectedTradingDates,
    ).filter((trade) => trade.weekEnding === source.asOfDate),
  } satisfies PublicInvestmentPanel;

  assertPublicInvestmentPrivacy(panel);
  return PublicInvestmentPanelSchema.parse(panel);
}

export async function buildPublicInvestmentPanelFromAdapter(
  adapter: PrivateInvestmentSourceAdapter,
): Promise<PublicInvestmentPanel> {
  const source = await adapter.loadPublicProjectionSource();
  return buildPublicInvestmentPanel(source);
}
