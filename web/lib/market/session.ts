import type { MarketStatus } from "./types";

/**
 * IST market-hours helper. All session logic lives here (brief section 9).
 *
 * Exchange holidays: the Flask backend already fetches/caches these via
 * Upstox's market-holidays API (backend/upstox_client.py fetch_market_holidays,
 * stored in meta key "market_holidays"). This client-side helper does NOT
 * have that list -- it only knows weekday + clock time, so a holiday will
 * show as "open" here until the backend's own `marketStatus` field (once
 * wired through /stocks or /api/mood) overrides it. TODO: thread the
 * backend's real holiday-aware status through an API field instead of
 * relying on this weekday-only approximation.
 */
export function istNow(): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
  return new Date(
    `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}+05:30`
  );
}

export function marketStatus(now: Date = istNow()): MarketStatus {
  const day = now.getDay(); // 0 = Sunday .. 6 = Saturday, evaluated in IST via istNow()
  if (day === 0 || day === 6) return "closed";

  const minutes = now.getHours() * 60 + now.getMinutes();
  const open = 9 * 60 + 15;
  const close = 15 * 60 + 30;
  if (minutes < open) return "pre-open";
  if (minutes > close) return "closed";
  return "open";
}

export function nextOpenLabel(now: Date = istNow()): string {
  const day = now.getDay();
  if (day === 6) return "Opens Monday 9:15 AM IST";
  if (day === 0) return "Opens Monday 9:15 AM IST";
  const minutes = now.getHours() * 60 + now.getMinutes();
  if (minutes > 15 * 60 + 30) return "Opens tomorrow 9:15 AM IST";
  return "Opens 9:15 AM IST";
}

export function relativeTime(iso: string, now: Date = istNow()): string {
  const then = new Date(iso);
  const diffSeconds = Math.max(0, Math.round((now.getTime() - then.getTime()) / 1000));
  if (diffSeconds < 60) return "just now";
  const minutes = Math.round(diffSeconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return `${hours}h ago`;
}
