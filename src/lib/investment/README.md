# Public investment data boundary

This directory is the one-way boundary between private IBKR/Flex data and the
static public site. It never connects to IBKR and exposes no trading methods.

An adapter implements `PrivateInvestmentSourceAdapter` and maps already-parsed
private data into `InvestmentSourceSnapshotSchema`. The normalized source is
strict: it contains only whole-account daily TWR, public market values, public
contract details, and option fills needed for weekly aggregation. Account IDs,
cash, financing, margin, net liquidation value, credentials, raw payloads,
stock quantities, stock cost basis, order IDs, and dollar P&L are not accepted.

Use `buildPublicInvestmentPanelFromAdapter()` to produce a
`PublicInvestmentPanel`. The builder merges overlapping Flex chunks, rejects
conflicting duplicates or missing expected trading dates, compounds TWR,
normalizes allocations from public absolute market values, aggregates option
trades by week, scans for privacy violations, and finally validates all public
invariants with Zod.

An optional private `chartStartDate` rebases the public weekly index to 100 on
that completed week while `inceptionDate` and `sinceInceptionReturnPct` retain
the complete account history. The public DTO needs no extra chart metadata: its
first weekly-series row is the explicit zero-return, index-100 baseline.
