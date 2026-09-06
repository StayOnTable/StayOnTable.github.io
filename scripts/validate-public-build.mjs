#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import { dirname, extname, join, normalize, relative, resolve } from "node:path";

const FULL_DISCLAIMER =
  "仅为个人投资复盘与记录，不构成任何投资建议。市场有风险，请独立判断。";
const SHORT_DISCLAIMER = "仅个人复盘，非投资建议。";
const INVESTMENT_HISTORY_START_DATE = "2026-04-01";
const TEXT_EXTENSIONS = new Set([".css", ".html", ".js", ".json", ".map", ".txt", ".xml"]);
const FORBIDDEN_FILE_EXTENSIONS = new Set([".csv", ".db", ".env", ".log", ".sqlite", ".sqlite3"]);
const SENSITIVE_VALUE_PATTERNS = [
  {
    label: "IBKR account identifier",
    pattern: /\b(?:DU|U|F|I|S)\d{6,12}\b/i,
  },
  {
    label: "credential-like value",
    pattern:
      /(?:(?:IBKR|FLEX|MINIMAX)_[A-Z0-9_]*(?:KEY|TOKEN|SECRET|QUERY_ID|ACCOUNT_ID)\s*[:=]\s*[^\s<"']{6,}|"(?:flexToken|apiKey|password|secret|clientId|queryId|referenceCode)"\s*:\s*"[^"]{6,}")/i,
  },
  {
    label: "bearer token or API key",
    pattern: /\b(?:bearer\s+[a-z0-9._~+/=-]{12,}|sk-[a-z0-9_-]{12,})\b/i,
  },
  {
    label: "local IBKR-style endpoint",
    pattern: /\b(?:localhost|127\.0\.0\.1):\d{2,5}\b/i,
  },
];

function fail(message) {
  throw new Error(`Public build validation failed: ${message}`);
}

function hasExactKeys(value, expectedKeys) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(path)));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

async function readRequired(path, label) {
  try {
    return await readFile(path, "utf8");
  } catch {
    fail(`${label} is missing at ${path}`);
  }
}

function visibleDom(html) {
  const body = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? html;
  return body
    .replace(/<!--([\s\S]*?)-->/g, "")
    .replace(/<(script|style|template)\b[^>]*>[\s\S]*?<\/\1>/gi, "");
}

function visibleText(html) {
  return visibleDom(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function markedDisclaimerTexts(html, marker) {
  const matches = [];
  for (const match of visibleDom(html).matchAll(/<p\b([^>]*)>([\s\S]*?)<\/p>/gi)) {
    const [, attributes, body] = match;
    if (!/\bclass=["'][^"']*\binvestment-disclaimer\b[^"']*["']/i.test(attributes)) {
      continue;
    }
    const markerMatch = attributes.match(
      /\bdata-investment-disclaimer-marker=["'](start|end)["']/i,
    );
    if (markerMatch?.[1].toLowerCase() === marker) matches.push(visibleText(body));
  }
  return matches;
}

function idsIn(html) {
  return new Set([...html.matchAll(/\sid=["']([^"']+)["']/g)].map((match) => match[1]));
}

function localTargetForHref(href, currentRelativePath, basePath) {
  if (!href || /^(?:[a-z]+:|\/\/)/i.test(href)) return null;
  const [rawPath, rawFragment = ""] = href.split("#", 2);
  const pathWithoutQuery = rawPath.split("?", 1)[0];
  let localPath;
  if (!pathWithoutQuery) {
    localPath = currentRelativePath;
  } else if (pathWithoutQuery.startsWith("/")) {
    let sitePath = pathWithoutQuery;
    if (basePath && (sitePath === basePath || sitePath.startsWith(`${basePath}/`))) {
      sitePath = sitePath.slice(basePath.length) || "/";
    }
    localPath = sitePath.replace(/^\/+/, "");
  } else {
    localPath = normalize(join(dirname(currentRelativePath), pathWithoutQuery));
  }

  if (!localPath || localPath.endsWith("/")) localPath = join(localPath, "index.html");
  else if (!extname(localPath)) localPath = join(localPath, "index.html");
  return { localPath: normalize(localPath), fragment: decodeURIComponent(rawFragment) };
}

async function main() {
  const outputDirectory = resolve(process.argv[2] ?? "out");
  const outputStats = await stat(outputDirectory).catch(() => null);
  if (!outputStats?.isDirectory()) fail(`static output directory is missing: ${outputDirectory}`);

  const homeHtml = await readRequired(join(outputDirectory, "index.html"), "home page");
  const investingHtml = await readRequired(
    join(outputDirectory, "investing", "index.html"),
    "investing page",
  );
  const investmentPanel = JSON.parse(
    await readRequired(
      resolve("src/content/investment-public.json"),
      "public investment data",
    ),
  );
  const homeText = visibleText(homeHtml);
  const investingText = visibleText(investingHtml);
  if (
    investmentPanel.schemaVersion !== "investment-public-v3" ||
    investmentPanel.currency !== "USD"
  ) {
    fail("the checked-in investment candidate is not the strict USD-only v3 contract");
  }
  if (investmentPanel.performance.coverageStartDate < INVESTMENT_HISTORY_START_DATE) {
    fail(`public investment history begins before ${INVESTMENT_HISTORY_START_DATE}`);
  }
  if (
    !hasExactKeys(investmentPanel.performance, [
      "measure",
      "coverageStartDate",
      "coverageEndDate",
      "weeklyReturnPct",
      "monthlyReturnPct",
      "quarterlyReturnPct",
      "weeklySeries",
    ])
  ) {
    fail("the public performance object contains a retired or unknown metric");
  }
  if (
    !investmentPanel.positions.every((position) =>
      hasExactKeys(position, ["assetType", "displaySymbol", "direction", "allocationPct"]),
    )
  ) {
    fail("a public position exposes more than its symbol, type, direction, and allocation");
  }
  if (
    !investmentPanel.weeklyTrades.every((trade) =>
      hasExactKeys(trade, [
        "tradeDate",
        "displaySymbol",
        "assetType",
        "side",
        "amountAbsUsd",
        "fillCount",
      ]),
    )
  ) {
    fail("a public weekly trade does not match the minimal USD aggregate contract");
  }
  if (!homeText.includes(SHORT_DISCLAIMER)) {
    fail("the home investment summary is missing its compact disclaimer");
  }
  if (!investingText.includes(FULL_DISCLAIMER)) {
    fail("/investing does not contain the full visible disclaimer");
  }
  if (
    !investingText.includes("本周收益率") ||
    !investingText.includes("本月收益率") ||
    !investingText.includes("本季度收益率")
  ) {
    fail("/investing does not visibly render the three approved TWR periods");
  }
  if (
    !investingText.includes("持仓构成") ||
    !investingText.includes("仅展示公开持仓占比")
  ) {
    fail("/investing does not clearly label the allocation-only public position view");
  }
  if (investingText.includes("USD 持仓占比")) {
    fail("/investing unnecessarily presents a currency unit for a percentage-only position view");
  }
  if (
    !investingText.includes("自记录起点以来的累计收益率") ||
    !investingText.includes("以 0% 为基线") ||
    !investingText.includes("TWR（时间加权收益率）")
  ) {
    fail("/investing does not clearly present the chart as cumulative TWR percentage from a zero baseline");
  }
  if (
    !investingText.includes("已实现与未实现的收益或亏损") ||
    !investingText.includes("外部现金流被中和") ||
    !investingText.includes("成交金额本身不会被当作收益")
  ) {
    fail("/investing does not explain the account-level TWR and cash-flow treatment");
  }
  for (const misleadingChartLabel of ["组合指数", "累计指数"]) {
    if (investingText.includes(misleadingChartLabel)) {
      fail(`/investing still renders an index label instead of a return percentage: ${misleadingChartLabel}`);
    }
  }
  if (
    !investingText.includes("本周成交订单") ||
    !investingText.includes("成交金额（USD）") ||
    !investingText.includes("成交笔数")
  ) {
    fail("/investing does not visibly render the minimal completed-trade snapshot");
  }
  for (const retiredLabel of ["今年以来", "近一年", "最大回撤", "成交均价"]) {
    if (investingText.includes(retiredLabel)) {
      fail(`/investing still renders the retired label: ${retiredLabel}`);
    }
  }
  if (investmentPanel.publicationStatus === "preview") {
    const previewNotice = "本地预览 · 尚未公开发布";
    if (!investingText.includes(previewNotice) || !homeText.includes(previewNotice)) {
      fail("preview investment data is not visibly marked as unpublished");
    }
  }

  const files = await walk(outputDirectory);
  const fileNames = new Set(files.map((file) => relative(outputDirectory, file)));
  const htmlFiles = files.filter((file) => extname(file) === ".html");
  const htmlIds = new Map();
  for (const file of htmlFiles) {
    const name = relative(outputDirectory, file);
    htmlIds.set(name, idsIn(await readFile(file, "utf8")));
  }

  const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");
  for (const file of htmlFiles) {
    const name = relative(outputDirectory, file);
    const html = await readFile(file, "utf8");
    for (const match of html.matchAll(/\shref=["']([^"']+)["']/g)) {
      const href = match[1];
      const target = localTargetForHref(href, name, basePath);
      if (!target) continue;
      if (target.localPath.startsWith("..") || !fileNames.has(target.localPath)) {
        fail(`${name} links to a missing public target: ${href}`);
      }
      if (target.fragment && extname(target.localPath) === ".html") {
        if (!htmlIds.get(target.localPath)?.has(target.fragment)) {
          fail(`${name} links to a missing fragment: ${href}`);
        }
      }
    }
  }

  const weeklyReviewFiles = files.filter((file) =>
    /\/investing\/weekly\/[^/]+\/index\.html$/.test(file),
  );
  if (weeklyReviewFiles.length === 0) fail("no generated investment weekly review was found");
  for (const file of weeklyReviewFiles) {
    const html = await readFile(file, "utf8");
    const startDisclaimers = markedDisclaimerTexts(html, "start");
    const endDisclaimers = markedDisclaimerTexts(html, "end");
    if (
      startDisclaimers.length !== 1 ||
      endDisclaimers.length !== 1 ||
      startDisclaimers[0] !== FULL_DISCLAIMER ||
      endDisclaimers[0] !== FULL_DISCLAIMER
    ) {
      fail(
        `${relative(outputDirectory, file)} must show one marked full disclaimer at both start and end`,
      );
    }
  }

  const cssText = (
    await Promise.all(
      files.filter((file) => extname(file) === ".css").map((file) => readFile(file, "utf8")),
    )
  ).join("\n");
  const disclaimerRules = cssText.match(/\.investment-disclaimer[^{}]*\{[^}]*\}/g) ?? [];
  if (disclaimerRules.length === 0) fail("investment disclaimer styling is missing");
  if (
    disclaimerRules.some((rule) =>
      /display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0(?:\D|$)|font-size\s*:\s*0(?:\D|$)/i.test(
        rule,
      ),
    )
  ) {
    fail("investment disclaimer styling hides or removes the notice");
  }

  for (const file of files) {
    const extension = extname(file).toLowerCase();
    const name = relative(outputDirectory, file);
    if (FORBIDDEN_FILE_EXTENSIONS.has(extension) || /(^|\/)\.env(?:\.|$)/i.test(name)) {
      fail(`forbidden public artifact found: ${name}`);
    }
    if (!TEXT_EXTENSIONS.has(extension)) continue;
    const text = await readFile(file, "utf8");
    for (const { label, pattern } of SENSITIVE_VALUE_PATTERNS) {
      pattern.lastIndex = 0;
      if (pattern.test(text)) fail(`${label} detected in ${name}`);
    }
  }

  const shareManifest = JSON.parse(
    await readRequired(resolve("scripts/share-image-manifest.json"), "share image manifest"),
  );
  const shareCard = files.find((file) => relative(outputDirectory, file) === shareManifest.file);
  if (!shareCard) fail("the social share card is missing");
  if (
    shareManifest.kind !== "site-cover" ||
    shareManifest.containsInvestmentData !== false ||
    shareManifest.visibleDisclaimer !== null
  ) {
    fail("the reviewed site cover manifest does not match the non-investment share-card policy");
  }
  const shareBytes = await readFile(shareCard);
  const shareHash = createHash("sha256").update(shareBytes).digest("hex");
  if (shareHash !== shareManifest.sha256) {
    fail("the social share card changed without a new visual review");
  }
  if (
    shareBytes.subarray(1, 4).toString("ascii") !== "PNG" ||
    shareBytes.readUInt32BE(16) !== shareManifest.width ||
    shareBytes.readUInt32BE(20) !== shareManifest.height
  ) {
    fail("the social share card dimensions do not match its reviewed metadata");
  }

  process.stdout.write(
    `Public build passed route, disclaimer, artifact, and sensitive-value checks (${files.length} files).\n`,
  );
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
