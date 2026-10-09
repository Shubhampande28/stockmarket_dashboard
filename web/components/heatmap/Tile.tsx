"use client";

import { useEffect, useRef, useState } from "react";
import { toneFor, formatSignedPct } from "@/lib/heatmap/scale";
import type { TreemapRect } from "@/lib/heatmap/treemap";
import type { StockQuote } from "@/lib/market/types";

export default function Tile({
  rect,
  stock,
  selected,
  onSelect,
}: {
  rect: TreemapRect;
  stock: StockQuote;
  selected: boolean;
  onSelect: (symbol: string) => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [px, setPx] = useState({ w: 0, h: 0 });

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const ro = new ResizeObserver(([entry]) => {
      setPx({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const tone = toneFor(stock.changePct);
  const labelLevel = px.w >= 140 && px.h >= 90 ? "full" : px.w >= 64 && px.h >= 44 ? "mid" : px.w >= 40 && px.h >= 24 ? "symbol" : "none";

  return (
    <button
      ref={ref}
      type="button"
      onClick={() => onSelect(stock.symbol)}
      aria-label={`${stock.name}, ${stock.changePct >= 0 ? "up" : "down"} ${Math.abs(stock.changePct).toFixed(2)} percent`}
      className="absolute overflow-hidden rounded-[8px] transition-colors duration-[550ms] ease-linear"
      style={{
        left: `${rect.xPct}%`,
        top: `${rect.yPct}%`,
        width: `${rect.widthPct}%`,
        height: `${rect.heightPct}%`,
        margin: "1.5px",
        backgroundColor: tone.bg,
        color: tone.fg,
        boxShadow: selected ? "inset 0 0 0 2px #0B0B0C, inset 0 0 0 3.5px #FFFFFF" : undefined,
      }}
    >
      {labelLevel !== "none" && (
        <span className="absolute inset-0 flex flex-col items-start justify-start gap-0.5 overflow-hidden p-1.5 text-left">
          {labelLevel === "full" && (
            <>
              <span className="font-tabular text-[24px] font-bold leading-none">{stock.symbol}</span>
              <span className="truncate text-[12px] leading-none opacity-90">{stock.name}</span>
              <span className="font-tabular text-[15px] leading-none">{formatSignedPct(stock.changePct)}</span>
            </>
          )}
          {labelLevel === "mid" && (
            <>
              <span className="font-tabular text-[14px] font-bold leading-none">{stock.symbol}</span>
              <span className="font-tabular text-[12px] leading-none">{formatSignedPct(stock.changePct)}</span>
            </>
          )}
          {labelLevel === "symbol" && (
            <span className="font-tabular text-[11px] font-semibold leading-none">{stock.symbol}</span>
          )}
        </span>
      )}
    </button>
  );
}
