"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Gauge from "./Gauge";
import MoodHistoryChart from "./MoodHistoryChart";
import { Skeleton } from "./states/DataStates";
import { getMood, type MoodResult, type MoodHistoryPoint } from "@/lib/api";
import { marketStatus, relativeTime } from "@/lib/market/session";
import { colorForScore, labelColorForScore, zoneForScore } from "@/lib/mood/zones";

const PERIODS = [
  { id: 30, label: "30 sessions" },
  { id: 90, label: "90 sessions" },
  { id: 365, label: "1 year" },
] as const;

export default function MarketMoodClient({
  initialMood,
  initialHistory,
}: {
  initialMood: MoodResult | null;
  initialHistory: MoodHistoryPoint[];
}) {
  const [mood, setMood] = useState(initialMood);
  const [moodError, setMoodError] = useState(false);
  const [period, setPeriod] = useState<number>(90);
  const open = marketStatus() === "open";

  const refresh = useCallback(async () => {
    try {
      const result = await getMood();
      if ("error" in result) {
        setMoodError(true);
        return;
      }
      setMood(result);
      setMoodError(false);
    } catch {
      setMoodError(true);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 120_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [open, refresh]);

  if (!mood) {
    return (
      <div className="mx-auto max-w-[1360px] px-5 py-8 lg:px-10">
        <Skeleton height={400} />
      </div>
    );
  }

  const statusLabel = open
    ? `Live · updated ${relativeTime(mood.computed_at)}`
    : "Closed · showing last close";

  // `compare` can be entirely absent -- a legacy stored mood record (e.g.
  // a "close" kind saved before this field existed) can omit it, confirmed
  // live in production -- so every access here is optional-chained rather
  // than assumed present.
  const compareTiles: { label: string; score: number | null }[] = [
    { label: "Yesterday", score: mood.compare?.yesterday ?? null },
    { label: "1 week ago", score: mood.compare?.week_ago ?? null },
    { label: "1 month ago", score: mood.compare?.month_ago ?? null },
  ].filter((t) => t.score != null);

  const windowedHistory = initialHistory.slice(-period);

  return (
    <div className="mx-auto max-w-[1360px] px-5 py-8 lg:px-10">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.1em] text-brand-ink">Market Mood</p>
          <h1 className="text-[2rem] font-bold tracking-[-0.03em] sm:text-[2.4rem]">
            How the Indian market feels today
          </h1>
          <p className="mt-1 max-w-[62ch] text-sm text-ink-3">
            One score from 0 to 100, averaging six market-wide signals: foreign investor flows, India
            VIX, Nifty 50 momentum, market breadth, 52-week highs vs lows, and gold vs Nifty. Low means
            fear, high means greed.
          </p>
        </div>
        <p
          aria-live="polite"
          className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-surface-3 px-3 py-1.5 text-xs font-semibold text-ink-3"
        >
          <span className={`inline-block h-[7px] w-[7px] rounded-full ${open ? "bg-live" : "bg-ink-4"}`} aria-hidden="true" />
          {statusLabel}
        </p>
      </div>

      <div className="flex flex-wrap gap-5">
        {/* Gauge card */}
        <div className="rounded-[18px] border border-line p-5" style={{ flex: "1 1 400px" }}>
          <Gauge score={mood.score} zone={mood.zone} />
          <div className="mt-2 text-center">
            <p className="font-tabular text-[3.5rem] font-bold leading-none" style={{ color: colorForScore(mood.score) }}>
              {mood.score}
            </p>
            <p className="text-xl font-bold" style={{ color: labelColorForScore(mood.score) }}>
              {mood.zone}
            </p>
          </div>
          {compareTiles.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-2">
              {compareTiles.map((t) => (
                <div key={t.label} className="rounded-[10px] border border-line px-2 py-2 text-center">
                  <p className="text-[11px] text-ink-4">{t.label}</p>
                  <p className="font-tabular text-lg font-semibold">{t.score}</p>
                  <p className="text-[11px]" style={{ color: labelColorForScore(t.score!) }}>
                    {zoneForScore(t.score!)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Drivers card */}
        <div className="rounded-[18px] border border-line p-5" style={{ flex: "2 1 560px" }}>
          <h2 className="text-lg font-bold">What&apos;s driving it</h2>
          <p className="mb-4 text-sm text-ink-4">Each part scores 0–100. The mood is their average.</p>
          <div className="space-y-4">
            {mood.components.map((c) => (
              <div key={c.id} className={c.available ? "" : "opacity-50"}>
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold">{c.name}</span>
                  <span className="font-tabular text-sm font-semibold">{c.available ? c.score : "—"}</span>
                </div>
                <div className="mb-1 h-2 overflow-hidden rounded-full bg-surface-3">
                  {c.available && c.score != null && (
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${c.score}%`, background: colorForScore(c.score) }}
                    />
                  )}
                </div>
                <p className="font-tabular text-xs text-ink-4">{c.reading}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mood vs Nifty chart */}
      <div className="mt-5 rounded-[18px] border border-line p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Mood vs Nifty 50</h2>
          <div className="flex items-center gap-1 rounded-full bg-surface-3 p-1">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={period === p.id}
                onClick={() => setPeriod(p.id)}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  period === p.id ? "bg-surface text-ink shadow-sm" : "text-ink-3"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <MoodHistoryChart history={windowedHistory} loading={false} error={moodError} onRetry={refresh} />
        <p className="mt-3 text-xs text-ink-4">
          Extreme Fear readings (below 25) have often come close to short-term lows. That is a pattern
          from the past, not a forecast.
        </p>
      </div>

      <p className="mt-6 text-xs text-ink-4">
        <Link href="/markets" className="underline">
          See today&apos;s biggest movers on Markets →
        </Link>
      </p>
    </div>
  );
}
