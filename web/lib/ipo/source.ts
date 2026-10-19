/**
 * NSE IPO calendar fetch + normalise (brief section 7). Confirmed live in
 * Phase 0 by testing, not guessing: NSE's own JSON endpoints behind
 * nseindia.com's IPO pages are reachable with the same cookie warm-up
 * pattern the Flask backend already uses for FII/DII (backend/nse_client.py),
 * just done here in Node since this module runs server-side in Next.js.
 *
 * Endpoints used:
 * - GET /api/all-upcoming-issues?category=ipo|sme -- open + upcoming issues
 * - GET /api/ipo-detail?symbol=X&series=EQ -- per-category subscription,
 *   lot size, registrar, lead managers, RHP link (only for issues in the
 *   open/upcoming window -- this is the expensive call)
 * - GET /api/public-past-issues -- closed/listed issues with listing date
 *   and final issue price
 *
 * No GMP: not published by any exchange, and not approved per the brief.
 * No "about" text: no company-description field exists on any of these
 * endpoints -- would need DRHP text scraping, out of scope.
 */
import type { Ipo, IpoFeed, IpoSegment, IpoStatus } from "./types";
import { istNow } from "../market/session";

const NSE_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "*/*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://www.nseindia.com/",
};

const BASE = "https://www.nseindia.com/api";
const TIMEOUT_MS = 12_000;

const LISTED_RETENTION_DAYS = 14;

interface CacheEntry {
  feed: IpoFeed;
  cachedAt: number;
}

let cache: CacheEntry | null = null;

function withTimeout(ms: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

async function nseSession() {
  const warmup = await fetch("https://www.nseindia.com", {
    headers: NSE_HEADERS,
    signal: withTimeout(TIMEOUT_MS),
  });
  const cookie = warmup.headers.get("set-cookie") ?? "";
  return { ...NSE_HEADERS, Cookie: cookie };
}

async function nseGet(headers: Record<string, string>, path: string): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, { headers, signal: withTimeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return res.json();
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/\blimited\b|\bltd\b\.?/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** "15-Oct-2026" -> "2026-10-15". Returns undefined if unparseable rather
 * than guessing a date. */
export function parseNseDate(value: string | undefined | null): string | undefined {
  if (!value) return undefined;
  const m = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/.exec(value.trim());
  if (!m) return undefined;
  const months: Record<string, string> = {
    Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
    Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
  };
  const month = months[m[2]];
  if (!month) return undefined;
  return `${m[3]}-${month}-${m[1].padStart(2, "0")}`;
}

/** minInvestment = lotSize x the top of the price band, computed, not
 * fetched (brief section 7.1). */
export function computeMinInvestment(lotSize: number | null, priceHigh: number | null): number | null {
  if (lotSize == null || priceHigh == null) return null;
  return lotSize * priceHigh;
}

export function parsePriceBand(value: string | undefined): { low: number; high: number } | null {
  if (!value) return null;
  // \d+(?:\.\d+)? rather than [\d.]+ -- "Rs.665" has a dot right before the
  // digits, which [\d.]+ would swallow as a leading decimal point (0.665).
  const nums = value.replace(/,/g, "").match(/\d+(?:\.\d+)?/g);
  if (!nums || nums.length === 0) return null;
  if (nums.length === 1) return { low: Number(nums[0]), high: Number(nums[0]) };
  return { low: Number(nums[0]), high: Number(nums[nums.length - 1]) };
}

/** "YYYY-MM-DD" for `d`'s calendar date in IST -- NOT the same as
 * `d.toISOString().slice(0, 10)`, which would be the UTC date and can be
 * off by a day near midnight IST. Dates compare correctly as plain
 * strings in this format. */
function istDateString(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function deriveStatus(dates: Ipo["dates"], now: Date): IpoStatus {
  const today = istDateString(now);
  const { open, close, listing } = dates;

  if (listing != null && today >= listing) return "listed";
  if (close != null && today > close) return "listing-soon";
  if (open != null && close != null && today >= open && today <= close) return "open";
  if (open != null && today < open) return "upcoming";
  return close != null ? "listing-soon" : "upcoming";
}

interface BidRow {
  category: string;
  noOfSharesOffered: string;
  noOfTime: string;
  srNo: string | null;
}

function parseBidTimes(bidDetails: BidRow[] | undefined, prefix: string, srNo: string | null): number | undefined {
  const row = bidDetails?.find((r) => r.srNo === srNo && r.category.startsWith(prefix));
  const n = row ? Number(row.noOfTime) : NaN;
  return Number.isFinite(n) ? n : undefined;
}

function quotaPct(bidDetails: BidRow[] | undefined, srNo: string | null, totalShares: number | null): number | undefined {
  if (!totalShares) return undefined;
  const row = bidDetails?.find((r) => r.srNo === srNo);
  const offered = row ? Number(row.noOfSharesOffered) : NaN;
  if (!Number.isFinite(offered) || offered <= 0) return undefined;
  return Math.round((offered / totalShares) * 1000) / 10;
}

/** Best-effort fresh-issue / OFS split parsed out of the free-text "Issue
 * Size" description. Returns nulls (never a guess) when the prose doesn't
 * clearly state a rupee-crore figure next to "Fresh Issue" or "Offer for
 * Sale". */
export function parseFreshVsOfs(issueSizeText: string | undefined): { freshIssueCr: number | null; ofsCr: number | null } {
  if (!issueSizeText) return { freshIssueCr: null, ofsCr: null };
  const find = (label: string): number | null => {
    const re = new RegExp(`${label}[^.]{0,80}?(?:Rs\\.?|₹)\\s*([\\d,]+(?:\\.\\d+)?)\\s*Cr`, "i");
    const m = re.exec(issueSizeText);
    return m ? Number(m[1].replace(/,/g, "")) : null;
  };
  return { freshIssueCr: find("Fresh Issue"), ofsCr: find("Offer for Sale") };
}

interface UpcomingRow {
  companyName: string;
  symbol: string;
  series: string;
  issueStartDate?: string;
  issueEndDate?: string;
  issuePrice?: string;
  issueSize?: string;
  status?: string;
}

interface IssueInfoItem {
  title: string | null;
  value: string;
}

interface IpoDetailResponse {
  bidDetails?: BidRow[];
  issueInfo?: { dataList?: IssueInfoItem[] };
  demandDataBSE?: unknown;
}

function findIssueInfo(items: IssueInfoItem[] | undefined, title: string): string | undefined {
  return items?.find((i) => i.title === title)?.value?.replace(/^"|"$/g, "");
}

async function buildIpoFromUpcoming(
  row: UpcomingRow,
  segment: IpoSegment,
  headers: Record<string, string>,
  now: Date
): Promise<Ipo> {
  const open = parseNseDate(row.issueStartDate);
  const close = parseNseDate(row.issueEndDate);
  const priceBand = parsePriceBand(row.issuePrice);

  let detail: IpoDetailResponse | null = null;
  try {
    detail = (await nseGet(headers, `/ipo-detail?symbol=${encodeURIComponent(row.symbol)}&series=${row.series}`)) as IpoDetailResponse;
  } catch {
    detail = null;
  }

  const bidDetails = detail?.bidDetails;
  const issueInfoList = detail?.issueInfo?.dataList;
  const totalShares = Number(row.issueSize) || null;

  const lotSizeText = findIssueInfo(issueInfoList, "Bid Lot") ?? findIssueInfo(issueInfoList, "Minimum Order Quantity");
  const lotSizeMatch = lotSizeText ? /^[\d,]+/.exec(lotSizeText.replace(/,/g, "")) : null;
  const lotSize = lotSizeMatch ? Number(lotSizeMatch[0]) : null;
  const minInvestment = computeMinInvestment(lotSize, priceBand?.high ?? null);

  const issueSizeText = findIssueInfo(issueInfoList, "Issue Size");
  const { freshIssueCr, ofsCr } = parseFreshVsOfs(issueSizeText);
  const issueSizeCr =
    totalShares && priceBand ? Math.round((totalShares * priceBand.high) / 1e7 * 100) / 100 : null;

  const overallTimes = parseBidTimes(bidDetails, "Total", null);
  const hasSubscription = overallTimes != null;

  const dates = { open, close };

  return {
    slug: slugify(row.companyName),
    name: row.companyName,
    segment,
    exchanges: detail?.demandDataBSE ? ["NSE", "BSE"] : ["NSE"],
    status: deriveStatus(dates, now),
    dates,
    priceBand,
    lotSize,
    minInvestment,
    issueSizeCr,
    freshIssueCr,
    ofsCr,
    quotas: {
      qib: quotaPct(bidDetails, "1", totalShares),
      nii: quotaPct(bidDetails, "2", totalShares),
      retail: quotaPct(bidDetails, "3", totalShares),
      employee: quotaPct(bidDetails, "4", totalShares),
    },
    subscription: hasSubscription
      ? {
          asOf: now.toISOString(),
          overall: overallTimes!,
          qib: parseBidTimes(bidDetails, "Qualified Institutional Buyers", "1"),
          nii: parseBidTimes(bidDetails, "Non Institutional Investors", "2"),
          retail: parseBidTimes(bidDetails, "Retail Individual Investors", "3"),
          employee: parseBidTimes(bidDetails, "Employees", "4"),
        }
      : undefined,
    registrar: findIssueInfo(issueInfoList, "Name of the Registrar"),
    leadManagers: findIssueInfo(issueInfoList, "Book Running Lead Managers")
      ?.split(/,| and /i)
      .map((s) => s.trim())
      .filter(Boolean),
    offerDocUrl: findIssueInfo(issueInfoList, "Red Herring Prospectus"),
  };
}

interface PastRow {
  company?: string;
  companyName?: string;
  symbol: string;
  listingDate?: string;
  issuePrice?: string;
  priceRange?: string;
  securityType?: string;
}

function buildIpoFromPast(row: PastRow, now: Date): Ipo | null {
  const listing = parseNseDate(row.listingDate);
  if (!listing) return null;
  const listingMs = new Date(listing).getTime();
  const ageDays = (now.getTime() - listingMs) / (24 * 60 * 60 * 1000);
  if (ageDays > LISTED_RETENTION_DAYS || ageDays < 0) return null;

  const name = row.companyName ?? row.company ?? row.symbol;
  const priceBand = parsePriceBand(row.priceRange);
  const listingPrice = row.issuePrice && row.issuePrice !== "-" ? Number(row.issuePrice.replace(/[^\d.]/g, "")) : undefined;

  return {
    slug: slugify(name),
    name,
    segment: "mainboard",
    exchanges: ["NSE"],
    status: "listed",
    dates: { listing },
    priceBand,
    lotSize: null,
    minInvestment: null,
    issueSizeCr: null,
    freshIssueCr: null,
    ofsCr: null,
    listing: listingPrice ? { price: listingPrice } : undefined,
  };
}

async function fetchLive(): Promise<IpoFeed> {
  const now = istNow();
  const headers = await nseSession();

  const [upcomingMain, upcomingSme, past] = await Promise.all([
    nseGet(headers, "/all-upcoming-issues?category=ipo") as Promise<UpcomingRow[]>,
    nseGet(headers, "/all-upcoming-issues?category=sme") as Promise<UpcomingRow[]>,
    nseGet(headers, "/public-past-issues") as Promise<PastRow[]>,
  ]);

  const activeRows: { row: UpcomingRow; segment: IpoSegment }[] = [
    ...(Array.isArray(upcomingMain) ? upcomingMain.map((row) => ({ row, segment: "mainboard" as const })) : []),
    ...(Array.isArray(upcomingSme) ? upcomingSme.map((row) => ({ row, segment: "sme" as const })) : []),
  ];

  const active = await Promise.all(activeRows.map(({ row, segment }) => buildIpoFromUpcoming(row, segment, headers, now)));

  const activeSymbols = new Set(activeRows.map(({ row }) => row.symbol));
  const listedRecently = (Array.isArray(past) ? past : [])
    .filter((row) => !activeSymbols.has(row.symbol))
    .map((row) => buildIpoFromPast(row, now))
    .filter((ipo): ipo is Ipo => ipo !== null);

  return {
    ipos: [...active, ...listedRecently],
    pipeline: [], // NSE's public endpoints don't expose pre-filing/SEBI-approval stage data
    asOf: now.toISOString(),
    stale: false,
  };
}

/** Section 7.1's caching rule: 5 minutes while any issue is open during
 * market hours (9:00-17:00 IST), 1 hour otherwise. Falls back to the last
 * good copy (any age) on a fetch failure. */
export async function getIpoFeed(): Promise<IpoFeed> {
  const now = istNow();
  const hour = now.getHours();
  const duringMarketHours = hour >= 9 && hour < 17;
  const anyOpen = cache?.feed.ipos.some((i) => i.status === "open") ?? false;
  const ttlMs = (duringMarketHours && anyOpen ? 5 : 60) * 60 * 1000;

  if (cache && Date.now() - cache.cachedAt < ttlMs) {
    return cache.feed;
  }

  try {
    const feed = await fetchLive();
    cache = { feed, cachedAt: Date.now() };
    return feed;
  } catch {
    if (cache) return { ...cache.feed, stale: true };
    return { ipos: [], pipeline: [], asOf: now.toISOString(), stale: true };
  }
}
