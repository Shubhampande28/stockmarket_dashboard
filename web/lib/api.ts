/**
 * Typed fetchers against the existing Flask JSON API. Next.js is pure
 * presentation here -- every byte of market/mood data comes from the
 * Python backend (Upstox/NSE fetching, the Mood Index engine, SQLite).
 *
 * Server Components (SSR, same machine) talk to Flask directly over
 * 127.0.0.1 -- no need to round-trip through nginx. Client Components
 * (browser polling) use relative paths, which nginx proxies to Flask on
 * the same origin, so no CORS config is needed.
 */
const SERVER_BASE = process.env.FLASK_API_BASE ?? "http://127.0.0.1:5000";

function baseUrl() {
  return typeof window === "undefined" ? SERVER_BASE : "";
}

async function getJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    // Server-side: never let Next cache stale market data between requests.
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`${path} -> ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ---- Mood ----

export interface MoodComponent {
  id: string;
  name: string;
  score: number | null;
  raw: number | null;
  reading: string;
  explain: string;
  available: boolean;
  delta1d: number | null;
}

export interface MoodResult {
  date: string;
  kind: "live" | "close" | "backfill";
  score: number;
  zone: string;
  change: { d1: number | null; w1: number | null; m1: number | null };
  compare: { yesterday: number | null; week_ago: number | null; month_ago: number | null };
  components: MoodComponent[];
  headline: string;
  verdict: string;
  computed_at: string;
  note?: string;
}

export interface MoodHistoryPoint {
  date: string;
  score: number;
  zone: string;
  niftyClose: number | null;
}

export function getMood() {
  return getJSON<MoodResult | { error: string }>("/api/mood");
}

export function getMoodHistory(days = 90) {
  return getJSON<MoodHistoryPoint[]>(`/api/mood/history?days=${days}`);
}

// ---- Snapshot (/stocks) ----

export interface StockRow {
  symbol: string; // "RELIANCE.NS"
  name: string;
  price: number;
  open: number;
  close: number;
  previousClose: number;
  high: number;
  low: number;
  change: number; // %
  netChange: number;
  volume: number;
  pe?: number | null;
  roe?: number | null;
  marketCap?: number | null;
  fiftyTwoWeekHigh?: number | null;
  fiftyTwoWeekLow?: number | null;
}

export interface IndexQuote {
  label: string;
  price?: number;
  netChange?: number;
  change?: number;
}

export interface SnapshotMeta {
  computedAt: number;
  stale: boolean;
  ageSeconds: number;
}

export interface Snapshot {
  movers: StockRow[];
  all: StockRow[];
  gainers: StockRow[];
  losers: StockRow[];
  others: StockRow[];
  indexQuotes: Record<string, IndexQuote>;
  _meta?: SnapshotMeta;
  // Sector groups (it, bank, auto, ...) and index groups are also present
  // as top-level keys, typed loosely since the key set is backend-defined.
  [sectorOrIndexKey: string]: unknown;
}

export function getSnapshot() {
  return getJSON<Snapshot | { error: string }>("/stocks");
}

// ---- Focus Lists ----

export interface FocusListData {
  id: string;
  label: string;
  rule: string;
  cols: string[];
  rows: (string | number)[][];
  disclaimer: string;
}

export const FOCUS_LIST_IDS = [
  "near-52w-high",
  "near-52w-low",
  "volume-shockers",
  "steady-climbers",
] as const;
export type FocusListId = (typeof FOCUS_LIST_IDS)[number];

export function getFocusList(id: string) {
  return getJSON<FocusListData | { error: string }>(`/api/lists/${id}`);
}

// ---- Daily Brief ----

export interface BriefSummary {
  date: string;
  slug: string;
  title: string;
  summary: string;
  source: "ai" | "template";
  published_at: string;
  data?: { mood?: { score: number; zone: string } };
}

export interface BriefDetail extends BriefSummary {
  body_html: string;
}

export function getBriefIndex(page = 1) {
  return getJSON<{ briefs: BriefSummary[]; page: number }>(`/api/brief?page=${page}`);
}

export function getBriefByDate(date: string) {
  return getJSON<{ brief: BriefDetail; nearby: BriefSummary[] } | { error: string }>(`/api/brief/${date}`);
}

// ---- Poll ----

export interface PollState {
  counts: { up: number; flat: number; down: number };
  yourVote: "up" | "flat" | "down" | null;
  accuracy30d?: number | null;
}

export async function getPoll(): Promise<PollState> {
  const res = await fetch(`${baseUrl()}/api/poll`, { cache: "no-store", credentials: "include" });
  return res.json();
}

// ---- Financials & News ----

export interface StatementRow {
  key: string;
  label: string;
  values: (number | null)[];
}

export interface Statement {
  periods: string[];
  rows: StatementRow[];
}

export interface FinancialsData {
  name: string;
  currency: string;
  info: Record<string, string>;
  source: { label: string; provider: string; url: string; annualReport?: { url: string; year: string; label: string } };
  sourceNote: string;
  statements: Record<string, Statement>;
  valuation?: Record<string, unknown>;
}

export async function getFinancials(symbol: string): Promise<FinancialsData | { error: string }> {
  const res = await fetch(`${baseUrl()}/financials/${encodeURIComponent(symbol)}`, { cache: "no-store" });
  return res.json();
}

export interface NewsItem {
  title: string;
  link: string;
  publisher?: string;
  summary?: string;
  sentiment?: "positive" | "negative" | "neutral";
}

export async function getNews(symbol: string): Promise<{ items: NewsItem[] } | { error: string }> {
  const res = await fetch(`${baseUrl()}/news/${encodeURIComponent(symbol)}`, { cache: "no-store" });
  return res.json();
}

export async function votePoll(choice: "up" | "flat" | "down"): Promise<PollState> {
  const res = await fetch(`${baseUrl()}/api/poll`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ choice }),
  });
  return res.json();
}
