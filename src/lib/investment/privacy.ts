export type InvestmentPrivacyViolationCode =
  | "FORBIDDEN_KEY"
  | "PRIVATE_POSITION_LABEL"
  | "ACCOUNT_IDENTIFIER"
  | "CREDENTIAL_VALUE"
  | "CONNECTION_DETAIL";

export type InvestmentPrivacyViolation = {
  code: InvestmentPrivacyViolationCode;
  path: string;
  reason: string;
};

const FORBIDDEN_EXACT_KEYS = new Set([
  "account",
  "accountid",
  "accountnumber",
  "accountalias",
  "accountholder",
  "ibaccount",
  "nav",
  "networth",
  "host",
  "hostname",
  "port",
  "clientid",
  "password",
  "passwd",
  "secret",
  "token",
  "apikey",
  "accesstoken",
  "refreshtoken",
  "flextoken",
  "queryid",
  "flexqueryid",
  "referencecode",
  "orderid",
  "executionid",
  "execid",
  "permid",
  "quantity",
  "shares",
  "sharecount",
  "positionquantity",
  "cost",
  "costbasis",
  "averagecost",
  "avgcost",
  "raw",
  "rawpayload",
]);

const FORBIDDEN_KEY_FRAGMENTS = [
  "account",
  "cash",
  "margin",
  "buyingpower",
  "netliquidation",
  "netassetvalue",
  "availablefunds",
  "excessliquidity",
  "loan",
  "borrow",
  "debt",
  "financing",
  "leverage",
  "equity",
  "token",
  "password",
  "secret",
  "clientid",
  "queryid",
  "referencecode",
  "orderid",
  "executionid",
  "execid",
  "permid",
  "quantity",
  "shares",
  "sharecount",
  "costbasis",
  "averagecost",
  "avgcost",
  "rawpayload",
  "rawflex",
  "rawstatement",
  "statement",
  "synclog",
  "internalid",
  "timestamp",
  "pnl",
  "profitusd",
  "lossusd",
  "unrealizedpnl",
  "realizedpnl",
  "dollarpnl",
  "profitloss",
  "profitandloss",
] as const;

const SENSITIVE_STRING_PATTERNS: Array<{
  code: Exclude<InvestmentPrivacyViolationCode, "FORBIDDEN_KEY">;
  reason: string;
  pattern: RegExp;
}> = [
  {
    code: "ACCOUNT_IDENTIFIER",
    reason: "String resembles an IBKR account identifier",
    pattern: /\b(?:DU|U|F|I|S)\d{6,12}\b/i,
  },
  {
    code: "ACCOUNT_IDENTIFIER",
    reason: "String embeds a labeled account number",
    pattern: /(?:account|acct|账户号|账号)\s*(?:id|number|no\.?|号码)?\s*[:=#：]?\s*[a-z]{0,3}\d{6,}/i,
  },
  {
    code: "CREDENTIAL_VALUE",
    reason: "String embeds a credential or private integration identifier",
    pattern:
      /(?:flex[\s_-]?token|api[\s_-]?key|password|secret|client[\s_-]?id|query[\s_-]?id|reference[\s_-]?code)\s*[:=：]\s*\S+/i,
  },
  {
    code: "CREDENTIAL_VALUE",
    reason: "String resembles a bearer token or API key",
    pattern: /\b(?:bearer\s+[a-z0-9._~+/=-]{12,}|sk-[a-z0-9_-]{12,})\b/i,
  },
  {
    code: "CONNECTION_DETAIL",
    reason: "String exposes a local service endpoint",
    pattern: /\b(?:localhost|127\.0\.0\.1):\d{2,5}\b/i,
  },
];

const ALWAYS_PRIVATE_POSITION_LABEL =
  /(?:\b(?:MARGIN|BUYING\s*POWER|NET\s*(?:LIQUIDATION|ASSET\s*VALUE)|NLV|ACCOUNT\s*(?:VALUE|EQUITY)|LOAN|BORROW(?:ED|ING)?)\b|保证金|购买力|净清算|账户权益|借款|融资)/i;
const CASH_LIKE_POSITION_LABEL =
  /(?:\b(?:USD|BASE|CURRENCY|FX)?\s*CASH(?:\s*BALANCE)?\b|\b(?:USD|BASE)\s+CURRENCY\b|现金)/i;

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function forbiddenKeyReason(key: string): string | undefined {
  const normalized = normalizeKey(key);
  if (FORBIDDEN_EXACT_KEYS.has(normalized)) {
    return "Field is outside the public investment allowlist";
  }
  if (FORBIDDEN_KEY_FRAGMENTS.some((fragment) => normalized.includes(fragment))) {
    return "Field can reveal cash, financing, account equity, leverage, or dollar P&L";
  }
  return undefined;
}

function childPath(parent: string, key: string | number): string {
  if (typeof key === "number") return `${parent}[${key}]`;
  return parent === "$" ? `$.${key}` : `${parent}.${key}`;
}

/**
 * Scans both raw keys and string values before schema parsing. Violations never
 * echo the sensitive value, so CI logs remain safe.
 */
export function scanPublicInvestmentPayload(value: unknown): InvestmentPrivacyViolation[] {
  const violations: InvestmentPrivacyViolation[] = [];
  const visited = new WeakSet<object>();

  function visit(current: unknown, path: string): void {
    if (typeof current === "string") {
      SENSITIVE_STRING_PATTERNS.forEach(({ code, reason, pattern }) => {
        pattern.lastIndex = 0;
        if (pattern.test(current)) violations.push({ code, path, reason });
      });
      return;
    }

    if (!current || typeof current !== "object") return;
    if (visited.has(current)) return;
    visited.add(current);

    if (Array.isArray(current)) {
      current.forEach((item, index) => visit(item, childPath(path, index)));
      return;
    }

    const record = current as Record<string, unknown>;
    if (typeof record.displaySymbol === "string") {
      const privateLabel =
        ALWAYS_PRIVATE_POSITION_LABEL.test(record.displaySymbol) ||
        (record.assetType === "other" && CASH_LIKE_POSITION_LABEL.test(record.displaySymbol));
      if (privateLabel) {
        violations.push({
          code: "PRIVATE_POSITION_LABEL",
          path: childPath(path, "displaySymbol"),
          reason: "Position label can represent cash, financing, margin, or account equity",
        });
      }
    }

    Object.entries(record).forEach(([key, item]) => {
      const itemPath = childPath(path, key);
      const reason = forbiddenKeyReason(key);
      if (reason) {
        violations.push({ code: "FORBIDDEN_KEY", path: itemPath, reason });
      }
      visit(item, itemPath);
    });
  }

  visit(value, "$");
  return violations;
}

export class InvestmentPrivacyError extends Error {
  constructor(readonly violations: InvestmentPrivacyViolation[]) {
    super(
      `Public investment payload failed privacy checks at: ${violations
        .map((violation) => violation.path)
        .join(", ")}`,
    );
    this.name = "InvestmentPrivacyError";
  }
}

export function assertPublicInvestmentPrivacy(value: unknown): void {
  const violations = scanPublicInvestmentPayload(value);
  if (violations.length > 0) throw new InvestmentPrivacyError(violations);
}
