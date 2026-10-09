import type { Snapshot, StockRow } from "@/lib/api";
import type { HeatmapData, IndexId, StockQuote, WeightSource } from "./types";
import { BACKEND_SECTOR_KEYS, displaySectorFor } from "./sectors";
import { marketStatus } from "./session";

const INDEX_LABELS: Record<IndexId, string> = {
  nifty50: "Nifty 50",
  banknifty: "Bank Nifty",
  finnifty: "Fin Nifty",
  sensex: "Sensex",
  midcpnifty: "Midcap Select",
};

export { INDEX_LABELS };

/** Which backend sector key each stock symbol (without ".NS") belongs to,
 * built once per snapshot from the top-level sector arrays /stocks already
 * returns (app.py's **sector_stocks unpacking). */
function buildSymbolToSector(snapshot: Snapshot): Map<string, string> {
  const map = new Map<string, string>();
  for (const key of BACKEND_SECTOR_KEYS) {
    const rows = snapshot[key];
    if (!Array.isArray(rows)) continue;
    for (const row of rows as StockRow[]) {
      map.set(row.symbol.replace(".NS", ""), key);
    }
  }
  return map;
}

/** Adapts the Flask /stocks snapshot into the brief's HeatmapData contract.
 * Tile sizing per the brief's own fallback rule: index weight (not
 * available from this data layer) -> free-float market cap (we have plain
 * market cap, used as a documented proxy) -> equal weight + a note. */
export function adaptSnapshotToHeatmap(
  snapshot: Snapshot,
  index: IndexId,
  stocks: StockRow[]
): HeatmapData {
  const symbolToSector = buildSymbolToSector(snapshot);

  const marketCaps = stocks
    .map((s) => s.marketCap)
    .filter((v): v is number => typeof v === "number" && v > 0);
  // Market cap as the weight source needs it on most of the universe, not
  // just a few names, or the map would mostly show the equal-weight
  // fallback size with a handful of real-sized outliers -- misleading.
  const weightSource: WeightSource = marketCaps.length >= stocks.length * 0.5 ? "market-cap" : "equal";
  const minKnownMarketCap = marketCaps.length > 0 ? Math.min(...marketCaps) : 1;

  const quotes: StockQuote[] = stocks.map((s) => {
    const symbol = s.symbol.replace(".NS", "");
    const weight =
      weightSource === "market-cap"
        ? (s.marketCap ?? minKnownMarketCap) // missing for this one stock -> smallest known tile, not zero
        : 1; // equal weight fallback -- every tile the same size
    return {
      symbol,
      name: s.name,
      sector: displaySectorFor(symbolToSector.get(symbol)),
      ltp: s.price,
      changePct: s.change,
      weight,
    };
  });

  const indexQuote = snapshot.indexQuotes?.[index];

  return {
    index,
    indexLevel: indexQuote?.price ?? 0,
    indexChangePct: indexQuote?.change ?? 0,
    asOf: snapshot._meta ? new Date(snapshot._meta.computedAt * 1000).toISOString() : new Date().toISOString(),
    marketStatus: marketStatus(),
    stocks: quotes,
    weightSource,
  };
}
