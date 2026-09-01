import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { buildPublicInvestmentPanel } from "../../src/lib/investment";

async function main(): Promise<void> {
  const [inputArgument, outputArgument] = process.argv.slice(2);
  if (!inputArgument || !outputArgument) {
    throw new Error(
      "Usage: tsx scripts/investment/build-public-panel.ts <normalized-source.json> <public-output.json>",
    );
  }

  const inputPath = resolve(inputArgument);
  const outputPath = resolve(outputArgument);
  const raw = JSON.parse(await readFile(inputPath, "utf8")) as unknown;
  const panel = buildPublicInvestmentPanel(raw);

  await mkdir(dirname(outputPath), { recursive: true });
  const temporaryPath = `${outputPath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(panel, null, 2)}\n`, "utf8");
  await rename(temporaryPath, outputPath);
  process.stdout.write(`Validated public investment data written to ${outputPath}\n`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown investment build failure";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
