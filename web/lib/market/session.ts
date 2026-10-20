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

/** IST weekday (0 = Sunday .. 6 = Saturday) and clock time for `d`.
 *
 * `d.getDay()`/`d.getHours()`/`d.getMinutes()` are LOCAL-TIMEZONE getters:
 * even when `d` is istNow()'s correctly-shifted Date, those getters
 * re-interpret it in the *runtime's* timezone, not IST. That only happens
 * to work when the server or browser itself is set to IST -- on a UTC
 * cloud server it silently returns UTC's weekday/hour instead, so e.g.
 * 19:13 IST (well after the 15:30 close) reads back as "13:43" and the
 * market looks open. Re-deriving the fields with Intl against `d` sidesteps
 * the runtime's local timezone entirely, so this is correct regardless of
 * where the code runs. */
function istParts(d: Date): { day: number; hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekdays: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    day: weekdays[get("weekday")] ?? 0,
    hour: Number(get("hour")) % 24, // hour12:false can render midnight as "24"
    minute: Number(get("minute")),
  };
}

export function marketStatus(now: Date = new Date()): MarketStatus {
  const { day, hour, minute } = istParts(now);
  if (day === 0 || day === 6) return "closed";

  const minutes = hour * 60 + minute;
  const open = 9 * 60 + 15;
  const close = 15 * 60 + 30;
  if (minutes < open) return "pre-open";
  if (minutes > close) return "closed";
  return "open";
}

export function nextOpenLabel(now: Date = new Date()): string {
  const { day, hour, minute } = istParts(now);
  if (day === 6 || day === 0) return "Opens Monday 9:15 AM IST";
  const minutes = hour * 60 + minute;
  if (minutes > 15 * 60 + 30) return "Opens tomorrow 9:15 AM IST";
  return "Opens 9:15 AM IST";
}

export function relativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const diffSeconds = Math.max(0, Math.round((now.getTime() - then.getTime()) / 1000));
  if (diffSeconds < 60) return "just now";
  const minutes = Math.round(diffSeconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return `${hours}h ago`;
}
