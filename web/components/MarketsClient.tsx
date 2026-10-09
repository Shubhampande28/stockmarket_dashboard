"use client";

import { useCallback, useEffect, useState } from "react";
import MoversRow from "./MoversRow";
import { Skeleton, ErrorPanel, StaleWarning } from "./states/DataStates";
import { getSnapshot, type Snapshot, type StockRow } from "@/lib/api";
import { BACKEND_SECTOR_KEYS, displaySectorFor, DISPLAY_SECTORS } from "@/lib/market/sectors";
import { formatSignedPct, toneFor } from "@/lib/heatmap/scale";
import { marketStatus, relativeTime } from "@/lib/market/session";

function sectorAverages(snapshot: Snapshot) {
  const bySector = new Map<string, { sum: number; n: number }>();
  for (const key of BACKEND_SECTOR_KEYS) {
    const rows = snapshot[key];
    if (!Array.isArray(rows)) continue;
    const display = displaySectorFor(key);
    const entry = bySector.get(display) ?? { sum: 0, n: 0 };
    for (const r of rows as StockRow[]) {
      entry.sum += r.change;
      entry.n += 1;
    }
    bySector.set(display, entry);
  }
  return DISPLAY_SECTORS.map((label) => {
    const entry = bySector.get(label);
    return { label, avg: entry && entry.n > 0 ? entry.sum / entry.n : null };
  });
}

export default function MarketsClient({ initialSnapshot }: { initialSnapshot: Snapshot | null }) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [error, setError] = useState(!initialSnapshot);
  const status = marketStatus();

  const refresh = useCallback(async () => {
    try {
      const result = await getSnapshot();
      if ("error" in result) setError(true);
      else {
        setSnapshot(result);
        setError(false);
      }
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    if (status !== "open") return;
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 60_000);
    return () => clearInterval(interval);
  }, [status, refresh]);

  if (!snapshot && error) return <ErrorPanel onRetry={refresh} />;
  if (!snapshot) return <Skeleton height={500} />;

  const all = snapshot.all ?? [];
  const advances = all.filter((s) => s.change > 0).length;
  const declines = all.filter((s) => s.change < 0).length;
  const total = advances + declines || 1;
  const indexQuotes = Object.entries(snapshot.indexQuotes ?? {}).filter(([, q]) => typeof q.price === "number");

  return (
    <div>
      {snapshot._meta?.stale && <StaleWarning lastUpdated={relativeTime(new Date(snapshot._meta.computedAt * 1000).toISOString())} />}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {indexQuotes.map(([key, q]) => (
          <div key={key} className="rounded-[14px] border border-line p-3">
            <p className="text-xs text-ink-4">{q.label}</p>
            <p className="font-tabular text-lg font-bold">{q.price!.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
            <p className={`font-tabular text-sm ${(q.change ?? 0) >= 0 ? "up" : "down"}`}>{formatSignedPct(q.change ?? 0)}</p>
          </div>
        ))}
      </div>

      <div className="mb-6 flex items-center gap-2 text-sm font-medium text-ink-3">
        <span>{advances} advances</span>
        <div className="h-2 flex-1 max-w-[200px] overflow-hidden rounded-full bg-surface-3">
          <div className="h-full bg-up transition-[width] duration-[550ms]" style={{ width: `${(advances / total) * 100}%` }} />
        </div>
        <span>{declines} declines</span>
      </div>

      <h2 className="mb-2 text-lg font-bold">Sector performance</h2>
      <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {sectorAverages(snapshot).map((s) => {
          const tone = s.avg != null ? toneFor(s.avg) : { bg: "var(--surface-2)", fg: "var(--ink-4)" };
          return (
            <div key={s.label} className="rounded-[10px] p-3" style={{ backgroundColor: tone.bg, color: tone.fg }}>
              <p className="text-xs font-semibold">{s.label}</p>
              <p className="font-tabular text-sm">{s.avg != null ? formatSignedPct(s.avg) : "—"}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <MoversRow title="Top gainers" stocks={snapshot.gainers ?? []} />
        <MoversRow title="Top losers" stocks={snapshot.losers ?? []} />
      </div>
    </div>
  );
}
