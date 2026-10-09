import { formatSignedPct } from "@/lib/heatmap/scale";
import type { StockQuote } from "@/lib/market/types";

function sortedTop(stocks: StockQuote[], direction: "up" | "down", count = 3) {
  return [...stocks]
    .sort((a, b) => (direction === "up" ? b.changePct - a.changePct : a.changePct - b.changePct))
    .slice(0, count);
}

function MoversColumn({
  title,
  rows,
  onSelect,
}: {
  title: string;
  rows: StockQuote[];
  onSelect: (symbol: string) => void;
}) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-ink-4">{title}</p>
      {rows.map((s) => (
        <button
          key={s.symbol}
          type="button"
          onClick={() => onSelect(s.symbol)}
          className="flex w-full items-center justify-between rounded-[8px] px-1.5 py-1.5 text-left text-sm hover:bg-surface-2"
        >
          <span className="font-semibold">{s.symbol}</span>
          <span className={`font-tabular ${s.changePct >= 0 ? "up" : "down"}`}>{formatSignedPct(s.changePct)}</span>
        </button>
      ))}
    </div>
  );
}

export default function BiggestMovers({
  stocks,
  onSelect,
}: {
  stocks: StockQuote[];
  onSelect: (symbol: string) => void;
}) {
  const gainers = sortedTop(stocks, "up");
  const losers = sortedTop(stocks, "down");

  return (
    <div className="mt-4 grid grid-cols-2 gap-3 rounded-[18px] border border-line p-4">
      <MoversColumn title="Gainers" rows={gainers} onSelect={onSelect} />
      <MoversColumn title="Losers" rows={losers} onSelect={onSelect} />
    </div>
  );
}
