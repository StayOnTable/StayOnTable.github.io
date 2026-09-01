import { z } from "zod";

import {
  INVESTMENT_DISCLAIMER,
  PUBLIC_INVESTMENT_SCHEMA_VERSION,
} from "./constants";
import { isIsoDate, roundNumber } from "./date";

export const IsoDateSchema = z
  .string()
  .refine(isIsoDate, "Expected a real calendar date in YYYY-MM-DD format");

const FiniteNumberSchema = z.number().finite();
const NonNegativeFiniteNumberSchema = FiniteNumberSchema.nonnegative();
const AlwaysPrivatePositionLabelPattern =
  /(?:\b(?:MARGIN|BUYING\s*POWER|NET\s*(?:LIQUIDATION|ASSET\s*VALUE)|NLV|ACCOUNT\s*(?:VALUE|EQUITY)|LOAN|BORROW(?:ED|ING)?)\b|保证金|购买力|净清算|账户权益|借款|融资)/i;
const CashLikePositionLabelPattern =
  /(?:\b(?:USD|BASE|CURRENCY|FX)?\s*CASH(?:\s*BALANCE)?\b|\b(?:USD|BASE)\s+CURRENCY\b|现金)/i;

export const PublicOptionContractSchema = z
  .object({
    underlying: z.string().trim().min(1).max(32),
    expiration: IsoDateSchema,
    strike: NonNegativeFiniteNumberSchema,
    right: z.enum(["call", "put"]),
    openContracts: z.number().int().positive(),
  })
  .strict();

export const PublicPositionSchema = z
  .object({
    assetType: z.enum(["stock", "etf", "option", "other"]),
    displaySymbol: z.string().trim().min(1).max(80),
    direction: z.enum(["long", "short"]),
    marketValueAbsUsd: NonNegativeFiniteNumberSchema,
    allocationPct: FiniteNumberSchema.min(0).max(100),
    option: PublicOptionContractSchema.optional(),
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

    if (position.assetType === "option" && !position.option) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["option"],
        message: "Option positions must include public contract details",
      });
    }

    if (position.assetType !== "option" && position.option) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["option"],
        message: "Only option positions may include option contract details",
      });
    }
  });

export const PublicWeeklyOptionTradeSchema = z
  .object({
    weekEnding: IsoDateSchema,
    underlying: z.string().trim().min(1).max(32),
    expiration: IsoDateSchema,
    strike: NonNegativeFiniteNumberSchema,
    right: z.enum(["call", "put"]),
    side: z.enum(["buy", "sell"]),
    contracts: z.number().int().positive(),
    averageFillPrice: NonNegativeFiniteNumberSchema,
  })
  .strict();

export const PublicWeeklyPerformancePointSchema = z
  .object({
    weekEnding: IsoDateSchema,
    weeklyReturnPct: FiniteNumberSchema.min(-100),
    portfolioIndex: FiniteNumberSchema.positive(),
  })
  .strict();

export const PublicInvestmentPanelSchema = z
  .object({
    schemaVersion: z.literal(PUBLIC_INVESTMENT_SCHEMA_VERSION),
    asOfDate: IsoDateSchema,
    inceptionDate: IsoDateSchema,
    disclaimer: z.literal(INVESTMENT_DISCLAIMER),
    grossSecuritiesMarketValueUsd: NonNegativeFiniteNumberSchema,
    performance: z
      .object({
        weeklyReturnPct: FiniteNumberSchema.min(-100),
        ytdReturnPct: FiniteNumberSchema.min(-100),
        sinceInceptionReturnPct: FiniteNumberSchema.min(-100),
        maxDrawdownPct: FiniteNumberSchema.min(-100).max(0),
        weeklySeries: z.array(PublicWeeklyPerformancePointSchema).min(1),
      })
      .strict(),
    positions: z.array(PublicPositionSchema),
    weeklyOptionTrades: z.array(PublicWeeklyOptionTradeSchema),
  })
  .strict()
  .superRefine((panel, context) => {
    if (panel.inceptionDate > panel.asOfDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["inceptionDate"],
        message: "Inception date must not be later than the as-of date",
      });
    }

    const grossFromPositions = roundNumber(
      panel.positions.reduce((sum, position) => sum + position.marketValueAbsUsd, 0),
      2,
    );
    if (Math.abs(grossFromPositions - panel.grossSecuritiesMarketValueUsd) > 0.01) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["grossSecuritiesMarketValueUsd"],
        message: "Gross securities value must equal the sum of absolute public position values",
      });
    }

    const allocationTotal = panel.positions.reduce(
      (sum, position) => sum + position.allocationPct,
      0,
    );
    const expectedAllocationTotal = panel.grossSecuritiesMarketValueUsd > 0 ? 100 : 0;
    if (Math.abs(allocationTotal - expectedAllocationTotal) > 0.001) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["positions"],
        message: `Public allocations must sum to ${expectedAllocationTotal}`,
      });
    }

    if (panel.grossSecuritiesMarketValueUsd > 0) {
      panel.positions.forEach((position, index) => {
        const expectedAllocation =
          (position.marketValueAbsUsd / panel.grossSecuritiesMarketValueUsd) * 100;
        if (Math.abs(position.allocationPct - expectedAllocation) > 0.001) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["positions", index, "allocationPct"],
            message: "Allocation must be normalized from public absolute market values",
          });
        }
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
      if (point.weekEnding > panel.asOfDate) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["performance", "weeklySeries", index, "weekEnding"],
          message: "Weekly performance cannot be later than the as-of date",
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
      if (finalPoint.weekEnding !== panel.asOfDate) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["performance", "weeklySeries"],
          message: "The latest weekly performance date must equal the public as-of date",
        });
      }

      if (
        Math.abs(finalPoint.weeklyReturnPct - panel.performance.weeklyReturnPct) > 0.000001
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["performance", "weeklyReturnPct"],
          message: "Headline weekly return must equal the latest weekly-series return",
        });
      }

    }

    const optionTradeKeys = new Set<string>();
    panel.weeklyOptionTrades.forEach((trade, index) => {
      const aggregateKey = JSON.stringify([
        trade.weekEnding,
        trade.underlying,
        trade.expiration,
        trade.strike,
        trade.right,
        trade.side,
      ]);
      if (optionTradeKeys.has(aggregateKey)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["weeklyOptionTrades", index],
          message: "Weekly option trades must be unique by the full public aggregate key",
        });
      }
      optionTradeKeys.add(aggregateKey);

      if (trade.weekEnding !== panel.asOfDate) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["weeklyOptionTrades", index, "weekEnding"],
          message: "Published option trades must belong to the current as-of week",
        });
      }
    });
  });

export type PublicInvestmentPanel = z.infer<typeof PublicInvestmentPanelSchema>;
export type PublicPosition = z.infer<typeof PublicPositionSchema>;
export type PublicWeeklyOptionTrade = z.infer<typeof PublicWeeklyOptionTradeSchema>;
