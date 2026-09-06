# Public investment data boundary

This directory is the one-way boundary from the authorized IBKR read-only
plugin to the static public site. It exposes no order methods and does not use
Gateway, TWS, or Flex.

The private adapter maps plugin responses into the strict
`investment-plugin-source-v3` source schema. It must discard account IDs and
deduplicate private order/execution identifiers before returning that source.
Raw plugin payloads, account balances, cash, financing, margin, net liquidation
value, position quantities, cost basis, exact execution times, prices, fees,
dollar P&L, and private IDs never enter the public projection.

`buildPublicInvestmentPanel()` produces `investment-public-v3` by:

- accepting only amounts already verified as USD; non-USD source rows fail
  closed and are never converted, relabeled, or silently omitted;
- validating the plugin TWR endpoints and clipping the public chart to the
  fixed site record start, 2026-04-01 (the boundary does not reset each year);
- publishing only current-week, current-month, and current-quarter TWR, with a
  `null` month or quarter when complete coverage is unavailable;
- normalizing all USD security positions into one allocation whose percentages
  sum to 100, while removing every absolute position value and reducing option
  labels to their underlying ticker;
- aggregating current-week fills by public date, symbol, asset type, and side;
- exposing only aggregate absolute USD trade amount and fill count, never
  quantity or average price; and
- applying both the privacy scanner and the strict Zod public schema.

`publicationStatus` is the sole placeholder flag. `preview` means the page must
not present the values as an approved public account snapshot; `published`
means the exact candidate has passed the release workflow. Numeric zeroes are
never used to infer placeholder status.

The public JSON is fail-closed: unknown fields, inconsistent dates, conflicting
TWR duplicates, history before April, non-USD source values, invalid allocation
totals, incomplete metrics presented as complete, or privacy violations reject
the candidate and leave the previous release in place.
