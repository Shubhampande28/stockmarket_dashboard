import type { Snapshot, StockRow } from "./api";

export interface SearchResult {
  symbol: string;
  name: string;
  price: number;
  change: number;
}

/** Prefix matches first, then contains matches, on symbol or company name
 * (brief section 4). Shared by /api/search and the /search results page. */
export function matchStocks(snapshot: Snapshot, query: string, limit = 6): SearchResult[] {
  const needle = query.trim().toUpperCase();
  if (!needle) return [];

  const rows = snapshot.all ?? [];
  const prefixMatches: StockRow[] = [];
  const containsMatches: StockRow[] = [];
  for (const row of rows) {
    const symbol = row.symbol.replace(".NS", "");
    const name = row.name.toUpperCase();
    if (symbol.startsWith(needle) || name.startsWith(needle)) {
      prefixMatches.push(row);
    } else if (symbol.includes(needle) || name.includes(needle)) {
      containsMatches.push(row);
    }
  }

  return [...prefixMatches, ...containsMatches].slice(0, limit).map((row) => ({
    symbol: row.symbol.replace(".NS", ""),
    name: row.name,
    price: row.price,
    change: row.change,
  }));
}
