import Link from "next/link";
import type { StockRow } from "@/lib/api";
import { formatSignedPct } from "@/lib/heatmap/scale";

/** Ranked vertical list of movers, linking to each stock's own page. */
export default function MoversRow({ title, stocks }: { title: string; stocks: StockRow[] }) {
  if (stocks.length === 0) return null;
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-ink-3">{title}</h3>
      <ol className="divide-y divide-line overflow-hidden rounded-[14px] border border-line">
        {stocks.map((s, i) => {
          const symbol = s.symbol.replace(".NS", "");
          return (
            <li key={symbol}>
              <Link href={`/stock/${symbol}`} className="flex items-center gap-3 px-3 py-2.5 hover:bg-surface-2">
                <span className="w-5 shrink-0 font-tabular text-xs text-ink-4">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-tabular text-sm font-semibold">{symbol}</span>
                  <span className="block truncate text-xs text-ink-4">{s.name}</span>
                </span>
                <span className={`shrink-0 font-tabular text-sm font-semibold ${s.change >= 0 ? "up" : "down"}`}>
                  {formatSignedPct(s.change)}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
