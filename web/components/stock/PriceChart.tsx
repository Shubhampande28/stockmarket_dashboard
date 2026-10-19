import Link from "next/link";
import type { StockHistory, StockHistoryRange } from "@/lib/api";
import { formatSignedPct } from "@/lib/heatmap/scale";

const RANGE_LABELS: Record<StockHistoryRange, string> = { "1W": "1W", "1M": "1M", "1Y": "1Y" };

export default function PriceChart({ symbol, history }: { symbol: string; history: StockHistory | null }) {
  const points = history?.points ?? [];
  const range = history?.range;
  const available = history?.availableRanges ?? [];

  const first = points[0]?.close;
  const last = points[points.length - 1]?.close;
  const changePct = first && last ? ((last - first) / first) * 100 : null;
  const up = (changePct ?? 0) >= 0;
  const color = up ? "var(--up-text)" : "var(--down-text)";

  const W = 640, H = 280, L = 4, R = 4, T = 10, B = 10;
  const iw = W - L - R, ih = H - T - B;
  let path = "";
  let fillPath = "";
  if (points.length > 1) {
    const closes = points.map((p) => p.close);
    const lo = Math.min(...closes);
    const hi = Math.max(...closes);
    const x = (i: number) => L + (iw * i) / (points.length - 1);
    const y = (v: number) => (hi === lo ? T + ih / 2 : T + ih * (1 - (v - lo) / (hi - lo)));
    path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.close).toFixed(1)}`).join(" ");
    fillPath = `${path} L ${x(points.length - 1).toFixed(1)} ${T + ih} L ${x(0).toFixed(1)} ${T + ih} Z`;
  }

  return (
    <div className="rounded-[18px] border border-line p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold">Price</h2>
          {changePct != null && (
            <span className="font-tabular text-sm font-semibold" style={{ color }}>
              {formatSignedPct(changePct)} over {range}
            </span>
          )}
        </div>
        {available.length > 0 && (
          <div className="flex items-center gap-0.5 rounded-full bg-surface-3 p-1">
            {available.map((r) => (
              <Link
                key={r}
                href={`?tab=overview&range=${r}`}
                scroll={false}
                aria-pressed={r === range}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  r === range ? "bg-surface text-ink shadow-sm" : "text-ink-3"
                }`}
              >
                {RANGE_LABELS[r]}
              </Link>
            ))}
          </div>
        )}
      </div>

      {points.length > 1 ? (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${symbol} price chart, ${range}`} className="w-full">
            {[0.25, 0.5, 0.75].map((f) => (
              <line key={f} x1={L} x2={W - R} y1={T + ih * f} y2={T + ih * f} stroke="var(--line)" strokeWidth={1} />
            ))}
            {fillPath && <path d={fillPath} fill={color} opacity={0.08} />}
            <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
          </svg>
          <div className="mt-1 flex justify-between font-tabular text-xs text-ink-4">
            <span>{points[0].date}</span>
            <span>{points[points.length - 1].date}</span>
          </div>
        </>
      ) : (
        <div className="flex h-[280px] items-center justify-center rounded-[14px] bg-surface-2 text-sm text-ink-4">
          Not enough price history yet for this stock.
        </div>
      )}
    </div>
  );
}
