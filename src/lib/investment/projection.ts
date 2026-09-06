import {
  INVESTMENT_DISCLAIMER,
  INVESTMENT_PUBLIC_CURRENCY,
  PUBLIC_INVESTMENT_SCHEMA_VERSION,
} from "./constants";
import { roundNumber } from "./date";
import { assertPublicInvestmentPrivacy } from "./privacy";
import {
  PublicInvestmentPanelSchema,
  type PublicInvestmentPanel,
  type PublicPosition,
  type PublicWeeklyTrade,
} from "./schema";
import {
  InvestmentSourceSnapshotSchema,
  type InvestmentSourcePosition,
  type InvestmentSourceTradeFill,
  type PrivateInvestmentSourceAdapter,
} from "./source";
import { InvestmentDataQualityError, buildPublicPerformance } from "./twr";

type PositionAccumulator = Omit<PublicPosition, "allocationPct"> & {
  amountAbsUsd: number;
};

function positionKey(position: InvestmentSourcePosition): string {
  return JSON.stringify([
    position.assetType,
    position.displaySymbol,
    position.direction,
  ]);
}

function projectPositions(sourcePositions: readonly InvestmentSourcePosition[]): PublicPosition[] {
  const grouped = new Map<string, PositionAccumulator>();
  sourcePositions.forEach((position) => {
    const amountAbsUsd = Math.abs(position.marketValue.signedAmount);
    if (amountAbsUsd === 0) return;

    const key = positionKey(position);
    const existing = grouped.get(key);
    if (existing) {
      existing.amountAbsUsd += amountAbsUsd;
      return;
    }
    grouped.set(key, {
      assetType: position.assetType,
      displaySymbol: position.displaySymbol,
      direction: position.direction,
      amountAbsUsd,
    });
  });

  const projected = [...grouped.values()].sort(
    (left, right) =>
      right.amountAbsUsd - left.amountAbsUsd ||
      left.displaySymbol.localeCompare(right.displaySymbol) ||
      left.direction.localeCompare(right.direction),
  );
  const total = projected.reduce((sum, position) => sum + position.amountAbsUsd, 0);
  let allocated = 0;

  return projected.map(({ amountAbsUsd, ...position }, index) => {
    const allocationPct =
      index === projected.length - 1
        ? roundNumber(100 - allocated)
        : roundNumber((amountAbsUsd / total) * 100);
    allocated = roundNumber(allocated + allocationPct);
    return { ...position, allocationPct };
  });
}

type WeeklyTradeAccumulator = Omit<PublicWeeklyTrade, "amountAbsUsd" | "fillCount"> & {
  amountAbsUsd: number;
  fillCount: number;
};

function tradeKey(fill: InvestmentSourceTradeFill): string {
  return JSON.stringify([
    fill.tradeDate,
    fill.assetType,
    fill.displaySymbol,
    fill.side,
  ]);
}

export function aggregateWeeklyTrades(
  sourceFills: readonly InvestmentSourceTradeFill[],
): PublicWeeklyTrade[] {
  const grouped = new Map<string, WeeklyTradeAccumulator>();
  sourceFills.forEach((fill) => {
    const key = tradeKey(fill);
    const existing = grouped.get(key);
    if (existing) {
      existing.fillCount += 1;
      existing.amountAbsUsd += fill.amountAbsUsd;
      return;
    }

    grouped.set(key, {
      tradeDate: fill.tradeDate,
      assetType: fill.assetType,
      displaySymbol: fill.displaySymbol,
      side: fill.side,
      amountAbsUsd: fill.amountAbsUsd,
      fillCount: 1,
    });
  });

  return [...grouped.values()]
    .map((trade) => ({
      ...trade,
      amountAbsUsd: roundNumber(trade.amountAbsUsd, 2),
    }))
    .sort(
      (left, right) =>
        right.tradeDate.localeCompare(left.tradeDate) ||
        left.displaySymbol.localeCompare(right.displaySymbol) ||
        left.side.localeCompare(right.side),
    );
}

export function buildPublicInvestmentPanel(sourceValue: unknown): PublicInvestmentPanel {
  const source = InvestmentSourceSnapshotSchema.parse(sourceValue);
  const sectionDates = [
    source.performance.coverageEndDate,
    source.dataDates.positionsAsOf,
    source.dataDates.tradesThrough,
  ];
  if (sectionDates.sort().at(-1) !== source.asOfDate) {
    throw new InvestmentDataQualityError(
      "AS_OF_DATE_MISMATCH",
      "The source as-of date must equal the latest section data date",
    );
  }
  if (source.dataDates.tradesFrom > source.dataDates.tradesThrough) {
    throw new InvestmentDataQualityError(
      "OUT_OF_RANGE_DATE",
      "Trade coverage start must not be later than its end",
    );
  }
  if (
    source.tradeFills.some(
      (fill) =>
        fill.tradeDate < source.dataDates.tradesFrom ||
        fill.tradeDate > source.dataDates.tradesThrough,
    )
  ) {
    throw new InvestmentDataQualityError(
      "OUT_OF_RANGE_DATE",
      "Trade fills must stay inside the declared public trade window",
    );
  }

  const performance = buildPublicPerformance(
    source.performance.dailyTwr,
    source.performance.coverageStartDate,
    source.performance.coverageEndDate,
  );

  const panel = {
    schemaVersion: PUBLIC_INVESTMENT_SCHEMA_VERSION,
    publicationStatus: source.publicationStatus,
    source: "ibkr-readonly-plugin",
    currency: INVESTMENT_PUBLIC_CURRENCY,
    asOfDate: source.asOfDate,
    disclaimer: INVESTMENT_DISCLAIMER,
    dataDates: { ...source.dataDates },
    performance,
    positions: projectPositions(source.positions),
    weeklyTrades: aggregateWeeklyTrades(source.tradeFills),
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
