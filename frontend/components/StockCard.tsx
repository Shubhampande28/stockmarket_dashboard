"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export type StockCardProps = {
  name: string;
  price: number;
  change: number;
  rank: number;
  pe?: number | string | null;
  roe?: number | string | null;
  open?: number | string | null;
  close?: number | string | null;
  insight: string;
  size?: "large" | "medium" | "small";
};

type StockCardGridProps = {
  stocks: StockCardProps[];
};

function formatNumber(value: number | string | null | undefined, maximumFractionDigits = 2) {
  const number = Number(String(value ?? "").replace(/[,xX%\s]/g, ""));
  return Number.isFinite(number)
    ? number.toLocaleString("en-IN", { maximumFractionDigits })
    : "--";
}

function formatMetric(value: number | string | null | undefined, suffix = "") {
  const formatted = formatNumber(value, 1);
  return formatted === "--" ? formatted : `${formatted}${suffix}`;
}

function getStockPath(name: string) {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `/stock/${encodeURIComponent(slug || name)}`;
}

export default function StockCard({
  name,
  price,
  change,
  rank,
  pe,
  roe,
  open,
  close,
  insight,
  size = "small",
}: StockCardProps) {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const isPositive = change >= 0;
  const trendDirection = isPositive ? "↑ Uptrend" : "↓ Downtrend";

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
        size === "large" && "col-span-2 row-span-2 p-4",
        size === "medium" && "col-span-1 row-span-2 p-3.5",
        size === "small" && "col-span-1 row-span-1",
        isMounted ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
      ].filter(Boolean).join(" ")}
      aria-label={`Open ${name} stock details`}
    >
      <div className="flex items-center justify-between gap-3 text-sm font-medium">
        <span className="min-w-0 truncate text-gray-900">{name}</span>
        <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-slate-600">
          #{rank}
        </span>
      </div>

      <div className="mt-1 flex items-center gap-2">
        <span className={size === "large" ? "text-2xl font-semibold text-gray-950" : "text-xl font-semibold text-gray-950"}>
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

      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="truncate text-xs font-semibold text-slate-800">
          {isPositive ? "🔥" : "⚠"} {insight}
        </span>
        <strong
          className={[
            "whitespace-nowrap text-xs font-bold",
            isPositive ? "text-[#16a34a]" : "text-[#dc2626]",
          ].join(" ")}
        >
          {trendDirection}
        </strong>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-500">
        <span>PE: <strong className="font-semibold text-gray-900">{formatMetric(pe)}</strong></span>
        <span>ROE: <strong className="font-semibold text-gray-900">{formatMetric(roe, "%")}</strong></span>
        <span>Open: <strong className="font-semibold text-gray-900">{formatNumber(open)}</strong></span>
        <span>Close: <strong className="font-semibold text-gray-900">{formatNumber(close)}</strong></span>
      </div>
    </div>
  );
}

export function StockCardGrid({ stocks }: StockCardGridProps) {
  return (
    <div className="grid auto-rows-[92px] grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">
      {stocks.map((stock, index) => (
        <StockCard
          key={`${stock.rank}-${stock.name}`}
          {...stock}
          size={stock.size ?? (index === 0 ? "large" : index < 4 ? "medium" : "small")}
        />
      ))}
    </div>
  );
}
