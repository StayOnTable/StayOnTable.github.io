import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { scanRepository } from "../scripts/privacy/validate-repository.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function withTree(files, callback) {
  const root = await mkdtemp(join(tmpdir(), "personal-site-privacy-"));
  try {
    for (const [name, contents] of Object.entries(files)) {
      const path = join(root, name);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, contents);
    }
    await callback(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("the checked-in repository passes with private/build/test directories excluded", async () => {
  const result = await scanRepository(repositoryRoot);
  assert.deepEqual(result.violations, []);
  assert.ok(result.filesScanned > 0);
});

test("allows a safe .env.example and scans XML/source files", async () => {
  await withTree(
    {
      ".env.example":
        "IBKR_API_KEY=replace-me\nNEXT_PUBLIC_SITE_URL=https://example.com\n",
      "src/page.tsx": "export const title = 'public';",
      "public/sitemap.xml": "<urlset><loc>https://example.com</loc></urlset>",
    },
    async (root) => {
      const result = await scanRepository(root);
      assert.deepEqual(result.violations, []);
    },
  );
});

test("excludes .git, node_modules, .next, out, and tests", async () => {
  await withTree(
    {
      "src/safe.ts": "export const safe = true;",
      ".git/leak.txt": "DU1234567",
      "node_modules/leak.js": "const endpoint = 'localhost:4002';",
      ".next/leak.json": "{\"account\":\"U1234567\"}",
      "out/leak.html": "sk-not-a-real-but-secret-shaped-token",
      "tests/leak.test.ts": "fetch('/api/ibkr/sync')",
    },
    async (root) => {
      const result = await scanRepository(root);
      assert.deepEqual(result.violations, []);
      assert.equal(result.filesScanned, 1);
    },
  );
});

test("rejects non-example env, databases, logs, SQL, PDFs, and raw reports", async () => {
  await withTree(
    {
      ".env.local": "TOKEN=private",
      "private.sqlite": "SQLite format 3",
      "sync.log": "private row",
      "dump.sql": "select 1;",
      "resume.pdf": "%PDF-1.7",
      "activity-statement.xml": "<report />",
    },
    async (root) => {
      const result = await scanRepository(root);
      assert.equal(result.violations.length, 6);
    },
  );
});

test("rejects account IDs, secrets, local endpoints, private APIs, and broker SDK calls", async () => {
  await withTree(
    {
      "src/account.ts": "export const account = 'DU1234567';",
      "src/token.py": "MINIMAX_API_KEY='sk-not-a-placeholder-value'",
      "src/gateway.xml": "<endpoint>localhost:4002</endpoint>",
      "src/private-api.ts": "fetch('/api/ibkr/sync')",
      "src/order.ts": "placeOrder(contract, order);",
      "src/path.md": "See /Users/example/private/report.json",
    },
    async (root) => {
      const result = await scanRepository(root);
      const violatedPaths = new Set(result.violations.map(({ path }) => path));
      assert.deepEqual(violatedPaths, new Set([
        "src/account.ts",
        "src/gateway.xml",
        "src/order.ts",
        "src/path.md",
        "src/private-api.ts",
        "src/token.py",
      ]));
    },
  );
});

test("rejects a real credential placed in .env.example", async () => {
  await withTree(
    { ".env.example": "FLEX_TOKEN=real-secret-token-value\n" },
    async (root) => {
      const result = await scanRepository(root);
      assert.ok(result.violations.length > 0);
      assert.match(result.violations[0].reason, /non-placeholder|credential/i);
    },
  );
});
