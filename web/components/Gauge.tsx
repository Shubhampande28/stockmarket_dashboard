"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/motion";

const ZONES = [
  { max: 25, color: "#B3121F" },
  { max: 45, color: "#F26B3A" },
  { max: 55, color: "#F2B33D" },
  { max: 75, color: "#62BD82" },
  { max: 100, color: "#0F9158" },
];

function zoneColor(score: number) {
  return ZONES.find((z) => score <= z.max)?.color ?? ZONES[ZONES.length - 1].color;
}

function polarPoint(cx: number, cy: number, r: number, score: number) {
  const angle = Math.PI * (1 - score / 100);
  return [cx + r * Math.cos(angle), cy - r * Math.sin(angle)];
}

export default function Gauge({ score }: { score: number }) {
  const reduced = usePrefersReducedMotion();
  const [animatedAngle, setAnimatedAngle] = useState(180 * (score / 100));
  const prevScore = useRef(score);

  useEffect(() => {
    if (reduced) {
      prevScore.current = score;
      return;
    }
    const target = 180 * (score / 100);
    const startAngle = 180 * (prevScore.current / 100);
    const t0 = performance.now();
    let raf = 0;
    function step(now: number) {
      const p = Math.min(1, (now - t0) / 1100);
      const eased = 1 - Math.pow(1 - p, 3);
      setAnimatedAngle(startAngle + (target - startAngle) * eased);
      if (p < 1) raf = requestAnimationFrame(step);
      else prevScore.current = score;
    }
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [score, reduced]);

  const renderedAngle = reduced ? 180 * (score / 100) : animatedAngle;
  const cx = 200, cy = 200, R = 165, w = 30;
  const arcs = ZONES.map((z, i) => {
    const prevMax = i === 0 ? 0 : ZONES[i - 1].max;
    const [x1, y1] = polarPoint(cx, cy, R, prevMax + 0.6);
    const [x2, y2] = polarPoint(cx, cy, R, z.max - 0.6);
    return { d: `M${x1} ${y1} A${R} ${R} 0 0 1 ${x2} ${y2}`, color: z.color };
  });

  return (
    <svg viewBox="-40 0 480 290" role="img" aria-label={`Mood gauge reading ${Math.round(score)} out of 100`} className="w-full">
      {arcs.map((arc, i) => (
        <path key={i} d={arc.d} stroke={arc.color} strokeWidth={w} fill="none" />
      ))}
      <g transform={`rotate(${renderedAngle} ${cx} ${cy})`}>
        <line x1={cx} y1={cy} x2={cx - R + 44} y2={cy} stroke="var(--ink)" strokeWidth={4} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={11} fill="var(--ink)" />
      </g>
      <text x={cx} y={cy + 66} textAnchor="middle" fontSize={56} fontWeight={800} fill={zoneColor(score)} fontFamily="var(--font-geist-sans)">
        {Math.round(score)}
      </text>
      <text x={cx} y={cy + 86} textAnchor="middle" fontSize={12} fill="var(--ink-4)">
        out of 100
      </text>
    </svg>
  );
}
