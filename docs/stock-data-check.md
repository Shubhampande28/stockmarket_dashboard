# Stock data check: Upstox Company Fundamentals

Brief section 10.5 asks for a 20-stock reconciliation against each company's
own NSE filings before retiring the Yahoo/Apify/Screener fetches. **This is
a lighter spot-check, not that full audit** — three symbols, verified live
during Phase 2A/2 against Upstox's actual API responses (not filings), to
confirm the endpoints behave as documented and the numbers are internally
sane. A fuller 20-company reconciliation against NSE filings, per section
10.5's original scope, is still recommended before fully trusting these
numbers for anything beyond display, and before removing the NSE/Screener
fetches that currently back Book value, Face value and the news feed.

## Symbols checked

| Symbol | ISIN | Why chosen |
|---|---|---|
| RELIANCE | INE002A01018 | Large cap, industrial |
| HDFCBANK | INE040A01034 | Bank — different Key Ratios set |
| IDEA (Vodafone Idea) | INE669E01016 | Negative book value / thin margins |

All three calls were made live against `https://api.upstox.com/v2/fundamentals/`
on 19 Oct 2026 using the backend's existing long-lived Analytics Token.

## What was checked

- **Endpoint shape matches docs**, with one confirmed exception: `competitors`
  rejects a bare ISIN (`UDAPI100011 Invalid Instrument key`) and actually
  needs the full `EXCHANGE|ISIN` instrument key, despite its own docs page
  saying "by ISIN". The client (`backend/upstox_fundamentals.py`) builds the
  instrument key itself before calling it.
- **Key Ratios is sector-aware server-side**, not something we need to branch
  on ourselves:
  - RELIANCE (industrial): P/E, P/B, ROA, ROE, ROCE, Quick Ratio, EV/EBITDA
    (7 fields — the docs list only 6, Quick Ratio is undocumented but real).
  - HDFCBANK (bank): P/E, P/B, **NIM, ROA, ROE, Net NPA, CASA** — ROCE and
    EV/EBITDA are dropped automatically. This is better than the brief
    assumed: section 10.2 says bank-specific metrics "are not in the Upstox
    docs" — they're not in the *docs*, but they are in the live response.
  - IDEA: P/E `3.64` (positive, despite a history of losses — Upstox's P/E
    basis/period isn't documented, so this is taken at face value), P/B
    `-2.58` (negative — consistent with negative shareholder equity), ROCE
    `-1.58%` (shown as a plain negative number by Upstox itself, not
    specially flagged).
- **Balance sheet depth differs sharply by type**: RELIANCE's `full_statement`
  has 8 line items (Non-Current Assets, Current Assets, Total Assets,
  Current Liabilities, Net Current Asset, Non-Current Liabilities, Equity
  Capital, Total Equity & Liabilities). HDFCBANK's has only 3 (Total Assets,
  Equity Capital, Total Equity & Liabilities) — consistent with how a bank's
  balance sheet is actually structured (no current-asset/liability split),
  and it's why current ratio is correctly hidden for banks: the fields
  genuinely don't exist for them, not just a display choice.
- **Share Holdings returns exactly 4 quarters** for all three symbols (Jun
  2026 back to Sep 2025 at the time of testing) — confirmed not enough for
  a same-quarter-last-year promoter-holding comparison, only quarter-over-
  quarter.
- **Corporate Actions**: HDFCBANK returned one real dividend event (₹13/share,
  ex-date 19 Jun 2026, Final) with full `event_details`. No bonus/split/rights
  samples were available to check for any of the three symbols at test time.
- **Income Statement EPS**: present as `EPS - Basic` / `EPS - Diluted` in
  `full_statement` for RELIANCE, confirmed annual-only (never returned when
  `time_period=quarterly`, since `full_statement` ignores that parameter).

## Confirmed gaps (not shipped, not guessed)

These are structural — not a data-quality issue with any one symbol, so
they won't resolve with a bigger sample:

- **Debt-to-equity, interest coverage**: no borrowings/debt line item and no
  finance-costs/EBIT line item anywhere in Balance Sheet or Income Statement,
  for any of the three symbols.
- **Free cash flow**: Cash Flow only returns aggregate operating/investing/
  financing totals, no capex breakout.
- **YoY promoter holding change**: only 4 quarters of history returned.
- **EPS, full line-item statements**: annual only, never quarterly.

## What this check does *not* cover

- No cross-reference against RELIANCE/HDFCBANK/IDEA's own NSE filings or
  annual reports — section 10.5 asks for that comparison with a 2% tolerance,
  which wasn't done here.
- No insurer, NBFC, or split/bonus-adjusted symbol was checked (the brief's
  full list calls for 1 insurer, 1 NBFC, 2 split/bonus cases).
- No rate-limit or sustained-load testing — only 9 sequential calls per
  symbol, which took ~5s uncached per full `/api/fundamentals/<symbol>` call.

**Recommendation**: treat the Upstox fundamentals data as display-ready (it's
what the stock page now shows), but do the fuller 20-symbol filings
reconciliation before using these numbers for anything where a 2%+
discrepancy would matter (e.g. an automated screen or alert).
