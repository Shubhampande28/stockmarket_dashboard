"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import SectorBlock from "./SectorBlock";
import StockInspector from "./StockInspector";
import BiggestMovers from "./BiggestMovers";
import { Skeleton, ErrorPanel, ClosedNotice, StaleWarning } from "@/components/states/DataStates";
import { getSnapshot, type Snapshot, type StockRow } from "@/lib/api";
import { adaptSnapshotToHeatmap, INDEX_LABELS } from "@/lib/market/adapter";
import { DISPLAY_SECTORS } from "@/lib/market/sectors";
import { buildTwoLevelLayout, type SectorGroup } from "@/lib/heatmap/treemap";
import { LEGEND_STEPS } from "@/lib/heatmap/scale";
import type { IndexId, StockQuote } from "@/lib/market/types";
import { marketStatus, nextOpenLabel, relativeTime } from "@/lib/market/session";

const INDEX_IDS: IndexId[] = ["nifty50", "banknifty", "finnifty", "sensex", "midcpnifty"];

export default function HeatmapClient({ initialSnapshot }: { initialSnapshot: Snapshot | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [error, setError] = useState(!initialSnapshot);
  const [loading, setLoading] = useState(false);

  const urlIndex = (searchParams.get("index") as IndexId | null) ?? "nifty50";
  const index: IndexId = INDEX_IDS.includes(urlIndex) ? urlIndex : "nifty50";
  const selectedSymbol = searchParams.get("stock");

  const status = marketStatus();

  const fetchSnapshot = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getSnapshot();
      if ("error" in result) {
        setError(true);
      } else {
        setSnapshot(result);
        setError(false);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status !== "open") return;
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") fetchSnapshot();
    }, 60_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") fetchSnapshot();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [status, fetchSnapshot]);

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(searchParams.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  const heatmapData = useMemo(() => {
    if (!snapshot) return null;
    const rows = snapshot[index];
    if (!Array.isArray(rows)) return null;
    return adaptSnapshotToHeatmap(snapshot, index, rows as StockRow[]);
  }, [snapshot, index]);

  const groups: SectorGroup[] = useMemo(() => {
    if (!heatmapData) return [];
    const bySector = new Map<string, StockQuote[]>();
    for (const s of heatmapData.stocks) {
      const list = bySector.get(s.sector) ?? [];
      list.push(s);
      bySector.set(s.sector, list);
    }
    return DISPLAY_SECTORS.filter((d) => bySector.has(d)).map((d) => ({
      sectorId: d,
      stocks: bySector.get(d)!.map((s) => ({ id: s.symbol, weight: s.weight ?? 1 })),
    }));
  }, [heatmapData]);

  const stocksById = useMemo(() => {
    const map = new Map<string, StockQuote>();
    heatmapData?.stocks.forEach((s) => map.set(s.symbol, s));
    return map;
  }, [heatmapData]);

  const layout = useMemo(() => buildTwoLevelLayout(groups), [groups]);

  const defaultStock = useMemo(() => {
    if (!heatmapData || heatmapData.stocks.length === 0) return null;
    return [...heatmapData.stocks].sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0))[0].symbol;
  }, [heatmapData]);

  const activeSymbol = selectedSymbol ?? defaultStock;
  const activeStock = activeSymbol ? stocksById.get(activeSymbol) ?? null : null;
  const sectorAvgForActive = useMemo(() => {
    if (!activeStock) return 0;
    const peers = heatmapData?.stocks.filter((s) => s.sector === activeStock.sector) ?? [];
    const totalW = peers.reduce((a, b) => a + (b.weight ?? 1), 0) || 1;
    return peers.reduce((a, b) => a + b.changePct * (b.weight ?? 1), 0) / totalW;
  }, [activeStock, heatmapData]);

  const advances = heatmapData?.stocks.filter((s) => s.changePct > 0).length ?? 0;
  const declines = heatmapData?.stocks.filter((s) => s.changePct < 0).length ?? 0;
  const breadthTotal = advances + declines || 1;

  if (!heatmapData && error) {
    return (
      <div className="mx-auto max-w-[1360px] px-5 py-8 lg:px-10">
        <ErrorPanel onRetry={fetchSnapshot} />
      </div>
    );
  }
  if (!heatmapData) {
    return (
      <div className="mx-auto max-w-[1360px] px-5 py-8 lg:px-10">
        <Skeleton height={640} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1360px] px-5 py-8 lg:px-10">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-ink">Market Map</p>
          <h1 className="text-[2rem] font-bold tracking-tight sm:text-[2.5rem]">
            {INDEX_LABELS[index]}, at a glance
          </h1>
          <p className="max-w-[60ch] text-sm text-ink-4">
            Tile size is the stock&apos;s weight in the index{heatmapData.weightSource === "market-cap" ? " (approximated from market cap)" : heatmapData.weightSource === "equal" ? " -- unavailable today, tiles are equal size" : ""}.
            Colour is today&apos;s move. Select any tile for details.
          </p>
        </div>
        <p className="inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-surface-3 px-3 py-1 text-xs font-semibold" aria-live="polite">
          {status === "open" && <span className="h-2 w-2 rounded-full bg-live" aria-hidden="true" />}
          {status === "open" ? `Live · updated ${relativeTime(heatmapData.asOf)}` : `Closed · showing last close`}
        </p>
      </div>

      {status !== "open" && <ClosedNotice label={nextOpenLabel()} />}
      {snapshot?._meta?.stale && status === "open" && (
        <StaleWarning lastUpdated={relativeTime(heatmapData.asOf)} />
      )}

      {/* Controls */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="scroll-x-strip flex gap-1.5">
          {INDEX_IDS.map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={id === index}
              onClick={() => setParam("index", id === "nifty50" ? null : id)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium ${
                id === index ? "border-ink bg-ink text-white" : "border-line-2 text-ink-3"
              }`}
            >
              {INDEX_LABELS[id]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-ink-3">
          <span>{advances} up</span>
          <div className="h-2 w-28 overflow-hidden rounded-full bg-surface-3">
            <div
              className="h-full bg-live transition-[width] duration-[550ms]"
              style={{ width: `${(advances / breadthTotal) * 100}%` }}
            />
          </div>
          <span>{declines} down</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-5">
        {/* Map */}
        <div className="min-w-0 flex-[999_1_720px]">
          {/* Desktop: absolute-positioned treemap sector blocks */}
          <div
            className="relative hidden gap-1.5 lg:block"
            style={{ height: 640 }}
            role="group"
            aria-label={`${INDEX_LABELS[index]} heatmap`}
          >
            {layout.sectorRects.map((rect) => {
              const group = groups.find((g) => g.sectorId === rect.id)!;
              const stocks = group.stocks.map((s) => stocksById.get(s.id)!).filter(Boolean);
              return (
                <div
                  key={rect.id}
                  className="absolute"
                  style={{ left: `${rect.xPct}%`, top: `${rect.yPct}%`, width: `${rect.widthPct}%`, height: `${rect.heightPct}%` }}
                >
                  <SectorBlock
                    sectorId={rect.id}
                    stocks={stocks}
                    stockRects={layout.stockRectsBySector[rect.id] ?? []}
                    stocksById={stocksById}
                    selectedSymbol={activeSymbol}
                    onSelect={(symbol) => setParam("stock", symbol)}
                  />
                </div>
              );
            })}
          </div>

          {/* Mobile: vertical stack, each sector's height proportional to its weight */}
          <div className="flex flex-col gap-1.5 lg:hidden" role="group" aria-label={`${INDEX_LABELS[index]} heatmap`}>
            {layout.sectorRects.map((rect) => {
              const group = groups.find((g) => g.sectorId === rect.id)!;
              const stocks = group.stocks.map((s) => stocksById.get(s.id)!).filter(Boolean);
              const weight = group.stocks.reduce((a, b) => a + b.weight, 0);
              return (
                <div key={rect.id} style={{ flex: `${weight} 1 120px`, minHeight: 120 }}>
                  <SectorBlock
                    sectorId={rect.id}
                    stocks={stocks}
                    stockRects={layout.stockRectsBySector[rect.id] ?? []}
                    stocksById={stocksById}
                    selectedSymbol={activeSymbol}
                    onSelect={(symbol) => setParam("stock", symbol)}
                  />
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {LEGEND_STEPS.map((s) => (
              <span key={s.label} className="flex items-center gap-1 text-[11px] text-ink-4">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: s.tone.bg }} />
                {s.label}
              </span>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-4">
            Quotes may be delayed. For information only, not investment advice.
          </p>

          {/* Mobile: inspector + movers below the map (simplified from a
              true overlay bottom-sheet, see docs/REVAMP_NOTES.md) */}
          <div className="mt-5 lg:hidden">
            <StockInspector stock={activeStock} sectorAvgChange={sectorAvgForActive} indexChangePct={heatmapData.indexChangePct} />
            <BiggestMovers stocks={heatmapData.stocks} onSelect={(symbol) => setParam("stock", symbol)} />
          </div>
        </div>

        {/* Desktop side panel */}
        <div className="hidden min-w-[280px] flex-[1_1_300px] lg:block">
          <StockInspector stock={activeStock} sectorAvgChange={sectorAvgForActive} indexChangePct={heatmapData.indexChangePct} />
          <BiggestMovers stocks={heatmapData.stocks} onSelect={(symbol) => setParam("stock", symbol)} />
        </div>
      </div>

      {loading && <p className="mt-3 text-xs text-ink-4">Refreshing…</p>}
    </div>
  );
}
