import assert from "node:assert/strict";
import test from "node:test";

import { toCumulativeReturnSeries } from "../../src/lib/investment/display";

test("presents the validated portfolio index as cumulative return from a zero-percent baseline", () => {
  const displayed = toCumulativeReturnSeries([
    { weekEnding: "2026-04-03", weeklyReturnPct: 0, portfolioIndex: 100 },
    { weekEnding: "2026-04-10", weeklyReturnPct: 14.5, portfolioIndex: 114.5 },
    { weekEnding: "2026-04-17", weeklyReturnPct: -19.21, portfolioIndex: 92.5 },
  ]);

  assert.deepEqual(
    displayed.map(({ weekEnding, cumulativeReturnPct }) => ({ weekEnding, cumulativeReturnPct })),
    [
      { weekEnding: "2026-04-03", cumulativeReturnPct: 0 },
      { weekEnding: "2026-04-10", cumulativeReturnPct: 14.5 },
      { weekEnding: "2026-04-17", cumulativeReturnPct: -7.5 },
    ],
  );
});

test("does not mutate or reinterpret weekly TWR values as trade proceeds", () => {
  const source = [
    { weekEnding: "2026-09-02", weeklyReturnPct: -1.065956, portfolioIndex: 114.525179 },
  ];

  const [displayed] = toCumulativeReturnSeries(source);

  assert.equal(displayed?.weeklyReturnPct, -1.065956);
  assert.equal(displayed?.cumulativeReturnPct, 14.525179);
  assert.deepEqual(source, [
    { weekEnding: "2026-09-02", weeklyReturnPct: -1.065956, portfolioIndex: 114.525179 },
  ]);
});
