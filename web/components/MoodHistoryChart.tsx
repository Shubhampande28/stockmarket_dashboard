"use client";

import { useMemo } from "react";
import type { MoodHistoryPoint } from "@/lib/api";
import { Skeleton, ErrorPanel } from "./states/DataStates";

export default function MoodHistoryChart({
  history,
  loading,
  error,
  onRetry,
}: {
  history: MoodHistoryPoint[] | null;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  const path = useMemo(() => {
    if (!history || history.length < 2) return null;
    const W = 640, H = 220, L = 30, R = 50, T = 10, B = 24;
    const iw = W - L - R, ih = H - T - B;
    const niftyVals = history.map((h) => h.niftyClose).filter((v): v is number => v != null);

    const x = (i: number) => L + (iw * i) / (history.length - 1);
    const y = (v: number) => T + ih * (1 - v / 100);

    const moodPath = history
      .map((h, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(h.score).toFixed(1)}`)
      .join(" ");

    let niftyPath: string | null = null;
    if (niftyVals.length > 1) {
      const lo = Math.min(...niftyVals) * 0.995;
      const hi = Math.max(...niftyVals) * 1.005;
      const yn = (v: number) => T + ih * (1 - (v - lo) / (hi - lo));
      niftyPath = history
        .filter((h) => h.niftyClose != null)
        .map((h, i) => `${i === 0 ? "M" : "L"} ${x(history.indexOf(h)).toFixed(1)} ${yn(h.niftyClose!).toFixed(1)}`)
        .join(" ");
    }

    return { W, H, moodPath, niftyPath, L, iw, T, ih };
  }, [history]);

  if (loading) return <Skeleton height={220} />;
  if (error) return <ErrorPanel onRetry={onRetry} />;
  if (!path) {
    return (
      <div className="flex h-[220px] items-center justify-center rounded-[14px] border border-line bg-surface-2 text-sm text-ink-4">
        Not enough history yet to draw a chart.
      </div>
    );
  }

  return (
    <svg viewBox={`0 0 ${path.W} ${path.H}`} role="img" aria-label="Mood index vs Nifty 50, last sessions" className="w-full">
      {[0, 25, 50, 75, 100].map((v) => (
        <line
          key={v}
          x1={path.L}
          x2={path.L + path.iw}
          y1={path.T + path.ih * (1 - v / 100)}
          y2={path.T + path.ih * (1 - v / 100)}
          stroke="var(--line)"
          strokeWidth={1}
        />
      ))}
      {path.niftyPath && (
        <path d={path.niftyPath} fill="none" stroke="var(--ink-4)" strokeWidth={1.3} strokeDasharray="4 3" />
      )}
      <path d={path.moodPath} fill="none" stroke="var(--brand)" strokeWidth={2.5} strokeLinejoin="round" />
    </svg>
  );
}
