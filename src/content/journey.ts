import { createHash } from "node:crypto";

import { z } from "zod";

import journeyFeedJson from "./journey-public.json";

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const ISO_DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const MAINLAND_PHONE_PATTERN = /(?<!\d)1[3-9]\d{9}(?!\d)/;
const CREDENTIAL_ASSIGNMENT_PATTERN =
  /\b(?:api[_-]?key|access[_-]?token|refresh[_-]?token|password)\b\s*[:=]\s*["']?[^\s"']+/i;
const LOCAL_PATH_PATTERN = /\/(?:Users|home)\/[^\s"'<>]+/;
const PRIVATE_KEY_PATTERN = /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/;

const IsoDaySchema = z
  .string()
  .regex(ISO_DAY_PATTERN, "Expected YYYY-MM-DD")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value;
  }, "Expected a real calendar date");

const JourneyHrefSchema = z
  .string()
  .regex(/^\/journey\/(?:[^/]+\/)*$/, "Journey href must stay under /journey/")
  .refine((value) => !value.startsWith("//") && !value.includes(".."), "Unsafe journey href");

const JourneyContentShape = {
  schemaVersion: z.literal("journey-public-v1"),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Expected a lowercase hyphenated slug"),
  title: z.string().trim().min(1),
  company: z.string().trim().min(1),
  role: z.string().trim().min(1),
  round: z.string().trim().min(1),
  interviewStatus: z.string().trim().min(1),
  publishedAt: IsoDaySchema,
  summary: z.string().trim().min(1),
  body: z.string().trim().min(1),
  tags: z.array(z.string().trim().min(1)),
  href: JourneyHrefSchema,
};

export const JourneyContentSchema = z.object(JourneyContentShape).strict();

const PlaceholderJourneyEntrySchema = z
  .object({
    ...JourneyContentShape,
    publicationStatus: z.literal("placeholder"),
    placeholder: z.literal(true),
    contentSha256: z.null(),
  })
  .strict();

const ApprovedJourneyEntrySchema = z
  .object({
    ...JourneyContentShape,
    publicationStatus: z.literal("approved"),
    placeholder: z.literal(false),
    contentSha256: z.string().regex(SHA256_PATTERN),
  })
  .strict();

export const JourneyPublicEntrySchema = z.discriminatedUnion("publicationStatus", [
  PlaceholderJourneyEntrySchema,
  ApprovedJourneyEntrySchema,
]);

export const JourneyPublicFeedSchema = z
  .object({
    schemaVersion: z.literal("journey-public-feed-v1"),
    entries: z.array(JourneyPublicEntrySchema),
  })
  .strict();

export type JourneyContent = z.infer<typeof JourneyContentSchema>;
export type JourneyEntry = z.infer<typeof JourneyPublicEntrySchema>;
export type JourneyPublicFeed = z.infer<typeof JourneyPublicFeedSchema>;

export class JourneyFeedError extends Error {
  readonly errors: readonly string[];

  constructor(errors: readonly string[]) {
    super(`Journey feed failed with ${errors.length} error(s)`);
    this.name = "JourneyFeedError";
    this.errors = errors;
  }
}

function beijingDay(now: Date | string = new Date()): string {
  const date = now instanceof Date ? now : new Date(now);
  if (!Number.isFinite(date.valueOf())) throw new Error("Expected a valid timestamp");
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function contentFromEntry(entry: JourneyEntry): JourneyContent {
  return JourneyContentSchema.parse({
    schemaVersion: entry.schemaVersion,
    slug: entry.slug,
    title: entry.title,
    company: entry.company,
    role: entry.role,
    round: entry.round,
    interviewStatus: entry.interviewStatus,
    publishedAt: entry.publishedAt,
    summary: entry.summary,
    body: entry.body,
    tags: entry.tags,
    href: entry.href,
  });
}

export function computeJourneyContentSha256(content: JourneyContent): string {
  const canonical = JourneyContentSchema.parse(content);
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

export function loadJourneyFeed(
  value: unknown,
  asOfDate = beijingDay(),
): JourneyPublicFeed {
  if (!IsoDaySchema.safeParse(asOfDate).success) {
    throw new JourneyFeedError(["asOfDate: expected a real YYYY-MM-DD date"]);
  }

  const parsed = JourneyPublicFeedSchema.safeParse(value);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "feed";
      return `${path}: ${issue.message}`;
    });
    throw new JourneyFeedError(errors);
  }

  const errors: string[] = [];
  const slugs = new Set<string>();
  for (const entry of parsed.data.entries) {
    const label = `journey:${entry.slug}`;
    if (slugs.has(entry.slug)) errors.push(`${label}: duplicate slug`);
    slugs.add(entry.slug);

    if (entry.publishedAt > asOfDate) {
      errors.push(`${label}: publishedAt is in the future for Asia/Shanghai`);
    }
    if (entry.href !== `/journey/${entry.slug}/`) {
      errors.push(`${label}: href must equal the canonical slug route`);
    }
    const serialized = JSON.stringify(entry);
    if (EMAIL_PATTERN.test(serialized)) errors.push(`${label}: possible email address`);
    if (MAINLAND_PHONE_PATTERN.test(serialized)) {
      errors.push(`${label}: possible mainland phone number`);
    }
    if (CREDENTIAL_ASSIGNMENT_PATTERN.test(serialized)) {
      errors.push(`${label}: possible credential assignment`);
    }
    if (LOCAL_PATH_PATTERN.test(serialized)) errors.push(`${label}: possible local absolute path`);
    if (PRIVATE_KEY_PATTERN.test(serialized)) errors.push(`${label}: possible private key`);
    if (
      entry.publicationStatus === "approved" &&
      computeJourneyContentSha256(contentFromEntry(entry)) !== entry.contentSha256
    ) {
      errors.push(`${label}: approved content SHA-256 does not match`);
    }
  }

  if (errors.length > 0) throw new JourneyFeedError(errors);
  return parsed.data;
}

export const journeyFeed = loadJourneyFeed(journeyFeedJson as unknown);
export const journeyEntries = journeyFeed.entries;
