import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";

import { z } from "zod";

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const ISO_DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const PLACEHOLDER_WORD_PATTERN = /示例|占位|演示|虚构/;
const PRIVATE_FIELD_PATTERN =
  /\b(?:eventAt|actualEventDate|interviewAt|occurredAt|privateNotes|rawNotes|sourceMaterial|candidateId|recruiter(?:Name|Email|Phone)?|interviewer(?:Name|Email|Phone)?)\b\s*(?::|=)/i;
const LOCAL_PATH_PATTERN = /\/(?:Users|home)\/[^\s"'<>]+/;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const MAINLAND_PHONE_PATTERN = /(?<!\d)1[3-9]\d{9}(?!\d)/;
const CREDENTIAL_ASSIGNMENT_PATTERN =
  /\b(?:api[_-]?key|access[_-]?token|refresh[_-]?token|flex[_-]?token|query[_-]?id|client[_-]?secret|password)\b\s*[:=]\s*["']?[^\s"']+/i;
const PRIVATE_KEY_PATTERN = /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/;

const IsoDaySchema = z
  .string()
  .regex(ISO_DAY_PATTERN, "Expected YYYY-MM-DD")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value;
  }, "Expected a real calendar date");

const SourceSchema = z
  .string()
  .regex(/^src\/app\/(?:[^/]+\/)*page\.mdx$/, "Expected an src/app/**/page.mdx path")
  .refine((value) => !value.includes("..") && !value.includes("\\"), "Unsafe source path");

const RouteSchema = z
  .string()
  .regex(/^\/(?:[^/]+\/)*$/, "Routes must start and end with a slash")
  .refine((value) => !value.startsWith("//") && !value.includes(".."), "Unsafe route");

const CommonPublicationShape = {
  source: SourceSchema,
  route: RouteSchema,
  title: z.string().trim().min(1),
  contentType: z.enum(["note", "library", "journey", "investment-review"]),
  publishedAt: IsoDaySchema,
};

const PlaceholderPublicationSchema = z
  .object({
    ...CommonPublicationShape,
    publicationStatus: z.literal("placeholder"),
    placeholder: z.literal(true),
    sha256: z.null(),
  })
  .strict();

const PendingPublicationSchema = z
  .object({
    ...CommonPublicationShape,
    publicationStatus: z.literal("pending-review"),
    placeholder: z.literal(false),
    sha256: z.string().regex(SHA256_PATTERN).nullable(),
  })
  .strict();

const ApprovedPublicationSchema = z
  .object({
    ...CommonPublicationShape,
    publicationStatus: z.literal("approved"),
    placeholder: z.literal(false),
    sha256: z.string().regex(SHA256_PATTERN, "Approved content requires a lowercase SHA-256"),
  })
  .strict();

export const PublicationEntrySchema = z.discriminatedUnion("publicationStatus", [
  PlaceholderPublicationSchema,
  PendingPublicationSchema,
  ApprovedPublicationSchema,
]);

export const PublicationManifestSchema = z
  .object({
    schemaVersion: z.literal("publication-manifest-v1"),
    timezone: z.literal("Asia/Shanghai"),
    publications: z.array(PublicationEntrySchema),
  })
  .strict();

export type PublicationManifest = z.infer<typeof PublicationManifestSchema>;

export type PublicationRepositoryInputs = {
  manifest: unknown;
  files: ReadonlyMap<string, string>;
};

export class PublicationGateError extends Error {
  readonly errors: readonly string[];

  constructor(errors: readonly string[]) {
    super(`Publication gate failed with ${errors.length} error(s)`);
    this.name = "PublicationGateError";
    this.errors = errors;
  }
}

export function sha256Text(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function beijingDay(now: Date | string = new Date()): string {
  const date = now instanceof Date ? now : new Date(now);
  if (!Number.isFinite(date.valueOf())) throw new Error("Expected a valid timestamp");
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function deriveRouteFromMdxSource(source: string): string {
  const parsed = SourceSchema.parse(source);
  const relativeRoute = parsed.slice("src/app/".length, -"page.mdx".length);
  return relativeRoute ? `/${relativeRoute}` : "/";
}

function schemaErrors(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "manifest";
    return `${path}: ${issue.message}`;
  });
}

function contentNoticeBodies(source: string): string[] {
  return Array.from(
    source.matchAll(/<ContentNotice(?:\s[^>]*)?>([\s\S]*?)<\/ContentNotice>/g),
    (match) => match[1],
  );
}

export function validatePublicationGate(
  inputs: PublicationRepositoryInputs,
  asOfDate = beijingDay(),
): PublicationManifest {
  const parsedDay = IsoDaySchema.safeParse(asOfDate);
  if (!parsedDay.success) {
    throw new PublicationGateError(["asOfDate: expected a real YYYY-MM-DD date"]);
  }

  const parsedManifest = PublicationManifestSchema.safeParse(inputs.manifest);
  if (!parsedManifest.success) {
    throw new PublicationGateError(schemaErrors(parsedManifest.error));
  }

  const manifest = parsedManifest.data;
  const errors: string[] = [];
  const manifestSources = new Set<string>();
  const manifestRoutes = new Set<string>();

  for (const entry of manifest.publications) {
    const label = entry.source;
    if (manifestSources.has(entry.source)) errors.push(`${label}: duplicate manifest source`);
    manifestSources.add(entry.source);

    if (manifestRoutes.has(entry.route)) errors.push(`${label}: duplicate manifest route`);
    manifestRoutes.add(entry.route);

    const expectedRoute = deriveRouteFromMdxSource(entry.source);
    if (entry.route !== expectedRoute) errors.push(`${label}: route does not match source path`);
    if (entry.publishedAt > asOfDate) {
      errors.push(`${label}: publishedAt is in the future for Asia/Shanghai`);
    }
    if (entry.publicationStatus === "pending-review") {
      errors.push(`${label}: pending-review content cannot enter a public build`);
    }

    const source = inputs.files.get(entry.source);
    if (source === undefined) {
      errors.push(`${label}: manifest source is missing`);
      continue;
    }

    if (PRIVATE_FIELD_PATTERN.test(source)) errors.push(`${label}: possible private field marker`);
    if (LOCAL_PATH_PATTERN.test(source)) errors.push(`${label}: possible local absolute path`);
    if (EMAIL_PATTERN.test(source)) errors.push(`${label}: possible email address`);
    if (MAINLAND_PHONE_PATTERN.test(source)) errors.push(`${label}: possible mainland phone number`);
    if (CREDENTIAL_ASSIGNMENT_PATTERN.test(source)) {
      errors.push(`${label}: possible credential assignment`);
    }
    if (PRIVATE_KEY_PATTERN.test(source)) errors.push(`${label}: possible private key`);

    const notices = contentNoticeBodies(source);
    if (entry.publicationStatus === "placeholder") {
      if (notices.length === 0 || !notices.some((body) => PLACEHOLDER_WORD_PATTERN.test(body))) {
        errors.push(`${label}: placeholder content requires a visible placeholder ContentNotice`);
      }
    }

    if (
      entry.publicationStatus === "approved" &&
      notices.some((body) => PLACEHOLDER_WORD_PATTERN.test(body))
    ) {
      errors.push(`${label}: approved content still carries a placeholder ContentNotice`);
    }

    if (entry.publicationStatus === "approved" && sha256Text(source) !== entry.sha256) {
      errors.push(`${label}: approved SHA-256 does not match the exact source bytes`);
    }
  }

  for (const source of inputs.files.keys()) {
    if (!manifestSources.has(source)) errors.push(`${source}: MDX page is not registered in the manifest`);
  }

  if (errors.length > 0) throw new PublicationGateError(errors);
  return manifest;
}

async function findMdxPages(directory: string, siteRoot: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const paths: string[] = [];
  for (const entry of entries) {
    const absolutePath = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      paths.push(...(await findMdxPages(absolutePath, siteRoot)));
    } else if (entry.isFile() && entry.name === "page.mdx") {
      paths.push(relative(siteRoot, absolutePath).split(sep).join("/"));
    }
  }
  return paths.sort();
}

export async function readPublicationRepositoryInputs(
  siteRoot: string,
): Promise<PublicationRepositoryInputs> {
  const manifestPath = resolve(siteRoot, "src/content/publications.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as unknown;
  const sources = await findMdxPages(resolve(siteRoot, "src/app"), siteRoot);
  const files = new Map<string, string>();
  for (const source of sources) {
    files.set(source, await readFile(resolve(siteRoot, source), "utf8"));
  }
  return { manifest, files };
}
