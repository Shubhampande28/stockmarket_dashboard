"use client";

import { useEffect, useMemo, useState } from "react";

export type StockCardProps = {
  name: string;
  price: number;
  change: number;
  rank: number;
  pe: number;
  roe: number;
  volume: string;
  trend: number[];
  insight: string;
};

type StockCardGridProps = {
  stocks: StockCardProps[];
};

function formatNumber(value: number, maximumFractionDigits = 2) {
  return Number.isFinite(value)
    ? value.toLocaleString("en-IN", { maximumFractionDigits })
    : "--";
}

function getStockPath(name: string) {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `/stock/${encodeURIComponent(slug || name)}`;
}

function getSparklinePoints(values: number[]) {
  const width = 100;
  const height = 32;
  const safeValues = values.length ? values : [0, 0];
  const min = Math.min(...safeValues);
  const max = Math.max(...safeValues);
  const range = max - min || 1;
  const step = width / Math.max(safeValues.length - 1, 1);

  return safeValues
    .map((value, index) => {
      const x = index * step;
      const y = height - ((value - min) / range) * (height - 4) - 2;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

export function StockCard({
  name,
  price,
  change,
  rank,
  pe,
  roe,
  volume,
  trend,
  insight,
}: StockCardProps) {
  const [isMounted, setIsMounted] = useState(false);
  const isPositive = change >= 0;
  const sparklinePoints = useMemo(() => getSparklinePoints(trend), [trend]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setIsMounted(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  function handleClick() {
    window.sessionStorage.setItem("stockGridScrollY", String(window.scrollY));
    window.location.assign(getStockPath(name));
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={[
        "w-full rounded-xl border border-gray-200 bg-white p-3 text-left shadow-sm",
        "transition-all duration-200 ease-out hover:scale-[1.02] hover:shadow-md active:scale-[0.98]",
        "focus:outline-none focus:ring-2 focus:ring-blue-500/30",
        "border-l-2",
        isPositive ? "border-l-green-600" : "border-l-red-600",
        isMounted ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
      ].join(" ")}
      aria-label={`Open ${name} stock details`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 truncate text-sm font-medium text-gray-900">
          {name}
        </h3>
        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
          #{rank}
        </span>
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <strong className="text-xl font-semibold leading-none text-gray-950">
          {formatNumber(price)}
        </strong>
        <span
          className={[
            "text-xs font-semibold",
            isPositive ? "text-[#16a34a]" : "text-[#dc2626]",
          ].join(" ")}
        >
          {isPositive ? "+" : ""}
          {formatNumber(change)}%
        </span>
      </div>

      <svg
        className="mt-3 h-8 w-full"
        viewBox="0 0 100 32"
        preserveAspectRatio="none"
        role="img"
        aria-label={`${name} trend sparkline`}
      >
        <polyline
          points={sparklinePoints}
          fill="none"
          stroke={isPositive ? "#16a34a" : "#dc2626"}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
        <span>PE {formatNumber(pe, 1)}</span>
        <span aria-hidden="true">|</span>
        <span>ROE {formatNumber(roe, 1)}%</span>
        <span aria-hidden="true">|</span>
        <span>Vol {volume}</span>
      </div>

      <span className="mt-2 inline-flex rounded-full bg-[#f1f5f9] px-2 py-1 text-[11px] font-medium text-slate-700">
        {insight}
      </span>
    </button>
  );
}

export function StockCardGrid({ stocks }: StockCardGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {stocks.map((stock) => (
        <StockCard key={`${stock.rank}-${stock.name}`} {...stock} />
      ))}
    </div>
  );
}
