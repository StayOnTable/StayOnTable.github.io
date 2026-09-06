import { z } from "zod";

import {
  INVESTMENT_DISCLAIMER,
  INVESTMENT_PUBLIC_CURRENCY,
  INVESTMENT_PUBLIC_HISTORY_START_DATE,
  PUBLIC_INVESTMENT_SCHEMA_VERSION,
} from "./constants";
import { isIsoDate, roundNumber } from "./date";

export const IsoDateSchema = z
  .string()
  .refine(isIsoDate, "Expected a real calendar date in YYYY-MM-DD format");

const FiniteNumberSchema = z.number().finite();
const PositiveFiniteNumberSchema = FiniteNumberSchema.positive();
export const PublicAssetTypeSchema = z.enum(["stock-or-etf", "option", "other"]);

const AlwaysPrivatePositionLabelPattern =
  /(?:\b(?:MARGIN|BUYING\s*POWER|NET\s*(?:LIQUIDATION|ASSET\s*VALUE)|NLV|ACCOUNT\s*(?:VALUE|EQUITY)|LOAN|BORROW(?:ED|ING)?)\b|保证金|购买力|净清算|账户权益|借款|融资)/i;
const CashLikePositionLabelPattern =
  /(?:\b(?:USD|BASE|CURRENCY|FX)?\s*CASH(?:\s*BALANCE)?\b|\b(?:USD|BASE)\s+CURRENCY\b|现金)/i;
const OptionUnderlyingOnlyPattern = /^[a-z0-9][a-z0-9.\-/:]{0,23}$/i;
const OptionContractDetailPattern = /\d{6}[cp]\d{8}/i;

/** Public option labels must be the underlying only, never a contract description. */
export function isPublicOptionUnderlyingSymbol(value: string): boolean {
  const symbol = value.trim();
  return (
    OptionUnderlyingOnlyPattern.test(symbol) &&
    !OptionContractDetailPattern.test(symbol)
  );
}

export const PublicPositionSchema = z
  .object({
    assetType: PublicAssetTypeSchema,
    displaySymbol: z.string().trim().min(1).max(120),
    direction: z.enum(["long", "short"]),
    allocationPct: PositiveFiniteNumberSchema.max(100),
  })
  .strict()
  .superRefine((position, context) => {
    if (
      AlwaysPrivatePositionLabelPattern.test(position.displaySymbol) ||
      (position.assetType === "other" && CashLikePositionLabelPattern.test(position.displaySymbol))
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["displaySymbol"],
        message: "Public positions cannot represent cash, financing, margin, or account equity",
      });
    }
    if (
      position.assetType === "option" &&
      !isPublicOptionUnderlyingSymbol(position.displaySymbol)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["displaySymbol"],
        message: "Public option labels must contain the underlying symbol only",
      });
    }
  });

export const PublicWeeklyTradeSchema = z
  .object({
    tradeDate: IsoDateSchema,
    assetType: PublicAssetTypeSchema,
    displaySymbol: z.string().trim().min(1).max(120),
    side: z.enum(["buy", "sell"]),
    amountAbsUsd: PositiveFiniteNumberSchema,
    fillCount: z.number().int().positive(),
  })
  .strict()
  .superRefine((trade, context) => {
    if (
      trade.assetType === "option" &&
      !isPublicOptionUnderlyingSymbol(trade.displaySymbol)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["displaySymbol"],
        message: "Public option labels must contain the underlying symbol only",
      });
    }
  });

export const PublicWeeklyPerformancePointSchema = z
  .object({
    weekEnding: IsoDateSchema,
    weeklyReturnPct: FiniteNumberSchema.min(-100),
    portfolioIndex: PositiveFiniteNumberSchema,
  })
  .strict();

const NullableReturnSchema = FiniteNumberSchema.min(-100).nullable();

export const PublicInvestmentPanelSchema = z
  .object({
    schemaVersion: z.literal(PUBLIC_INVESTMENT_SCHEMA_VERSION),
    publicationStatus: z.enum(["preview", "published"]),
    source: z.literal("ibkr-readonly-plugin"),
    currency: z.literal(INVESTMENT_PUBLIC_CURRENCY),
    asOfDate: IsoDateSchema,
    disclaimer: z.literal(INVESTMENT_DISCLAIMER),
    dataDates: z
      .object({
        positionsAsOf: IsoDateSchema,
        tradesFrom: IsoDateSchema,
        tradesThrough: IsoDateSchema,
      })
      .strict(),
    performance: z
      .object({
        measure: z.literal("twr"),
        coverageStartDate: IsoDateSchema,
        coverageEndDate: IsoDateSchema,
        weeklyReturnPct: FiniteNumberSchema.min(-100),
        monthlyReturnPct: NullableReturnSchema,
        quarterlyReturnPct: NullableReturnSchema,
        weeklySeries: z.array(PublicWeeklyPerformancePointSchema).min(1),
      })
      .strict(),
    positions: z.array(PublicPositionSchema),
    weeklyTrades: z.array(PublicWeeklyTradeSchema),
  })
  .strict()
  .superRefine((panel, context) => {
    if (panel.performance.coverageStartDate > panel.performance.coverageEndDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["performance", "coverageStartDate"],
        message: "Performance coverage start must not be later than its end",
      });
    }

    if (panel.performance.coverageStartDate < INVESTMENT_PUBLIC_HISTORY_START_DATE) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["performance", "coverageStartDate"],
        message: `Public performance history must not begin before ${INVESTMENT_PUBLIC_HISTORY_START_DATE}`,
      });
    }

    if (panel.dataDates.tradesFrom > panel.dataDates.tradesThrough) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dataDates", "tradesFrom"],
        message: "Trade coverage start must not be later than its end",
      });
    }

    const latestSectionDate = [
      panel.performance.coverageEndDate,
      panel.dataDates.positionsAsOf,
      panel.dataDates.tradesThrough,
    ].sort().at(-1);
    if (latestSectionDate !== panel.asOfDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["asOfDate"],
        message: "As-of date must equal the latest section data date",
      });
    }

    let previousWeek = "";
    let expectedIndex = 100;
    panel.performance.weeklySeries.forEach((point, index) => {
      if (point.weekEnding <= previousWeek) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["performance", "weeklySeries", index, "weekEnding"],
          message: "Weekly performance dates must be unique and strictly increasing",
        });
      }
      if (
        point.weekEnding < panel.performance.coverageStartDate ||
        point.weekEnding > panel.performance.coverageEndDate
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["performance", "weeklySeries", index, "weekEnding"],
          message: "Weekly performance must stay inside the declared coverage",
        });
      }

      expectedIndex = roundNumber(expectedIndex * (1 + point.weeklyReturnPct / 100));
      if (Math.abs(point.portfolioIndex - expectedIndex) > 0.0001) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["performance", "weeklySeries", index, "portfolioIndex"],
          message: "Portfolio index must compound the published weekly returns from 100",
        });
      }
      previousWeek = point.weekEnding;
    });

    const finalPoint = panel.performance.weeklySeries.at(-1);
    if (finalPoint) {
      if (finalPoint.weekEnding !== panel.performance.coverageEndDate) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["performance", "weeklySeries"],
          message: "The latest weekly performance date must equal the coverage end date",
        });
      }
      if (Math.abs(finalPoint.weeklyReturnPct - panel.performance.weeklyReturnPct) > 0.000001) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["performance", "weeklyReturnPct"],
          message: "Headline weekly return must equal the latest weekly-series return",
        });
      }
    }

    const positionKeys = new Set<string>();
    panel.positions.forEach((position, index) => {
      const key = [position.assetType, position.displaySymbol, position.direction].join("|");
      if (positionKeys.has(key)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["positions", index],
          message: "Public positions must be unique by their full public identity",
        });
      }
      positionKeys.add(key);
    });
    if (panel.positions.length > 0) {
      const allocationTotal = panel.positions.reduce(
        (sum, position) => sum + position.allocationPct,
        0,
      );
      if (Math.abs(allocationTotal - 100) > 0.001) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["positions"],
          message: "Public USD position allocations must sum to 100",
        });
      }
    }

    const tradeKeys = new Set<string>();
    panel.weeklyTrades.forEach((trade, index) => {
      if (
        trade.tradeDate < panel.dataDates.tradesFrom ||
        trade.tradeDate > panel.dataDates.tradesThrough
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["weeklyTrades", index, "tradeDate"],
          message: "Published trades must stay inside the declared trade window",
        });
      }
      const key = [trade.tradeDate, trade.assetType, trade.displaySymbol, trade.side].join("|");
      if (tradeKeys.has(key)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["weeklyTrades", index],
          message: "Weekly trades must be unique by the full public aggregate key",
        });
      }
      tradeKeys.add(key);
    });
  });

export type PublicInvestmentPanel = z.infer<typeof PublicInvestmentPanelSchema>;
export type PublicPosition = z.infer<typeof PublicPositionSchema>;
export type PublicWeeklyTrade = z.infer<typeof PublicWeeklyTradeSchema>;
