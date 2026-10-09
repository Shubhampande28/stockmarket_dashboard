"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { IndexQuote } from "@/lib/api";
import { formatSignedPct } from "@/lib/heatmap/scale";

const NAV_ITEMS = [
  { href: "/", label: "Today" },
  { href: "/brief", label: "Daily Brief" },
  { href: "/focus-lists", label: "Focus Lists" },
  { href: "/heatmap", label: "Heatmap" },
  { href: "/markets", label: "Markets" },
  { href: "/blog", label: "Blog" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export default function Header({ indexQuotes }: { indexQuotes: Record<string, IndexQuote> }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const tickerEntries = Object.entries(indexQuotes).filter(([, q]) => typeof q.price === "number");

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1360px] items-center gap-4 px-5 py-3 lg:px-10">
        <Link href="/" className="shrink-0 text-[1.2rem] font-bold tracking-tight">
          Equi<span className="text-brand">lytics</span>
        </Link>

        <nav aria-label="Main" className="hidden flex-1 items-center gap-1 lg:flex">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-[9px] px-3 py-[9px] text-sm transition-colors ${
                  active ? "bg-surface-3 font-semibold text-ink" : "font-medium text-ink-3 hover:bg-surface-2"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden flex-1" />

        {tickerEntries.length > 0 && (
          <div className="hidden items-center gap-4 font-tabular text-[12.5px] lg:flex">
            {tickerEntries.map(([key, q]) => (
              <span key={key} className="whitespace-nowrap">
                <span className="text-ink-4">{q.label}</span>{" "}
                <b className="font-semibold">{q.price!.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</b>{" "}
                <span className={(q.change ?? 0) >= 0 ? "up" : "down"}>
                  {formatSignedPct(q.change ?? 0, 2)}
                </span>
              </span>
            ))}
          </div>
        )}

        <button
          type="button"
          aria-label="Open menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
          className="flex h-11 w-11 items-center justify-center rounded-[12px] border border-line-2 lg:hidden"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M2 4h14M2 9h14M2 14h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {menuOpen && (
        <nav aria-label="Main (mobile)" className="flex flex-col border-t border-line px-5 py-2 lg:hidden">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                onClick={() => setMenuOpen(false)}
                className={`rounded-[9px] px-3 py-2.5 text-sm ${
                  active ? "bg-surface-3 font-semibold text-ink" : "font-medium text-ink-3"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      )}

      {tickerEntries.length > 0 && (
        <div className="scroll-x-strip flex gap-4 border-t border-line px-5 py-2 font-tabular text-[12px] lg:hidden">
          {tickerEntries.map(([key, q]) => (
            <span key={key} className="shrink-0 whitespace-nowrap">
              <span className="text-ink-4">{q.label}</span>{" "}
              <b className="font-semibold">{q.price!.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</b>{" "}
              <span className={(q.change ?? 0) >= 0 ? "up" : "down"}>
                {formatSignedPct(q.change ?? 0, 2)}
              </span>
            </span>
          ))}
        </div>
      )}
    </header>
  );
}
