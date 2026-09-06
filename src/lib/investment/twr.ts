import { roundNumber, weekEndingFriday } from "./date";
import { INVESTMENT_PUBLIC_HISTORY_START_DATE } from "./constants";
import { DailyTwrPointSchema, type DailyTwrPoint } from "./source";

export type InvestmentDataQualityCode =
  | "DUPLICATE_TWR_CONFLICT"
  | "TWR_COVERAGE_MISMATCH"
  | "OUT_OF_RANGE_DATE"
  | "AS_OF_DATE_MISMATCH"
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

/** De-duplicate a plugin TWR series and return it in ascending date order. */
export function normalizeDailyTwrPoints(points: readonly DailyTwrPoint[]): DailyTwrPoint[] {
  const byDate = new Map<string, DailyTwrPoint>();
  points.forEach((rawPoint) => {
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
  return [...byDate.values()].sort((left, right) => left.date.localeCompare(right.date));
}

export function compoundReturnPct(points: readonly DailyTwrPoint[]): number {
  const factor = points.reduce((product, point) => product * (1 + point.returnPct / 100), 1);
  return roundNumber((factor - 1) * 100);
}

export type PublicPerformance = {
  measure: "twr";
  coverageStartDate: string;
  coverageEndDate: string;
  weeklyReturnPct: number;
  monthlyReturnPct: number | null;
  quarterlyReturnPct: number | null;
  weeklySeries: Array<{
    weekEnding: string;
    weeklyReturnPct: number;
    portfolioIndex: number;
  }>;
};

function currentMonthStart(asOfDate: string): string {
  return `${asOfDate.slice(0, 7)}-01`;
}

function currentQuarterStart(asOfDate: string): string {
  const year = asOfDate.slice(0, 4);
  const month = Number(asOfDate.slice(5, 7));
  const quarterMonth = Math.floor((month - 1) / 3) * 3 + 1;
  return `${year}-${String(quarterMonth).padStart(2, "0")}-01`;
}

function periodReturnOrNull(
  points: readonly DailyTwrPoint[],
  sourceCoverageStartDate: string,
  periodStartDate: string,
): number | null {
  if (sourceCoverageStartDate > periodStartDate) return null;
  const periodPoints = points.filter((point) => point.date >= periodStartDate);
  return periodPoints.length > 0 ? compoundReturnPct(periodPoints) : null;
}

/**
 * Build the public TWR view from normalized interval returns. The public chart
 * starts no earlier than the fixed site record date (2026-04-01); if the
 * plugin exposes less history, the first actually available point becomes the
 * start instead. The boundary does not reset in a later calendar year.
 */
export function buildPublicPerformance(
  rawPoints: readonly DailyTwrPoint[],
  sourceCoverageStartDate: string,
  coverageEndDate: string,
): PublicPerformance {
  const sourcePoints = normalizeDailyTwrPoints(rawPoints);
  if (
    sourcePoints.length === 0 ||
    sourcePoints[0]?.date !== sourceCoverageStartDate ||
    sourcePoints.at(-1)?.date !== coverageEndDate
  ) {
    throw new InvestmentDataQualityError(
      "TWR_COVERAGE_MISMATCH",
      "The first and last plugin TWR dates must match the declared source coverage",
    );
  }
  if (
    sourcePoints.some(
      (point) => point.date < sourceCoverageStartDate || point.date > coverageEndDate,
    )
  ) {
    throw new InvestmentDataQualityError(
      "OUT_OF_RANGE_DATE",
      "Plugin TWR points must stay inside the declared source coverage",
    );
  }

  const points = sourcePoints.filter(
    (point) => point.date >= INVESTMENT_PUBLIC_HISTORY_START_DATE,
  );
  const coverageStartDate = points[0]?.date;
  if (!coverageStartDate) {
    throw new InvestmentDataQualityError(
      "TWR_COVERAGE_MISMATCH",
      `No plugin TWR points are available on or after ${INVESTMENT_PUBLIC_HISTORY_START_DATE}`,
    );
  }

  const weeklyGroups = new Map<string, DailyTwrPoint[]>();
  points.forEach((point) => {
    const week = weekEndingFriday(point.date);
    const group = weeklyGroups.get(week) ?? [];
    group.push(point);
    weeklyGroups.set(week, group);
  });

  let portfolioIndex = 100;
  const weeklySeries = [...weeklyGroups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, weekPoints]) => {
      weekPoints.sort((left, right) => left.date.localeCompare(right.date));
      const weeklyReturnPct = compoundReturnPct(weekPoints);
      portfolioIndex = roundNumber(portfolioIndex * (1 + weeklyReturnPct / 100));
      return {
        weekEnding: weekPoints.at(-1)?.date ?? coverageEndDate,
        weeklyReturnPct,
        portfolioIndex,
      };
    });

  const finalPoint = weeklySeries.at(-1);
  if (!finalPoint) {
    throw new InvestmentDataQualityError(
      "TWR_COVERAGE_MISMATCH",
      "At least one public weekly TWR point is required",
    );
  }

  return {
    measure: "twr",
    coverageStartDate,
    coverageEndDate,
    weeklyReturnPct: finalPoint.weeklyReturnPct,
    monthlyReturnPct: periodReturnOrNull(
      sourcePoints,
      sourceCoverageStartDate,
      currentMonthStart(coverageEndDate),
    ),
    quarterlyReturnPct: periodReturnOrNull(
      sourcePoints,
      sourceCoverageStartDate,
      currentQuarterStart(coverageEndDate),
    ),
    weeklySeries,
  };
}
