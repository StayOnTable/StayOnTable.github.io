import { roundNumber } from "./date";

type IndexedPerformancePoint = {
  weekEnding: string;
  weeklyReturnPct: number;
  portfolioIndex: number;
};

export type CumulativePerformancePoint = IndexedPerformancePoint & {
  cumulativeReturnPct: number;
};

/**
 * The public contract keeps a normalized index so compounding can be validated
 * deterministically. The interface presents the same series as return from the
 * recording baseline: index 100 becomes 0%, 114.5 becomes +14.5%, and so on.
 */
export function toCumulativeReturnSeries(
  series: readonly IndexedPerformancePoint[],
): CumulativePerformancePoint[] {
  return series.map((point) => ({
    ...point,
    cumulativeReturnPct: roundNumber(point.portfolioIndex - 100),
  }));
}
