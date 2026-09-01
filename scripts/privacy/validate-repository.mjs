#!/usr/bin/env node

import { lstat, readFile, readdir } from "node:fs/promises";
import { basename, extname, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

export const EXCLUDED_DIRECTORIES = new Set([
  ".git",
  "node_modules",
  ".next",
  "out",
  "tests",
]);

const BLOCKED_EXTENSIONS = new Set([
  ".csv",
  ".db",
  ".duckdb",
  ".feather",
  ".log",
  ".mdb",
  ".mt940",
  ".ofx",
  ".parquet",
  ".pdf",
  ".qfx",
  ".sql",
  ".sqlite",
  ".sqlite3",
  ".tsv",
  ".xls",
  ".xlsx",
]);

const TEXT_EXTENSIONS = new Set([
  ".bash",
  ".c",
  ".cc",
  ".cjs",
  ".cpp",
  ".css",
  ".go",
  ".gql",
  ".graphql",
  ".h",
  ".hpp",
  ".html",
  ".java",
  ".js",
  ".json",
  ".jsx",
  ".kt",
  ".kts",
  ".less",
  ".mjs",
  ".map",
  ".md",
  ".mdx",
  ".php",
  ".properties",
  ".py",
  ".rb",
  ".rs",
  ".sass",
  ".scss",
  ".sh",
  ".svelte",
  ".svg",
  ".swift",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".vue",
  ".xml",
  ".yaml",
  ".yml",
  ".zsh",
]);

const TEXT_NAMES = new Set([".env.example", ".gitignore", "Dockerfile", "Makefile"]);
const RAW_REPORT_NAME =
  /(?:activity[-_ ]?statement|account[-_ ]?(?:activity|report|statement)|brokerage[-_ ]?statement|execution[-_ ]?report|flex[-_ ]?(?:activity|report|statement)|ibkr[-_ ]?(?:activity|report|statement)|portfolio[-_ ]?(?:report|statement|snapshot)|raw[-_ ]?(?:activity|flex|report|statement|trade)|trade[-_ ]?confirmation)/i;
const SENSITIVE_ENV_NAME =
  /(?:API[_-]?KEY|SECRET|TOKEN|PASSWORD|PRIVATE[_-]?KEY|ACCOUNT[_-]?ID|QUERY[_-]?ID|CLIENT[_-]?ID)/i;
const SAFE_PLACEHOLDER =
  /^(?:|<[^>]+>|your[-_].*|replace[-_].*|change[-_]?me|example|dummy|placeholder|redacted)$/i;

const SENSITIVE_PATTERNS = [
  {
    label: "IBKR account identifier",
    pattern: /\b(?:DU|U|F|I|S)\d{6,12}\b/i,
  },
  {
    label: "labeled account identifier",
    pattern:
      /(?:account|acct|账户号|账号)\s*(?:id|number|no\.?|号码)?\s*[:=#：]\s*[a-z]{0,3}\d{6,}/i,
  },
  {
    label: "private key",
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  },
  {
    label: "credential-like literal",
    pattern:
      /(?:(?:IBKR|FLEX|MINIMAX)_[A-Z0-9_]*(?:KEY|TOKEN|SECRET|QUERY_ID|ACCOUNT_ID|CLIENT_ID)\s*[:=]\s*["']?(?!<|your[-_]|replace[-_]|change[-_]?me|example|dummy|placeholder|redacted)[^\s"']{6,}|["'](?:flexToken|apiKey|password|secret|clientId|queryId|referenceCode)["']\s*:\s*["'][^"']{6,}["'])/i,
  },
  {
    label: "bearer token or API key",
    pattern: /\b(?:bearer\s+[a-z0-9._~+/=-]{12,}|sk-[a-z0-9_-]{12,})\b/i,
  },
  {
    label: "local private endpoint",
    pattern: /\b(?:localhost|127\.0\.0\.1|0\.0\.0\.0|host\.docker\.internal):\d{2,5}\b/i,
  },
  {
    label: "private investment API route",
    pattern:
      /(?:https?:\/\/[^\s"']+)?\/api\/(?:ibkr|flex|portfolio|account|orders?|trades?|sync)(?:[\/\s"'?#]|$)/i,
  },
  {
    label: "private broker SDK or order-capable call",
    pattern:
      /(?:@stoqey\/ib|\bib_insync\b|\b(?:placeOrder|cancelOrder|reqOpenOrders|reqAccountSummary|reqPositions)\s*\()/i,
  },
  {
    label: "local absolute path",
    pattern: /\/(?:Users|home)\/[^\s"'<>]+/,
  },
];

function relativeName(root, path) {
  return relative(root, path).split(sep).join("/") || basename(path);
}

function blockedFileReason(relativePath) {
  const name = basename(relativePath).toLowerCase();
  if (name === ".env.example") return undefined;
  if (name === ".env" || name.startsWith(".env.")) {
    return "environment file is forbidden; only .env.example is allowed";
  }
  if (BLOCKED_EXTENSIONS.has(extname(name))) {
    return "database, log, raw report, SQL dump, or unscannable file type is forbidden";
  }
  if (RAW_REPORT_NAME.test(relativePath)) {
    return "filename resembles a private brokerage or raw report";
  }
  return undefined;
}

function envExampleViolations(text, relativePath) {
  const violations = [];
  text.split(/\r?\n/).forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) return;
    const splitAt = line.indexOf("=");
    const key = line.slice(0, splitAt);
    const value = line.slice(splitAt + 1).trim().replace(/^['"]|['"]$/g, "");
    if (SENSITIVE_ENV_NAME.test(key) && !SAFE_PLACEHOLDER.test(value)) {
      violations.push({
        path: `${relativePath}:${index + 1}`,
        reason: ".env.example contains a non-placeholder sensitive value",
      });
    }
  });
  return violations;
}

async function walk(root, directory, violations, files) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && EXCLUDED_DIRECTORIES.has(entry.name)) continue;
    const path = resolve(directory, entry.name);
    const name = relativeName(root, path);
    if (entry.isSymbolicLink()) {
      violations.push({ path: name, reason: "symbolic links are not allowed in the public repository" });
      continue;
    }
    if (entry.isDirectory()) {
      await walk(root, path, violations, files);
      continue;
    }
    if (entry.isFile()) files.push(path);
  }
}

export async function scanRepository(rootArgument = ".") {
  const root = resolve(rootArgument);
  const rootStats = await lstat(root).catch(() => null);
  if (!rootStats) {
    return { root, filesScanned: 0, violations: [{ path: ".", reason: "target does not exist" }] };
  }
  if (!rootStats.isDirectory()) {
    return { root, filesScanned: 0, violations: [{ path: ".", reason: "target must be a directory" }] };
  }

  const files = [];
  const violations = [];
  await walk(root, root, violations, files);

  for (const path of files) {
    const name = relativeName(root, path);
    const blockedReason = blockedFileReason(name);
    if (blockedReason) {
      violations.push({ path: name, reason: blockedReason });
      continue;
    }

    const extension = extname(path).toLowerCase();
    if (!TEXT_EXTENSIONS.has(extension) && !TEXT_NAMES.has(basename(path))) continue;
    let text;
    try {
      text = await readFile(path, "utf8");
    } catch {
      violations.push({ path: name, reason: "text file could not be decoded as UTF-8" });
      continue;
    }

    if (basename(path).toLowerCase() === ".env.example") {
      violations.push(...envExampleViolations(text, name));
    }
    for (const { label, pattern } of SENSITIVE_PATTERNS) {
      pattern.lastIndex = 0;
      if (pattern.test(text)) violations.push({ path: name, reason: `possible ${label}` });
    }
  }

  return { root, filesScanned: files.length, violations };
}

export async function validateRepository(rootArgument = ".") {
  const result = await scanRepository(rootArgument);
  if (result.violations.length > 0) {
    const details = result.violations
      .map(({ path, reason }) => `- ${path}: ${reason}`)
      .join("\n");
    throw new Error(`Repository privacy validation failed:\n${details}`);
  }
  return result;
}

async function main() {
  const result = await validateRepository(process.argv[2] ?? ".");
  process.stdout.write(
    `Repository privacy validation passed (${result.filesScanned} file(s), private directories excluded).\n`,
  );
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
