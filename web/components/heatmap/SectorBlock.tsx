import Tile from "./Tile";
import { formatSignedPct } from "@/lib/heatmap/scale";
import type { TreemapRect } from "@/lib/heatmap/treemap";
import type { StockQuote } from "@/lib/market/types";

/** Renders a sector's header + its own nested stock treemap, filling
 * whatever box the caller places it in (absolute-positioned on desktop,
 * a flex item sized by weight on mobile -- see HeatmapClient). */
export default function SectorBlock({
  sectorId,
  stocks,
  stockRects,
  stocksById,
  selectedSymbol,
  onSelect,
}: {
  sectorId: string;
  stocks: StockQuote[];
  stockRects: TreemapRect[];
  stocksById: Map<string, StockQuote>;
  selectedSymbol: string | null;
  onSelect: (symbol: string) => void;
}) {
  const totalWeight = stocks.reduce((a, b) => a + (b.weight ?? 1), 0) || 1;
  const avgChange = stocks.reduce((a, b) => a + b.changePct * (b.weight ?? 1), 0) / totalWeight;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-[14px] bg-surface-2 p-1.5">
      <div className="flex items-baseline justify-between px-1 pb-1">
        <span className="truncate text-[12px] font-semibold text-ink-2">{sectorId}</span>
        <span className={`font-tabular text-[12px] shrink-0 pl-2 ${avgChange >= 0 ? "up" : "down"}`}>
          {formatSignedPct(avgChange)}
        </span>
      </div>
      <div className="relative flex-1">
        {stockRects.map((r) => {
          const stock = stocksById.get(r.id);
          if (!stock) return null;
          return (
            <Tile key={r.id} rect={r} stock={stock} selected={selectedSymbol === r.id} onSelect={onSelect} />
          );
        })}
      </div>
    </div>
  );
}
