"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

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

export default function StockCard({
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
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const isPositive = change >= 0;
  const sparklinePoints = useMemo(() => getSparklinePoints(trend), [trend]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setIsMounted(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  function handleClick() {
    window.sessionStorage.setItem("stockGridScrollY", String(window.scrollY));
    router.push(getStockPath(name));
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleClick();
        }
      }}
      className={[
        "cursor-pointer rounded-xl border border-gray-200 bg-white p-3 shadow-sm",
        "transition-all duration-200 ease-out hover:scale-[1.02] hover:shadow-md active:scale-[0.98]",
        "focus:outline-none focus:ring-2 focus:ring-blue-500/30",
        "border-l-2",
        isPositive ? "border-l-green-600" : "border-l-red-600",
        isMounted ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
      ].join(" ")}
      aria-label={`Open ${name} stock details`}
    >
      <div className="flex items-center justify-between gap-3 text-sm font-medium">
        <span className="min-w-0 truncate text-gray-900">{name}</span>
        <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-slate-600">
          #{rank}
        </span>
      </div>

      <div className="mt-1 flex items-center gap-2">
        <span className="text-xl font-semibold text-gray-950">
          ₹{formatNumber(price)}
        </span>
        <span
          className={[
            "text-sm font-semibold",
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

      <div className="mt-2 flex justify-between gap-2 text-xs text-gray-500">
        <span>PE: {formatNumber(pe, 1)}</span>
        <span>ROE: {formatNumber(roe, 1)}%</span>
        <span>{volume}</span>
      </div>

      <div className="mt-2 inline-block rounded-md bg-[#f1f5f9] px-2 py-1 text-xs text-slate-700">
        {insight}
      </div>
    </div>
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
