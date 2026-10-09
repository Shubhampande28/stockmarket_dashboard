"use client";

/** Shared loading / market-closed / error states (brief section 7), used
 * by both the heatmap and the Mood vs Nifty 50 chart so neither ever
 * renders a blank box. */

export function Skeleton({ className = "", height = 240 }: { className?: string; height?: number }) {
  return (
    <div
      className={`skeleton-pulse rounded-[14px] bg-surface-3 ${className}`}
      style={{ height }}
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">Fetching live quotes…</span>
    </div>
  );
}

export function ClosedNotice({ label }: { label: string }) {
  return (
    <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-surface-3 px-3 py-1 text-xs font-medium text-ink-3">
      <span className="h-2 w-2 rounded-full bg-ink-4" aria-hidden="true" />
      Closed · showing last close · {label}
    </p>
  );
}

export function ErrorPanel({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 rounded-[14px] border border-line bg-surface-2 py-14 text-center"
      role="alert"
    >
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="10" stroke="#C42B2B" strokeWidth="1.6" />
        <path d="M12 7v6M12 16.5v.01" stroke="#C42B2B" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <p className="font-semibold text-ink">Couldn&apos;t reach the market feed</p>
      <p className="max-w-[40ch] text-sm text-ink-4">
        We&apos;ll keep trying in the background. Prices may be out of date
        until we reconnect.
      </p>
      <div className="mt-1 flex gap-2">
        <button
          type="button"
          onClick={onRetry}
          className="rounded-[12px] bg-ink px-4 py-2 text-sm font-semibold text-white"
        >
          Try again
        </button>
        <a
          href="https://www.nseindia.com"
          target="_blank"
          rel="noreferrer"
          className="rounded-[12px] border border-line-2 px-4 py-2 text-sm font-semibold text-ink"
        >
          Check NSE
        </a>
      </div>
    </div>
  );
}

export function StaleWarning({ lastUpdated }: { lastUpdated: string }) {
  return (
    <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#FFF4E5] px-3 py-1 text-xs font-medium text-[#8A5A1A]">
      Last updated {lastUpdated}
    </p>
  );
}
