import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { scanRepository } from "../scripts/privacy/validate-repository.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const syntheticEmail = (local, domain) => [local, domain].join("@");
const syntheticAccountId = (prefix = "DU") => [prefix, "123", "4567"].join("");
const syntheticEndpoint = () => ["local", "host", ":40", "02"].join("");
const syntheticSecret = () => ["sk", "-not-a-real-but-secret-shaped-token"].join("");
const syntheticPrivateApi = () => ["/api/", "ib", "kr/", "sync"].join("");
const syntheticPrivateKey = () => ["-----BEGIN ", "PRIVATE", " KEY-----"].join("");
const syntheticOrderCall = () => ["place", "Order", "(contract, order);"].join("");
const syntheticLocalPath = () => ["/", "Users", "/example/private/report.json"].join("");
const syntheticCredential = () => [
  ["MINI", "MAX_API_", "KEY"].join(""),
  "='",
  ["sk", "-not-a-placeholder-value"].join(""),
  "'",
].join("");
const syntheticFlexEnv = () => [
  ["FLEX", "TOKEN"].join("_"),
  "=real-secret-token-value\n",
].join("");

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

test("the checked-in repository passes with dependency and build directories excluded", async () => {
  const result = await scanRepository(repositoryRoot);
  assert.deepEqual(result.violations, []);
  assert.ok(result.filesScanned > 0);
});

test("the Pages workflow rejects preview investment data before build and deploy", async () => {
  const workflow = await readFile(
    join(repositoryRoot, ".github/workflows/deploy-pages.yml"),
    "utf8",
  );
  const releaseGate = workflow.indexOf("npm run investment:validate:release");
  const build = workflow.indexOf("npm run build");
  const deploy = workflow.indexOf("actions/deploy-pages");

  assert.ok(releaseGate >= 0, "the release-only investment gate is missing");
  assert.ok(build > releaseGate, "the release-only investment gate must run before build");
  assert.ok(deploy > build, "Pages deployment must run after the guarded build");
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

test("allows only the owner-authorized public email", async () => {
  await withTree(
    {
      "src/contact.ts": "export const email = 'zdliu20@fudan.edu.cn';",
    },
    async (root) => {
      const result = await scanRepository(root);
      assert.deepEqual(result.violations, []);
    },
  );

  await withTree(
    {
      "src/contact.ts": `export const email = '${syntheticEmail("someone.else", "fudan.edu.cn")}';`,
    },
    async (root) => {
      const result = await scanRepository(root);
      assert.ok(result.violations.some(({ reason }) => /unapproved email/i.test(reason)));
    },
  );
});

test("excludes build/dependency metadata but still scans tests", async () => {
  await withTree(
    {
      "src/safe.ts": "export const safe = true;",
      ".git/leak.txt": syntheticAccountId(),
      "node_modules/leak.js": `const endpoint = '${syntheticEndpoint()}';`,
      ".next/leak.json": JSON.stringify({ account: syntheticAccountId("U") }),
      "out/leak.html": syntheticSecret(),
      "tests/safe.test.ts": "export const safeFixture = true;",
    },
    async (root) => {
      const result = await scanRepository(root);
      assert.deepEqual(result.violations, []);
      assert.equal(result.filesScanned, 2);
    },
  );
});

test("does not allow a sensitive route to hide under tests", async () => {
  await withTree(
    { "tests/leak.test.ts": `fetch('${syntheticPrivateApi()}')` },
    async (root) => {
      const result = await scanRepository(root);
      assert.ok(result.violations.some(({ path }) => path === "tests/leak.test.ts"));
    },
  );
});

test("rejects env, databases, logs, SQL, PDFs, key stores, and raw reports", async () => {
  await withTree(
    {
      ".env.local": "TOKEN=private",
      "private.sqlite": "SQLite format 3",
      "sync.log": "private row",
      "dump.sql": "select 1;",
      "resume.pdf": "%PDF-1.7",
      "private.pem": syntheticPrivateKey(),
      "signing.key": "private key material",
      "certificate.p12": "binary-like contents",
      "identity.pfx": "binary-like contents",
      "mobile.keystore": "binary-like contents",
      "activity-statement.xml": "<report />",
    },
    async (root) => {
      const result = await scanRepository(root);
      assert.equal(result.violations.length, 11);
    },
  );
});

test("rejects account IDs, secrets, local endpoints, private APIs, and broker SDK calls", async () => {
  await withTree(
    {
      "src/account.ts": `export const account = '${syntheticAccountId()}';`,
      "src/token.py": syntheticCredential(),
      "src/gateway.xml": `<endpoint>${syntheticEndpoint()}</endpoint>`,
      "src/private-api.ts": `fetch('${syntheticPrivateApi()}')`,
      "src/order.ts": syntheticOrderCall(),
      "src/path.md": `See ${syntheticLocalPath()}`,
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
    { ".env.example": syntheticFlexEnv() },
    async (root) => {
      const result = await scanRepository(root);
      assert.ok(result.violations.length > 0);
      assert.match(result.violations[0].reason, /non-placeholder|credential/i);
    },
  );
});
