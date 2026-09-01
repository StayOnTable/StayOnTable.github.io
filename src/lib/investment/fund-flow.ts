import { roundNumber } from "./date";
import { InvestmentDataQualityError } from "./twr";

export type ExternalFlowTiming = "start" | "end";

export type FlowAdjustedReturnInput = {
  openingValueUsd: number;
  closingValueUsd: number;
  netExternalFlowUsd: number;
  flowTiming: ExternalFlowTiming;
};

/**
 * Deterministic adapter-side helper for a valuation period with an external
 * deposit or withdrawal at a known boundary. Prefer IBKR's finalized TWR when
 * available. These private valuation/flow inputs must never enter the public DTO.
 */
export function calculateFlowAdjustedReturnPct(input: FlowAdjustedReturnInput): number {
  const values = [input.openingValueUsd, input.closingValueUsd, input.netExternalFlowUsd];
  if (!values.every(Number.isFinite) || input.openingValueUsd <= 0) {
    throw new InvestmentDataQualityError(
      "INVALID_FLOW_VALUATION",
      "Flow-adjusted return requires finite values and a positive opening valuation",
    );
  }

  if (input.flowTiming === "start") {
    const investedOpeningValue = input.openingValueUsd + input.netExternalFlowUsd;
    if (investedOpeningValue <= 0) {
      throw new InvestmentDataQualityError(
        "INVALID_FLOW_VALUATION",
        "A start-of-period flow must leave a positive invested opening valuation",
      );
    }
    return roundNumber((input.closingValueUsd / investedOpeningValue - 1) * 100);
  }

  const closingValueBeforeFlow = input.closingValueUsd - input.netExternalFlowUsd;
  return roundNumber((closingValueBeforeFlow / input.openingValueUsd - 1) * 100);
}
