"use client";

import { useEffect, useRef, useState } from "react";

function readReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(readReducedMotion);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

/** Tweens a number from its previous value to `value` over `durationMs`,
 * ease-out, via requestAnimationFrame. Instant if reduced motion is on. */
export function useAnimatedNumber(value: number, durationMs = 400): number {
  const reduced = usePrefersReducedMotion();
  const [display, setDisplay] = useState(value);
  const prevValue = useRef(value);

  useEffect(() => {
    if (reduced) return; // rendered value falls through to `value` directly below
    if (prevValue.current === value) return;

    const from = prevValue.current;
    const delta = value - from;
    const start = performance.now();
    let raf = 0;

    function tick(now: number) {
      const p = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(from + delta * eased);
      if (p < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        prevValue.current = value;
      }
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, durationMs, reduced]);

  return reduced ? value : display;
}
