import { z } from "zod";

import { INVESTMENT_SOURCE_SCHEMA_VERSION } from "./constants";
import { IsoDateSchema } from "./schema";

const FiniteNumberSchema = z.number().finite();

export const DailyTwrPointSchema = z
  .object({
    date: IsoDateSchema,
    returnPct: FiniteNumberSchema.min(-100),
  })
  .strict();

export const InvestmentSourceOptionContractSchema = z
  .object({
    underlying: z.string().trim().min(1).max(32),
    expiration: IsoDateSchema,
    strike: FiniteNumberSchema.nonnegative(),
    right: z.enum(["call", "put"]),
    openContracts: z.number().int().positive(),
  })
  .strict();

export const InvestmentSourcePositionSchema = z
  .object({
    assetType: z.enum(["stock", "etf", "option", "other"]),
    displaySymbol: z.string().trim().min(1).max(80),
    direction: z.enum(["long", "short"]),
    marketValueUsd: FiniteNumberSchema,
    option: InvestmentSourceOptionContractSchema.optional(),
  })
  .strict()
  .superRefine((position, context) => {
    if (position.marketValueUsd > 0 && position.direction !== "long") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["direction"],
        message: "Positive market value must be normalized as a long position",
      });
    }

    if (position.marketValueUsd < 0 && position.direction !== "short") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["direction"],
        message: "Negative market value must be normalized as a short position",
      });
    }

    if (position.assetType === "option" && !position.option) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["option"],
        message: "Normalized option positions require contract details",
      });
    }

    if (position.assetType !== "option" && position.option) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["option"],
        message: "Non-option positions cannot carry option contract details",
      });
    }
  });

export const InvestmentSourceOptionTradeSchema = z
  .object({
    tradeDate: IsoDateSchema,
    underlying: z.string().trim().min(1).max(32),
    expiration: IsoDateSchema,
    strike: FiniteNumberSchema.nonnegative(),
    right: z.enum(["call", "put"]),
    side: z.enum(["buy", "sell"]),
    contracts: z.number().int().positive(),
    fillPrice: FiniteNumberSchema.nonnegative(),
  })
  .strict();

export const InvestmentSourceSnapshotSchema = z
  .object({
    schemaVersion: z.literal(INVESTMENT_SOURCE_SCHEMA_VERSION),
    asOfDate: IsoDateSchema,
    inceptionDate: IsoDateSchema,
    chartStartDate: IsoDateSchema.optional(),
    expectedTradingDates: z.array(IsoDateSchema).min(1),
    dailyTwrChunks: z.array(z.array(DailyTwrPointSchema).min(1)).min(1),
    positions: z.array(InvestmentSourcePositionSchema),
    optionTrades: z.array(InvestmentSourceOptionTradeSchema),
  })
  .strict();

export type DailyTwrPoint = z.infer<typeof DailyTwrPointSchema>;
export type InvestmentSourcePosition = z.infer<typeof InvestmentSourcePositionSchema>;
export type InvestmentSourceOptionTrade = z.infer<typeof InvestmentSourceOptionTradeSchema>;
export type InvestmentSourceSnapshot = z.infer<typeof InvestmentSourceSnapshotSchema>;

/**
 * Boundary implemented by the private IB Gateway/Flex integration.
 *
 * The adapter must map raw private data into the strict normalized source schema.
 * It intentionally has no order methods and carries no account IDs, cash, margin,
 * credentials, raw payloads, share quantities, or stock cost basis.
 */
export interface PrivateInvestmentSourceAdapter {
  loadPublicProjectionSource(): Promise<unknown>;
}
