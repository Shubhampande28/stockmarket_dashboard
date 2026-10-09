import Link from "next/link";
import type { StockRow } from "@/lib/api";
import { formatSignedPct, toneFor } from "@/lib/heatmap/scale";

/** Netflix-style horizontally scrollable row of stock cards. */
export default function MoversRow({ title, stocks }: { title: string; stocks: StockRow[] }) {
  if (stocks.length === 0) return null;
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-ink-3">{title}</h3>
      <div className="scroll-x-strip flex gap-2 pb-1">
        {stocks.map((s) => {
          const symbol = s.symbol.replace(".NS", "");
          const tone = toneFor(s.change);
          return (
            <Link
              key={symbol}
              href={`/heatmap?stock=${symbol}`}
              className="shrink-0 rounded-[8px] px-3 py-2 transition-transform hover:scale-[1.03]"
              style={{ backgroundColor: tone.bg, color: tone.fg }}
            >
              <div className="font-tabular text-sm font-bold">{symbol}</div>
              <div className="font-tabular text-xs">{formatSignedPct(s.change)}</div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
