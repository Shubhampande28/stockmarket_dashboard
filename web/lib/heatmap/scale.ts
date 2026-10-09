/** 9-step diverging colour scale for a stock's % change (brief section 4).
 * Thresholds are inclusive as written; the neutral band (±0.2%) is
 * deliberate so flat stocks never look bullish or bearish. */

export interface Tone {
  bg: string;
  fg: string;
}

const STEPS: { max: number; tone: Tone }[] = [
  { max: -2.5, tone: { bg: "#8A1A1A", fg: "#FFFFFF" } },
  { max: -1.5, tone: { bg: "#B02424", fg: "#FFFFFF" } },
  { max: -0.75, tone: { bg: "#C93A3A", fg: "#FFFFFF" } },
  { max: -0.2, tone: { bg: "#F4C4C1", fg: "#5A1212" } },
  { max: 0.2, tone: { bg: "#E4E5E8", fg: "#2A2B30" } },
  { max: 0.75, tone: { bg: "#BFE6CD", fg: "#0F3D22" } },
  { max: 1.5, tone: { bg: "#23864C", fg: "#FFFFFF" } },
  { max: 2.5, tone: { bg: "#18703D", fg: "#FFFFFF" } },
  { max: Infinity, tone: { bg: "#0E5A30", fg: "#FFFFFF" } },
];

export function toneFor(changePct: number): Tone {
  // Steps 0-2 are "<= max" (down side), step 3 is "< max" (still down side),
  // step 4 is the neutral band "-0.2 ... +0.2" inclusive both ends, steps
  // 5-7 are "< max" (up side), step 8 is the >= 2.5 catch-all.
  if (changePct <= -2.5) return STEPS[0].tone;
  if (changePct <= -1.5) return STEPS[1].tone;
  if (changePct <= -0.75) return STEPS[2].tone;
  if (changePct < -0.2) return STEPS[3].tone;
  if (changePct <= 0.2) return STEPS[4].tone;
  if (changePct < 0.75) return STEPS[5].tone;
  if (changePct < 1.5) return STEPS[6].tone;
  if (changePct < 2.5) return STEPS[7].tone;
  return STEPS[8].tone;
}

/** Signed display text using the real minus sign U+2212, per the brief. */
export function formatSignedPct(changePct: number, digits = 2): string {
  const rounded = Math.abs(changePct).toFixed(digits);
  if (changePct > 0) return `+${rounded}%`;
  if (changePct < 0) return `−${rounded}%`;
  return `${rounded}%`;
}

export const LEGEND_STEPS = [
  { label: "−3%", tone: STEPS[0].tone },
  { label: "−1.5%", tone: STEPS[1].tone },
  { label: "−0.75%", tone: STEPS[2].tone },
  { label: "−0.2%", tone: STEPS[3].tone },
  { label: "0%", tone: STEPS[4].tone },
  { label: "+0.75%", tone: STEPS[5].tone },
  { label: "+1.5%", tone: STEPS[6].tone },
  { label: "+2.5%", tone: STEPS[7].tone },
  { label: "+3%", tone: STEPS[8].tone },
];
