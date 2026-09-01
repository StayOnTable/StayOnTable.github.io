import {
  INVESTMENT_DISCLAIMER,
  INVESTMENT_SHORT_DISCLAIMER,
} from "@/lib/investment";

export { INVESTMENT_DISCLAIMER };

type InvestmentDisclaimerProps = {
  compact?: boolean;
  marker?: "start" | "end";
};

export function InvestmentDisclaimer({
  compact = false,
  marker,
}: InvestmentDisclaimerProps) {
  return (
    <p
      className="investment-disclaimer"
      data-compact={compact}
      data-investment-disclaimer-marker={marker}
      role="note"
    >
      {compact ? INVESTMENT_SHORT_DISCLAIMER : INVESTMENT_DISCLAIMER}
    </p>
  );
}
