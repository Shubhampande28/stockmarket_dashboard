import Link from "next/link";
import { formatSignedPct } from "@/lib/heatmap/scale";
import type { StockQuote } from "@/lib/market/types";

export default function StockInspector({
  stock,
  sectorAvgChange,
  indexChangePct,
}: {
  stock: StockQuote | null;
  sectorAvgChange: number;
  indexChangePct: number;
}) {
  if (!stock) {
    return (
      <div className="rounded-[18px] border border-line p-4 text-sm text-ink-4">
        Select a stock on the map to see its details.
      </div>
    );
  }

  const vsIndex = stock.changePct - indexChangePct;
  const up = stock.changePct >= 0;

  return (
    <div className="rounded-[18px] border border-line p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-ink">{stock.sector}</p>
      <h3 className="text-[1.75rem] font-bold">{stock.symbol}</h3>
      <p className="mb-2 text-sm text-ink-3">{stock.name}</p>
      <div className={`flex items-baseline gap-1 font-tabular text-[2.5rem] font-bold leading-none ${up ? "up" : "down"}`}>
        <span aria-hidden="true">{up ? "▲" : "▼"}</span>
        {formatSignedPct(stock.changePct)}
      </div>
      <p className="mb-3 text-xs text-ink-4">today, vs previous close</p>

      <div className="space-y-1.5 border-t border-line pt-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-ink-4">Sector today</span>
          <span className={`font-tabular ${sectorAvgChange >= 0 ? "up" : "down"}`}>{formatSignedPct(sectorAvgChange)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-ink-4">vs Nifty 50 ({formatSignedPct(indexChangePct)})</span>
          <span className={`font-tabular ${vsIndex >= 0 ? "up" : "down"}`}>
            {vsIndex >= 0 ? "Beat by" : "Lagged by"} {Math.abs(vsIndex).toFixed(2)} pts
          </span>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <Link
          href={`/financials?symbol=${stock.symbol}`}
          className="rounded-[12px] bg-ink px-3 py-2 text-sm font-semibold text-white"
        >
          Open financials
        </Link>
        <button
          type="button"
          disabled
          title="Focus Lists are rule-based screens, not a watchlist you add stocks to yet"
          className="rounded-[12px] border border-line-2 px-3 py-2 text-sm font-semibold text-ink-4"
        >
          Add to Focus List
        </button>
      </div>
    </div>
  );
}
