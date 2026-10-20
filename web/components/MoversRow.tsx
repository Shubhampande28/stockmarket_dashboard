import Link from "next/link";
import type { StockRow } from "@/lib/api";
import { formatSignedPct, toneFor } from "@/lib/heatmap/scale";

/** Ranked vertical list of movers, each row tinted by toneFor's diverging
 * scale (same magnitude-based fill as the sector tiles), linking to each
 * stock's own page. */
export default function MoversRow({ title, stocks }: { title: string; stocks: StockRow[] }) {
  if (stocks.length === 0) return null;
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-ink-3">{title}</h3>
      <ol className="flex flex-col gap-1.5">
        {stocks.map((s, i) => {
          const symbol = s.symbol.replace(".NS", "");
          const tone = toneFor(s.change);
          return (
            <li key={symbol}>
              <Link
                href={`/stock/${symbol}`}
                className="flex items-center gap-3 rounded-[10px] px-3 py-2.5 transition-opacity hover:opacity-90"
                style={{ backgroundColor: tone.bg, color: tone.fg }}
              >
                <span className="w-5 shrink-0 font-tabular text-xs opacity-70">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-tabular text-sm font-semibold">{symbol}</span>
                  <span className="block truncate text-xs opacity-80">{s.name}</span>
                </span>
                <span className="shrink-0 font-tabular text-sm font-semibold">{formatSignedPct(s.change)}</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
