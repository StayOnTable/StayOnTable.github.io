import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  PublicInvestmentPanelSchema,
  assertPublicInvestmentPrivacy,
} from "../../src/lib/investment";

async function main(): Promise<void> {
  const [inputArgument] = process.argv.slice(2);
  if (!inputArgument) {
    throw new Error(
      "Usage: tsx scripts/investment/validate-public-panel.ts <public-investment.json>",
    );
  }

  const inputPath = resolve(inputArgument);
  const raw = JSON.parse(await readFile(inputPath, "utf8")) as unknown;
  assertPublicInvestmentPrivacy(raw);
  PublicInvestmentPanelSchema.parse(raw);
  process.stdout.write(`Public investment data passed schema and privacy checks: ${inputPath}\n`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown investment validation failure";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
