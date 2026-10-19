/** Types for the backend's bundled /api/fundamentals/<symbol> response
 * (brief section 10). Field names mirror Upstox's raw response shape,
 * confirmed live in Phase 2A -- see upstox_fundamentals.py for the
 * endpoint-by-endpoint notes on what's real vs documented. */

export interface UpstoxMoneyAmount {
  value: number;
  unit: string;
  formatted: string;
}

export interface UpstoxProfile {
  company_profile: string;
  sector: string;
  sector_market_cap_inr?: UpstoxMoneyAmount;
  sector_market_cap_usd?: UpstoxMoneyAmount;
}

export interface UpstoxKeyRatio {
  name: string;
  company_value: string;
  sector_value: string;
}

export interface UpstoxFullStatementRow {
  particular: string;
  history: { period: string; value: number | null }[];
}

export interface UpstoxBalanceSheet {
  type: string;
  time_period: string;
  units_in: string;
  history: { total_asset: number; total_liability: number; period: string }[];
  full_statement?: UpstoxFullStatementRow[];
}

export interface UpstoxStatementCategoryPoint {
  value: number;
  period: string;
  change?: string;
}

export interface UpstoxStatementCategory {
  category: string;
  history: UpstoxStatementCategoryPoint[];
}

export interface UpstoxCashFlow {
  type: string;
  time_period: string;
  units_in: string;
  cash_flow: UpstoxStatementCategory[];
  full_statement?: UpstoxFullStatementRow[];
}

export interface UpstoxIncomeStatement {
  type: string;
  time_period: string;
  units_in: string;
  income_statement: UpstoxStatementCategory[];
  full_statement?: UpstoxFullStatementRow[];
}

export interface UpstoxShareHoldingCategory {
  category: "promoters" | "fii" | "other_dii" | "mutual_funds" | "retail_and_other" | string;
  history: { value: number; period: string }[];
}

export interface UpstoxCorporateAction {
  name: "Dividend" | "Bonus" | "Split" | "Rights" | string;
  expiry_date: string;
  amount: number | null;
  ratio: string | null;
  event_details: { name: string; value: string }[];
}

export interface UpstoxCompetitor {
  instrument_key: string;
  company_profile: string;
  sector: string;
  sector_market_cap_inr?: UpstoxMoneyAmount;
  sector_market_cap_usd?: UpstoxMoneyAmount;
  symbol: string | null;
}

export interface FundamentalsBundle {
  symbol: string;
  isin: string;
  stale: boolean;
  asOf: number | null; // epoch seconds
  profile: UpstoxProfile | null;
  keyRatios: UpstoxKeyRatio[] | null;
  balanceSheet: UpstoxBalanceSheet | null;
  cashFlow: UpstoxCashFlow | null;
  incomeStatementQuarterly: UpstoxIncomeStatement | null;
  incomeStatementAnnual: UpstoxIncomeStatement | null;
  shareHoldings: UpstoxShareHoldingCategory[] | null;
  corporateActions: UpstoxCorporateAction[] | null;
  competitors: UpstoxCompetitor[] | null;
}

function baseUrl() {
  return typeof window === "undefined" ? process.env.FLASK_API_BASE ?? "http://127.0.0.1:5000" : "";
}

export async function getFundamentals(symbol: string): Promise<FundamentalsBundle | { error: string }> {
  const res = await fetch(`${baseUrl()}/api/fundamentals/${encodeURIComponent(symbol)}`, { cache: "no-store" });
  return res.json();
}

/** The Quick Ratio / NIM / CASA set of names Upstox already filters by
 * sector server-side (confirmed live: banks get NIM/Net NPA/CASA instead
 * of ROCE/EV/EBITDA) -- rendered in this fixed display order when present. */
export const KEY_RATIO_ORDER = ["P/E", "P/B", "ROE", "ROA", "ROCE", "NIM", "Net NPA", "CASA", "Quick Ratio", "EV/EBITDA"];
