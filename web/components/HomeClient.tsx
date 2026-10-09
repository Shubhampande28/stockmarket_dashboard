"use client";

import { useCallback, useEffect, useState } from "react";
import Gauge from "./Gauge";
import MoodHistoryChart from "./MoodHistoryChart";
import MoversRow from "./MoversRow";
import { Skeleton } from "./states/DataStates";
import { getMood, type MoodResult, type MoodHistoryPoint, type Snapshot } from "@/lib/api";
import { marketStatus, relativeTime } from "@/lib/market/session";

export default function HomeClient({
  initialMood,
  initialSnapshot,
  initialHistory,
}: {
  initialMood: MoodResult | null;
  initialSnapshot: Snapshot | null;
  initialHistory: MoodHistoryPoint[];
}) {
  const [mood, setMood] = useState(initialMood);
  const [history] = useState(initialHistory);
  const [historyError] = useState(false);
  const [moodError, setMoodError] = useState(false);

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

  if (!mood && moodError) {
    return (
      <div className="mx-auto max-w-[1360px] px-5 py-10 lg:px-10">
        <Skeleton height={300} />
      </div>
    );
  }
  if (!mood) {
    return (
      <div className="mx-auto max-w-[1360px] px-5 py-10 lg:px-10">
        <Skeleton height={300} />
      </div>
    );
  }

  const compareRows: [string, number | null][] = [
    ["Today", mood.score],
    ["Yesterday", mood.compare.yesterday],
    ["Week ago", mood.compare.week_ago],
    ["Month ago", mood.compare.month_ago],
  ];

  const gainers = (initialSnapshot && !("error" in initialSnapshot) ? initialSnapshot.gainers : []) ?? [];
  const losers = (initialSnapshot && !("error" in initialSnapshot) ? initialSnapshot.losers : []) ?? [];

  return (
    <div>
      {/* Hero */}
      <section
        className="relative overflow-hidden text-white"
        style={{ background: "radial-gradient(120% 90% at 50% 0%, #F0323F 0%, var(--brand) 45%, var(--brand-ink) 100%)" }}
      >
        <div className="mx-auto flex max-w-[760px] flex-col items-center gap-3 px-5 py-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/85">
            Equilytics Mood Index · {mood.date}
          </p>
          <div className="w-full max-w-[460px] rounded-[22px] bg-white p-4 pb-1 text-ink shadow-xl">
            <Gauge score={mood.score} />
          </div>
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-white/85">
            {open && <span className="inline-block h-[7px] w-[7px] rounded-full bg-white" />}
            {open ? "Live mood" : "Today's market mood"}
          </p>
          <h1 className="text-[2.6rem] font-black uppercase leading-none tracking-tight sm:text-5xl">
            {mood.zone}
          </h1>
          <p className="max-w-[56ch] text-base">
            {mood.headline} So the market is <b>{mood.verdict}</b>.
          </p>
          <div className="grid w-full max-w-[620px] grid-cols-2 gap-2 sm:grid-cols-4">
            {compareRows.map(([label, value]) => (
              <div key={label} className="rounded-[10px] border border-white/28 bg-white/14 px-2 py-2">
                <small className="block text-[0.74rem] text-white/85">{label}</small>
                <b className="font-tabular text-lg">{value ?? "—"}</b>
              </div>
            ))}
          </div>
          <p className="text-xs text-white/80">
            Updated {relativeTime(mood.computed_at)}
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[1360px] px-5 py-8 lg:px-10">
        {/* Signal cards */}
        <h2 className="mb-1 text-2xl font-bold">Six signals, each in plain English</h2>
        <p className="mb-4 max-w-[62ch] text-sm text-ink-4">
          The mood index is the average of the available signals below, each scaled 0 to 100.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {mood.components.map((c) => (
            <div
              key={c.id}
              className={`rounded-[18px] border border-line p-4 ${c.available ? "" : "opacity-55"}`}
            >
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <h3 className="text-[1.02rem] font-bold">{c.name}</h3>
                <span className="font-tabular text-lg font-semibold">{c.available ? c.score : "—"}</span>
              </div>
              <div
                className="mb-2 h-2 rounded-full"
                style={{
                  background:
                    "linear-gradient(90deg,#B3121F,#F26B3A 30%,#F2B33D 50%,#62BD82 70%,#0F9158)",
                  opacity: c.available ? 1 : 0.3,
                }}
              />
              <div className="font-tabular mb-1 text-[0.84rem] text-ink-4">{c.reading}</div>
              <p className="text-sm">{c.explain}</p>
            </div>
          ))}
        </div>

        {/* Mood vs Nifty */}
        <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-[1.6fr_1fr]">
          <div className="rounded-[18px] border border-line p-5">
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.1em] text-brand-ink">Last sessions</p>
            <h2 className="mb-3 text-xl font-bold">Mood vs Nifty 50</h2>
            <MoodHistoryChart history={history} loading={false} error={historyError} onRetry={refresh} />
          </div>
          <div className="rounded-[18px] border border-line p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.1em] text-ink-4">Today&apos;s biggest movers</p>
            <MoversRow title="Gainers" stocks={gainers} />
            <div className="mt-4">
              <MoversRow title="Losers" stocks={losers} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
