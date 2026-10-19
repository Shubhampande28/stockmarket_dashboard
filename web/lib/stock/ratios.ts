/**
 * Ratios computed from Upstox statement line items (brief section 10.2).
 * Pure functions only -- no fetching here. Each returns `null` when an
 * input is missing or the ratio is undefined for that input (e.g. CAGR
 * across a sign change), so the caller hides the row rather than showing
 * a wrong number.
 *
 * NOT implemented here, confirmed unavailable from Upstox's fundamentals
 * API by live testing in Phase 2A: debt-to-equity and interest coverage
 * (no borrowings or finance-costs/EBIT line item anywhere), and free cash
 * flow (cash flow only gives an aggregate investing total, no capex
 * breakout). Promoter holding change is QoQ only, not YoY -- Share
 * Holdings only returns 4 quarters of history.
 */

export interface PeriodValue {
  period: string;
  value: number;
}

export function operatingMargin(revenue: number | null, operatingProfit: number | null): number | null {
  if (revenue == null || operatingProfit == null || revenue === 0) return null;
  return (operatingProfit / revenue) * 100;
}

export function netMargin(revenue: number | null, netProfit: number | null): number | null {
  if (revenue == null || netProfit == null || revenue === 0) return null;
  return (netProfit / revenue) * 100;
}

/** CAGR between two points `years` apart. `null` across a sign change or
 * non-positive base, since a percentage growth rate is undefined there. */
export function cagr(latest: number | null, earliest: number | null, years: number): number | null {
  if (latest == null || earliest == null || years <= 0) return null;
  if (earliest <= 0 || latest <= 0) return null;
  return (Math.pow(latest / earliest, 1 / years) - 1) * 100;
}

/** Sales/profit growth CAGR over 1, 3 or 5 years from a yearly series,
 * oldest first. `null` if that many years of history don't exist. */
export function growthOverYears(yearly: PeriodValue[], years: 1 | 3 | 5): number | null {
  if (yearly.length <= years) return null;
  const latest = yearly[yearly.length - 1].value;
  const earliest = yearly[yearly.length - 1 - years].value;
  return cagr(latest, earliest, years);
}

export function currentRatio(currentAssets: number | null, currentLiabilities: number | null): number | null {
  if (currentAssets == null || currentLiabilities == null || currentLiabilities === 0) return null;
  return currentAssets / currentLiabilities;
}

export function cashConversion(operatingCashFlow: number | null, netProfit: number | null): number | null {
  if (operatingCashFlow == null || netProfit == null || netProfit === 0) return null;
  return operatingCashFlow / netProfit;
}

/** Sum of per-share dividends with an ex-date in the trailing 365 days,
 * divided by the current price. `exDates` are ISO or any Date-parseable
 * string; `now` defaults to the current time. */
export function trailingDividendYield(
  dividends: { amountPerShare: number; exDate: string }[],
  price: number | null,
  now: Date = new Date()
): number | null {
  if (price == null || price <= 0) return null;
  const cutoff = now.getTime() - 365 * 24 * 60 * 60 * 1000;
  const total = dividends
    .filter((d) => new Date(d.exDate).getTime() >= cutoff)
    .reduce((sum, d) => sum + d.amountPerShare, 0);
  if (total <= 0) return null;
  return (total / price) * 100;
}

export function payoutRatio(totalDividends: number | null, netProfit: number | null): number | null {
  if (totalDividends == null || netProfit == null || netProfit <= 0) return null;
  return (totalDividends / netProfit) * 100;
}

/** Quarter-over-quarter change in promoter holding, in percentage points.
 * NOT year-over-year -- Upstox's Share Holdings endpoint only returns 4
 * quarters, so a same-quarter-last-year comparison isn't possible. */
export function promoterHoldingChangeQoQ(historyLatestFirst: PeriodValue[]): number | null {
  if (historyLatestFirst.length < 2) return null;
  return historyLatestFirst[0].value - historyLatestFirst[1].value;
}
