"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatSignedPct } from "@/lib/heatmap/scale";
import type { SearchResult } from "@/lib/search";

const DEBOUNCE_MS = 120;

function isTouchDevice() {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(pointer: coarse)").matches;
}

export default function SearchBox({
  variant = "hero",
  autoFocus = false,
}: {
  variant?: "hero" | "compact";
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [searched, setSearched] = useState(false);
  const lastQuery = useRef<string>("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (autoFocus && !isTouchDevice()) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  const runSearch = useCallback(async (q: string) => {
    if (q === lastQuery.current) return;
    lastQuery.current = q;
    if (!q.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = (await res.json()) as { results: SearchResult[] };
      setResults(data.results ?? []);
    } catch {
      setResults([]);
    } finally {
      setSearched(true);
    }
  }, []);

  function onChange(value: string) {
    setQuery(value);
    setOpen(true);
    setActiveIndex(-1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(value), DEBOUNCE_MS);
  }

  function goToStock(symbol: string) {
    setOpen(false);
    setQuery("");
    setResults([]);
    router.push(`/stock/${symbol}`);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (activeIndex >= 0 && results[activeIndex]) {
      goToStock(results[activeIndex].symbol);
      return;
    }
    const trimmed = query.trim().toUpperCase();
    if (!trimmed) return;
    const exact = results.find((r) => r.symbol === trimmed);
    if (exact) {
      goToStock(exact.symbol);
    } else {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  const showDropdown = open && query.trim().length > 0;
  const isHero = variant === "hero";

  return (
    <form
      role="search"
      onSubmit={onSubmit}
      className="relative w-full"
    >
      <label htmlFor={`search-input-${listboxId}`} className="sr-only">
        Search for a stock by company name or symbol
      </label>
      <div
        className={`flex items-center gap-2 rounded-full border bg-surface shadow-[0_6px_24px_rgba(17,17,20,0.08)] ${
          isHero ? "h-[54px] px-5 sm:h-[60px]" : "h-11 px-4"
        }`}
        style={{ borderColor: "#DCDCE1" }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true" className="shrink-0 text-ink-4">
          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.6" />
          <path d="M16 16L12.5 12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <input
          ref={inputRef}
          id={`search-input-${listboxId}`}
          type="search"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={listboxId}
          aria-activedescendant={activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined}
          aria-autocomplete="list"
          autoComplete="off"
          value={query}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => query.trim() && setOpen(true)}
          placeholder={isHero ? "Company name or symbol, e.g. Reliance" : "Search stocks"}
          className={`flex-1 bg-transparent outline-none placeholder:text-ink-4 ${isHero ? "text-[17px]" : "text-sm"}`}
        />
        {query && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setQuery("");
              setResults([]);
              setOpen(false);
              inputRef.current?.focus();
            }}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-ink-4 hover:bg-surface-3"
          >
            ×
          </button>
        )}
      </div>

      {showDropdown && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-2 max-h-[400px] overflow-y-auto rounded-[16px] border border-line bg-surface py-1 shadow-xl"
        >
          {results.length === 0 && searched ? (
            <li className="px-4 py-3 text-sm text-ink-4">
              No stock matches &ldquo;{query}&rdquo;. Try a symbol like RELIANCE or TCS.
            </li>
          ) : (
            results.map((r, i) => (
              <li
                key={r.symbol}
                id={`${listboxId}-option-${i}`}
                role="option"
                aria-selected={i === activeIndex}
                onMouseDown={(e) => {
                  e.preventDefault();
                  goToStock(r.symbol);
                }}
                onMouseEnter={() => setActiveIndex(i)}
                className={`flex h-14 cursor-pointer items-center justify-between gap-3 px-4 ${
                  i === activeIndex ? "bg-surface-2" : ""
                }`}
              >
                <div className="min-w-0">
                  <div className="truncate text-[15px] font-semibold text-ink">{r.name}</div>
                  <div className="font-tabular text-[12.5px] text-ink-4">{r.symbol} · NSE</div>
                </div>
                {typeof r.price === "number" && (
                  <div className="shrink-0 text-right font-tabular">
                    <div className="text-sm font-semibold text-ink">
                      {r.price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                    </div>
                    <div className={Math.abs(r.change) <= 0.2 ? "text-ink-3" : r.change > 0 ? "up" : "down"}>
                      {formatSignedPct(r.change)}
                    </div>
                  </div>
                )}
              </li>
            ))
          )}
        </ul>
      )}
    </form>
  );
}
