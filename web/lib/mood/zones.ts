/** Mood score bands (brief section 6) -- match the backend's own zones
 * exactly (backend/config.py ZONES), confirmed in Phase 0, not redesigned. */
export const MOOD_ZONES = [
  { max: 24, color: "#8A1A1A", label: "Extreme Fear" },
  { max: 44, color: "#C93A3A", label: "Fear" },
  { max: 55, color: "#D5D6DA", label: "Neutral" },
  { max: 75, color: "#23864C", label: "Greed" },
  { max: 100, color: "#0E5A30", label: "Extreme Greed" },
];

export function zoneForScore(score: number): string {
  return MOOD_ZONES.find((z) => score <= z.max)?.label ?? MOOD_ZONES[MOOD_ZONES.length - 1].label;
}

export function colorForScore(score: number): string {
  return MOOD_ZONES.find((z) => score <= z.max)?.color ?? MOOD_ZONES[MOOD_ZONES.length - 1].color;
}

/** Label text colour -- the brief gives a separate (darker) text colour
 * for the pale "Fear" and "Neutral" bands so the label stays readable. */
export function labelColorForScore(score: number): string {
  if (score <= 24) return "#8A1A1A";
  if (score <= 44) return "#B02424";
  if (score <= 55) return "var(--ink-3)";
  if (score <= 75) return "#23864C";
  return "#0E5A30";
}
