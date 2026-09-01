import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { loadJourneyFeed } from "../../src/content/journey";
import {
  PublicationGateError,
  beijingDay,
  readPublicationRepositoryInputs,
  validatePublicationGate,
} from "./publication-gate";

function parseArgs(argv: string[]): { asOfDate: string } {
  let asOfDate = beijingDay();
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] !== "--as-of" || !argv[index + 1]) {
      throw new Error("Usage: validate-publications.ts [--as-of YYYY-MM-DD]");
    }
    asOfDate = argv[index + 1];
    index += 1;
  }
  return { asOfDate };
}

async function main(): Promise<void> {
  const { asOfDate } = parseArgs(process.argv.slice(2));
  const siteRoot = process.cwd();
  const inputs = await readPublicationRepositoryInputs(siteRoot);
  const manifest = validatePublicationGate(inputs, asOfDate);

  const journeyPath = resolve(siteRoot, "src/content/journey-public.json");
  const journeyValue = JSON.parse(await readFile(journeyPath, "utf8")) as unknown;
  const journey = loadJourneyFeed(journeyValue, asOfDate);

  process.stdout.write(
    `Public content passed approval, schedule, hash, placeholder, and privacy gates (${manifest.publications.length} MDX pages; ${journey.entries.length} journey entries).\n`,
  );
}

main().catch((error: unknown) => {
  if (error instanceof PublicationGateError) {
    for (const message of error.errors) process.stderr.write(`${message}\n`);
  } else if (error && typeof error === "object" && "errors" in error) {
    const errors = (error as { errors?: unknown }).errors;
    if (Array.isArray(errors)) {
      for (const message of errors) process.stderr.write(`${String(message)}\n`);
    } else {
      process.stderr.write("Public content validation failed.\n");
    }
  } else {
    const message = error instanceof Error ? error.message : "Public content validation failed";
    process.stderr.write(`${message}\n`);
  }
  process.exitCode = 1;
});
