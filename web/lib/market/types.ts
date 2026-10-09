export type IndexId = "nifty50" | "banknifty" | "finnifty" | "sensex" | "midcpnifty";
export type MarketStatus = "pre-open" | "open" | "closed";

export interface StockQuote {
  symbol: string; // "HDFCBANK"
  name: string;
  sector: string; // normalised sector key, see lib/market/sectors.ts
  ltp: number;
  changePct: number;
  /** Index weight if the data layer ever provides one (it doesn't today),
   * else a market-cap-derived weight (see sectors.ts), else null. Never
   * fabricated -- see weightSource below. */
  weight: number | null;
}

export type WeightSource = "index-weight" | "market-cap" | "equal";

export interface HeatmapData {
  index: IndexId;
  indexLevel: number;
  indexChangePct: number;
  asOf: string; // ISO timestamp
  marketStatus: MarketStatus;
  stocks: StockQuote[];
  weightSource: WeightSource;
}
