import { z } from "zod";

import { INVESTMENT_SOURCE_SCHEMA_VERSION } from "./constants";
import {
  IsoDateSchema,
  PublicAssetTypeSchema,
  isPublicOptionUnderlyingSymbol,
} from "./schema";

const FiniteNumberSchema = z.number().finite();

export const DailyTwrPointSchema = z
  .object({
    date: IsoDateSchema,
    returnPct: FiniteNumberSchema.min(-100),
  })
  .strict();

export const InvestmentSourcePositionSchema = z
  .object({
    assetType: PublicAssetTypeSchema,
    displaySymbol: z.string().trim().min(1).max(120),
    direction: z.enum(["long", "short"]),
    marketValue: z
      .object({
        currency: z.literal("USD"),
        signedAmount: FiniteNumberSchema,
      })
      .strict(),
  })
  .strict()
  .superRefine((position, context) => {
    if (position.marketValue.signedAmount > 0 && position.direction !== "long") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["direction"],
        message: "Positive market value must be normalized as a long position",
      });
    }
    if (position.marketValue.signedAmount < 0 && position.direction !== "short") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["direction"],
        message: "Negative market value must be normalized as a short position",
      });
    }
    if (
      position.assetType === "option" &&
      !isPublicOptionUnderlyingSymbol(position.displaySymbol)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["displaySymbol"],
        message: "The private adapter must reduce option labels to the underlying symbol",
      });
    }
  });

/**
 * A sanitized fill emitted by the private plugin adapter. The adapter must
 * deduplicate private execution/order identifiers before creating this value.
 * `amountAbsUsd` is the absolute executed cash consideration for one fill. For
 * options, the private adapter must apply the contract multiplier before this
 * sanitized source crosses the projection boundary. Quantity is never copied
 * into this value.
 */
export const InvestmentSourceTradeFillSchema = z
  .object({
    tradeDate: IsoDateSchema,
    assetType: PublicAssetTypeSchema,
    displaySymbol: z.string().trim().min(1).max(120),
    side: z.enum(["buy", "sell"]),
    currency: z.literal("USD"),
    amountAbsUsd: FiniteNumberSchema.positive(),
  })
  .strict()
  .superRefine((fill, context) => {
    if (
      fill.assetType === "option" &&
      !isPublicOptionUnderlyingSymbol(fill.displaySymbol)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["displaySymbol"],
        message: "The private adapter must reduce option labels to the underlying symbol",
      });
    }
  });

export const InvestmentSourceSnapshotSchema = z
  .object({
    schemaVersion: z.literal(INVESTMENT_SOURCE_SCHEMA_VERSION),
    publicationStatus: z.enum(["preview", "published"]),
    source: z.literal("ibkr-readonly-plugin"),
    asOfDate: IsoDateSchema,
    dataDates: z
      .object({
        positionsAsOf: IsoDateSchema,
        tradesFrom: IsoDateSchema,
        tradesThrough: IsoDateSchema,
      })
      .strict(),
    performance: z
      .object({
        coverageStartDate: IsoDateSchema,
        coverageEndDate: IsoDateSchema,
        dailyTwr: z.array(DailyTwrPointSchema).min(1),
      })
      .strict(),
    positions: z.array(InvestmentSourcePositionSchema),
    tradeFills: z.array(InvestmentSourceTradeFillSchema),
  })
  .strict();

export type DailyTwrPoint = z.infer<typeof DailyTwrPointSchema>;
export type InvestmentSourcePosition = z.infer<typeof InvestmentSourcePositionSchema>;
export type InvestmentSourceTradeFill = z.infer<typeof InvestmentSourceTradeFillSchema>;
export type InvestmentSourceSnapshot = z.infer<typeof InvestmentSourceSnapshotSchema>;

/** Read-only boundary implemented by the private IBKR plugin adapter. */
export interface PrivateInvestmentSourceAdapter {
  loadPublicProjectionSource(): Promise<unknown>;
}
