import { roundNumber, weekEndingFriday } from "./date";
import { DailyTwrPointSchema, type DailyTwrPoint } from "./source";

export type InvestmentDataQualityCode =
  | "DUPLICATE_TWR_CONFLICT"
  | "DUPLICATE_EXPECTED_DATE"
  | "MISSING_TRADING_DATES"
  | "AS_OF_DATE_MISMATCH"
  | "OUT_OF_RANGE_DATE"
  | "INVALID_FLOW_VALUATION";

export class InvestmentDataQualityError extends Error {
  constructor(
    readonly code: InvestmentDataQualityCode,
    message: string,
  ) {
    super(message);
    this.name = "InvestmentDataQualityError";
  }
}

function validateExpectedDates(expectedTradingDates: readonly string[]): string[] {
  const seen = new Set<string>();
  for (const date of expectedTradingDates) {
    if (seen.has(date)) {
      throw new InvestmentDataQualityError(
        "DUPLICATE_EXPECTED_DATE",
        `Expected trading calendar repeats ${date}`,
      );
    }
    seen.add(date);
  }
  return [...seen].sort();
}

/**
 * Merges overlapping Flex date chunks. Identical overlap rows are de-duplicated;
 * conflicting rows fail closed so a return is never compounded twice.
 */
export function normalizeDailyTwrChunks(
  chunks: readonly (readonly DailyTwrPoint[])[],
  expectedTradingDates: readonly string[],
): DailyTwrPoint[] {
  const byDate = new Map<string, DailyTwrPoint>();

  chunks.forEach((chunk) => {
    chunk.forEach((rawPoint) => {
      const point = DailyTwrPointSchema.parse(rawPoint);
      const existing = byDate.get(point.date);
      if (existing && Math.abs(existing.returnPct - point.returnPct) > 0.000000001) {
        throw new InvestmentDataQualityError(
          "DUPLICATE_TWR_CONFLICT",
          `Conflicting TWR values were supplied for ${point.date}`,
        );
      }
      byDate.set(point.date, point);
    });
  });

  const expected = validateExpectedDates(expectedTradingDates);
  const missing = expected.filter((date) => !byDate.has(date));
  if (missing.length > 0) {
    throw new InvestmentDataQualityError(
      "MISSING_TRADING_DATES",
      `Missing finalized daily TWR for: ${missing.join(", ")}`,
    );
  }

  return [...byDate.values()].sort((left, right) => left.date.localeCompare(right.date));
}

export function compoundReturnPct(points: readonly DailyTwrPoint[]): number {
  const factor = points.reduce((product, point) => product * (1 + point.returnPct / 100), 1);
  return roundNumber((factor - 1) * 100);
}

export type PublicPerformance = {
  weeklyReturnPct: number;
  ytdReturnPct: number;
  sinceInceptionReturnPct: number;
  maxDrawdownPct: number;
  weeklySeries: Array<{
    weekEnding: string;
    weeklyReturnPct: number;
    portfolioIndex: number;
  }>;
};

export function buildPublicPerformance(
  dailyPoints: readonly DailyTwrPoint[],
  asOfDate: string,
  chartStartDate?: string,
): PublicPerformance {
  const points = [...dailyPoints].sort((left, right) => left.date.localeCompare(right.date));
  if (points.length === 0 || points.at(-1)?.date !== asOfDate) {
    throw new InvestmentDataQualityError(
      "AS_OF_DATE_MISMATCH",
      "The latest finalized daily TWR date must equal the public as-of date",
    );
  }

  const chartPoints = chartStartDate
    ? points.filter((point) => point.date > chartStartDate)
    : points;
  const weeklyGroups = new Map<string, DailyTwrPoint[]>();
  chartPoints.forEach((point) => {
    const weekEnding = weekEndingFriday(point.date);
    const current = weeklyGroups.get(weekEnding) ?? [];
    current.push(point);
    weeklyGroups.set(weekEnding, current);
  });

  let portfolioIndex = 100;
  const weeklySeries: PublicPerformance["weeklySeries"] = chartStartDate
    ? [{ weekEnding: chartStartDate, weeklyReturnPct: 0, portfolioIndex: 100 }]
    : [];
  weeklySeries.push(
    ...[...weeklyGroups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, weekPoints]) => {
      weekPoints.sort((left, right) => left.date.localeCompare(right.date));
      const weekEnding = weekPoints.at(-1)?.date ?? asOfDate;
      const weeklyReturnPct = compoundReturnPct(weekPoints);
      portfolioIndex = roundNumber(portfolioIndex * (1 + weeklyReturnPct / 100));
      return { weekEnding, weeklyReturnPct, portfolioIndex };
    }),
  );

  let dailyIndex = 100;
  let peakIndex = 100;
  let maxDrawdownPct = 0;
  points.forEach((point) => {
    dailyIndex *= 1 + point.returnPct / 100;
    peakIndex = Math.max(peakIndex, dailyIndex);
    const drawdown = peakIndex === 0 ? -100 : (dailyIndex / peakIndex - 1) * 100;
    maxDrawdownPct = Math.min(maxDrawdownPct, drawdown);
  });

  const asOfYear = asOfDate.slice(0, 4);
  const ytdPoints = points.filter((point) => point.date.startsWith(`${asOfYear}-`));
  const finalPoint = weeklySeries.at(-1);

  return {
    weeklyReturnPct: finalPoint?.weeklyReturnPct ?? 0,
    ytdReturnPct: compoundReturnPct(ytdPoints),
    sinceInceptionReturnPct: compoundReturnPct(points),
    maxDrawdownPct: roundNumber(maxDrawdownPct),
    weeklySeries,
  };
}
