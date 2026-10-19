import Link from "next/link";
import type { ReactNode } from "react";
import type { NewsItem, StockSummary } from "@/lib/api";
import type {
  UpstoxBalanceSheet,
  UpstoxCashFlow,
  UpstoxCompetitor,
  UpstoxCorporateAction,
  UpstoxIncomeStatement,
  UpstoxKeyRatio,
  UpstoxShareHoldingCategory,
} from "@/lib/stock/upstox";
import { KEY_RATIO_ORDER } from "@/lib/stock/upstox";
import { promoterHoldingChangeQoQ } from "@/lib/stock/ratios";
import { formatSignedPct } from "@/lib/heatmap/scale";
import { relativeTime } from "@/lib/market/session";

function formatIstTime(epochMs: number): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(epochMs)) + " IST";
}

/** "NIFTY50" / "BANKNIFTY" -> "NIFTY 50" / "BANK NIFTY" for display. */
function prettyIndexName(raw: string): string {
  return raw.replace(/([A-Z])(\d)/, "$1 $2").replace(/^BANKNIFTY$/, "BANK NIFTY").replace(/^FINNIFTY$/, "FIN NIFTY").replace(/^MIDCPNIFTY$/, "MIDCAP NIFTY");
}

export function SummaryRow({ summary, asOfMs }: { summary: StockSummary; asOfMs: number | null }) {
  const quote = summary.quote;
  const eyebrow = [summary.sector?.toUpperCase(), ...summary.indexMemberships.map(prettyIndexName)]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex flex-wrap items-start justify-between gap-6">
      <div>
        {eyebrow && <p className="mb-1 text-xs font-semibold tracking-[0.06em] text-brand-ink">{eyebrow}</p>}
        <h1 className="text-[2rem] font-bold tracking-[-0.035em] sm:text-[2.5rem]">{summary.name}</h1>
        <p className="font-tabular mt-1 text-[13px] text-ink-4">NSE: {summary.symbol}</p>
      </div>
      {quote && (
        <div className="text-right">
          <div className="font-tabular text-[2rem] font-semibold sm:text-[2.5rem]">
            {quote.price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
          </div>
          <div
            className={`font-tabular text-sm font-semibold ${
              Math.abs(quote.change) <= 0.2 ? "text-ink-3" : quote.change >= 0 ? "up" : "down"
            }`}
          >
            {quote.netChange >= 0 ? "+" : "−"}
            {Math.abs(quote.netChange).toFixed(2)} ({formatSignedPct(quote.change)}) today
          </div>
          {asOfMs != null && <p className="text-[12.5px] text-ink-4">As of {formatIstTime(asOfMs)} · NSE</p>}
        </div>
      )}
    </div>
  );
}

export function Actions({ symbol }: { symbol: string }) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <button
        type="button"
        disabled
        title="Adding stocks to a Focus List isn't available yet"
        className="flex h-11 items-center rounded-[12px] bg-ink px-4 text-sm font-semibold text-white opacity-40"
      >
        Add to Focus List
      </button>
      <Link
        href={`/heatmap?stock=${symbol}`}
        className="flex h-11 items-center rounded-[12px] border border-line-2 px-4 text-sm font-semibold text-ink"
      >
        See on heatmap
      </Link>
    </div>
  );
}

/** "-3.64" -> "-3.64", but a non-positive P/E shows as "Loss-making"
 * (brief section 10.3) rather than a misleading negative multiple. */
function formatRatioValue(name: string, value: string): string {
  if (name === "P/E") {
    const n = Number(value);
    if (Number.isFinite(n) && n <= 0) return "Loss-making";
  }
  return value;
}

function formatAsOf(asOfSeconds: number | null): string | null {
  if (!asOfSeconds) return null;
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(asOfSeconds * 1000));
}

export function KeyRatios({
  keyRatios,
  bookValue,
  faceValue,
  asOf,
  stale,
}: {
  keyRatios: UpstoxKeyRatio[] | null;
  bookValue?: string;
  faceValue?: string;
  asOf: number | null;
  stale: boolean;
}) {
  const ordered = (keyRatios ?? []).slice().sort(
    (a, b) => KEY_RATIO_ORDER.indexOf(a.name) - KEY_RATIO_ORDER.indexOf(b.name)
  );
  if (ordered.length === 0 && !bookValue && !faceValue) return null;
  const asOfLabel = formatAsOf(asOf);

  return (
    <div className="rounded-[18px] border border-line p-5">
      <h2 className="mb-3 text-lg font-bold">Key ratios</h2>
      <dl className="space-y-2.5">
        {ordered.map((r) => (
          <div key={r.name} className="flex items-center justify-between gap-3 text-sm">
            <dt className="text-ink-3">{r.name}</dt>
            <dd className="font-tabular font-semibold">
              {formatRatioValue(r.name, r.company_value)}
              <span className="ml-1.5 text-xs font-normal text-ink-4">· sector {r.sector_value}</span>
            </dd>
          </div>
        ))}
        {bookValue && (
          <div className="flex items-center justify-between gap-3 text-sm">
            <dt className="text-ink-3">Book value</dt>
            <dd className="font-tabular font-semibold">{bookValue}</dd>
          </div>
        )}
        {faceValue && (
          <div className="flex items-center justify-between gap-3 text-sm">
            <dt className="text-ink-3">Face value</dt>
            <dd className="font-tabular font-semibold">{faceValue}</dd>
          </div>
        )}
      </dl>
      <p className="mt-3 text-xs text-ink-4">
        {ordered.length > 0 && `Upstox${asOfLabel ? ` · as of ${asOfLabel}` : ""}${stale ? " · showing last cached copy" : ""}`}
        {ordered.length > 0 && (bookValue || faceValue) && " · "}
        {(bookValue || faceValue) && "Book value and face value: NSE/Screener"}
      </p>
    </div>
  );
}

export function AboutCard({ description }: { description?: string | null }) {
  if (!description) return null;
  return (
    <div className="rounded-[18px] border border-line p-5">
      <h2 className="mb-2 text-lg font-bold">About</h2>
      <p className="text-sm text-ink-3">{description}</p>
    </div>
  );
}

export function PeersPanel({ competitors }: { competitors: UpstoxCompetitor[] | null }) {
  if (!competitors || competitors.length === 0) return null;
  return (
    <div className="rounded-[18px] border border-line p-5">
      <h2 className="mb-3 text-lg font-bold">Peers</h2>
      <p className="mb-3 text-xs text-ink-4">
        Upstox doesn&apos;t return a peer&apos;s company name, only its sector and a profile
        snippet &mdash; shown by the NSE symbol where we can resolve one.
      </p>
      <div className="flex flex-wrap gap-2">
        {competitors.map((c) => {
          const label = c.symbol ?? c.company_profile.split(".")[0].slice(0, 28);
          const content = (
            <>
              <span className="font-tabular text-sm font-semibold">{label}</span>
              {c.sector && <span className="ml-1.5 text-xs text-ink-4">{c.sector}</span>}
            </>
          );
          return c.symbol ? (
            <Link
              key={c.instrument_key}
              href={`/stock/${c.symbol}`}
              className="rounded-full border px-3 py-1.5 hover:bg-surface-2"
              style={{ borderColor: "var(--line-2)" }}
            >
              {content}
            </Link>
          ) : (
            <span key={c.instrument_key} className="rounded-full border px-3 py-1.5" style={{ borderColor: "var(--line-2)" }}>
              {content}
            </span>
          );
        })}
      </div>
    </div>
  );
}

const HOLDING_LABELS: Record<string, string> = {
  promoters: "Promoters",
  fii: "FII",
  other_dii: "DII",
  mutual_funds: "Mutual funds",
  retail_and_other: "Retail & other",
};

export function ShareholdingPanel({ shareHoldings }: { shareHoldings: UpstoxShareHoldingCategory[] | null }) {
  if (!shareHoldings || shareHoldings.length === 0) return null;
  const promoters = shareHoldings.find((c) => c.category === "promoters");
  const promoterChange = promoters ? promoterHoldingChangeQoQ(promoters.history) : null;
  const latestPeriod = shareHoldings[0]?.history[0]?.period;

  return (
    <div className="rounded-[18px] border border-line p-5">
      <div className="mb-1 flex items-baseline justify-between">
        <h2 className="text-lg font-bold">Shareholding</h2>
        {latestPeriod && <span className="text-xs text-ink-4">as of {latestPeriod}</span>}
      </div>
      {promoterChange != null && (
        <p className="mb-3 text-xs text-ink-4">
          Promoter holding {promoterChange >= 0 ? "up" : "down"} {Math.abs(promoterChange).toFixed(2)} pts vs the
          previous quarter.
        </p>
      )}
      <dl className="space-y-2.5">
        {shareHoldings.map((c) => (
          <div key={c.category} className="flex items-center justify-between gap-3 text-sm">
            <dt className="text-ink-3">{HOLDING_LABELS[c.category] ?? c.category}</dt>
            <dd className="font-tabular font-semibold">{c.history[0]?.value.toFixed(2)}%</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-ink-4">Upstox · last {shareHoldings[0]?.history.length ?? 0} quarters</p>
    </div>
  );
}

export function DividendsPanel({ actions }: { actions: UpstoxCorporateAction[] | null }) {
  const dividends = (actions ?? []).filter((a) => a.name === "Dividend");
  if (dividends.length === 0) return null;
  return (
    <div className="rounded-[18px] border border-line p-5">
      <h2 className="mb-3 text-lg font-bold">Dividends</h2>
      <ul className="space-y-2 text-sm">
        {dividends.slice(0, 5).map((d, i) => (
          <li key={i} className="flex items-center justify-between gap-3">
            <span className="text-ink-3">Ex-date {d.expiry_date}</span>
            <span className="font-tabular font-semibold">₹{d.amount}/share</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TodayVsMarket({
  stockChange,
  sectorChange,
  sectorLabel,
  niftyChange,
}: {
  stockChange: number | null;
  sectorChange: number | null;
  sectorLabel: string | null;
  niftyChange: number | null;
}) {
  if (stockChange == null || (sectorChange == null && niftyChange == null)) return null;
  const rows: { label: string; value: number }[] = [];
  if (sectorChange != null && sectorLabel) rows.push({ label: `${sectorLabel} today`, value: sectorChange });
  if (niftyChange != null) rows.push({ label: "Nifty 50 today", value: niftyChange });

  return (
    <div className="rounded-[18px] border border-line p-5">
      <h2 className="mb-3 text-lg font-bold">Today vs the market</h2>
      <dl className="space-y-2.5">
        {rows.map((row) => {
          const diffPts = stockChange - row.value;
          return (
            <div key={row.label} className="flex items-center justify-between gap-3 text-sm">
              <dt className="text-ink-3">{row.label}</dt>
              <dd className="font-tabular text-right">
                <span className={Math.abs(row.value) <= 0.2 ? "text-ink-3" : row.value >= 0 ? "up" : "down"}>
                  {formatSignedPct(row.value)}
                </span>
                <span className="ml-2 text-xs text-ink-4">
                  {diffPts >= 0 ? `Beat by ${diffPts.toFixed(1)} pts` : `Lagged by ${Math.abs(diffPts).toFixed(1)} pts`}
                </span>
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}

const STATEMENT_VIEWS = [
  { id: "quarterly", label: "Quarterly results" },
  { id: "profitLoss", label: "Profit & Loss" },
  { id: "balanceSheet", label: "Balance Sheet" },
  { id: "cashFlow", label: "Cash Flow" },
] as const;

const INCOME_CATEGORY_LABELS: Record<string, string> = {
  revenue: "Revenue",
  operating_profit: "Operating profit",
  net_profit: "Net profit",
};

function fmtCr(v: number | null): string {
  return v == null ? "—" : v.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

export function FinancialsPanel({
  incomeStatementQuarterly,
  incomeStatementAnnual,
  balanceSheet,
  cashFlow,
  statementKey,
  symbol,
}: {
  incomeStatementQuarterly: UpstoxIncomeStatement | null;
  incomeStatementAnnual: UpstoxIncomeStatement | null;
  balanceSheet: UpstoxBalanceSheet | null;
  cashFlow: UpstoxCashFlow | null;
  statementKey: string;
  symbol: string;
}) {
  const activeKey = STATEMENT_VIEWS.some((v) => v.id === statementKey) ? statementKey : "quarterly";

  const hasAny = incomeStatementQuarterly || incomeStatementAnnual || balanceSheet || cashFlow;
  if (!hasAny) {
    return (
      <div className="rounded-[18px] border border-line bg-surface-2 p-6 text-sm text-ink-4">
        Financial statements aren&apos;t available for {symbol} right now.
      </div>
    );
  }

  const switcher = (
    <div className="mb-4 flex flex-wrap gap-1 rounded-full bg-surface-3 p-1" style={{ width: "fit-content" }}>
      {STATEMENT_VIEWS.map((v) => (
        <Link
          key={v.id}
          href={`?tab=financials&statement=${v.id}`}
          scroll={false}
          aria-pressed={v.id === activeKey}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
            v.id === activeKey ? "bg-surface text-ink shadow-sm" : "text-ink-3"
          }`}
        >
          {v.label}
        </Link>
      ))}
    </div>
  );

  let table: ReactNode = null;

  if (activeKey === "quarterly" && incomeStatementQuarterly) {
    const cats = incomeStatementQuarterly.income_statement;
    const periods = cats[0]?.history.slice(-5).map((h) => h.period) ?? [];
    table = (
      <table className="w-full min-w-[500px] text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase text-ink-4">
            <th className="p-3">₹ crore</th>
            {periods.map((p) => (
              <th key={p} className="p-3 text-right font-tabular">{p}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cats.map((cat) => (
            <tr key={cat.category} className="border-b border-line last:border-0">
              <td className="p-3 pr-4">{INCOME_CATEGORY_LABELS[cat.category] ?? cat.category}</td>
              {cat.history.slice(-5).map((h, i) => (
                <td key={i} className="p-3 text-right font-tabular">{fmtCr(h.value)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  } else {
    const annualSource =
      activeKey === "profitLoss" ? incomeStatementAnnual : activeKey === "balanceSheet" ? balanceSheet : cashFlow;
    const rows = annualSource?.full_statement ?? [];
    const periods = rows[0]?.history.map((h) => h.period) ?? [];
    table = rows.length > 0 ? (
      <table className="w-full min-w-[500px] text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase text-ink-4">
            <th className="p-3">₹ crore · annual</th>
            {periods.map((p) => (
              <th key={p} className="p-3 text-right font-tabular">{p}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.particular} className="border-b border-line last:border-0">
              <td className="p-3 pr-4">{row.particular}</td>
              {row.history.map((h, i) => (
                <td key={i} className="p-3 text-right font-tabular">{fmtCr(h.value)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    ) : (
      <p className="p-3 text-sm text-ink-4">Not available for {symbol}.</p>
    );
  }

  return (
    <div>
      {switcher}
      <div className="overflow-x-auto rounded-[18px] border border-line">{table}</div>
      <p className="mt-3 text-xs text-ink-4">
        Source: Upstox Company Fundamentals.{" "}
        {activeKey === "quarterly"
          ? "Quarterly totals only -- the detailed line-item breakdown is annual only."
          : "Annual detailed statement, consolidated."}
      </p>
    </div>
  );
}

export function NewsPanel({ items, symbol }: { items: NewsItem[]; symbol: string }) {
  if (items.length === 0) {
    return <p className="text-sm text-ink-4">No recent news for {symbol}.</p>;
  }
  return (
    <ul className="space-y-4">
      {items.map((item) => (
        <li key={item.link} className="border-b border-line pb-4 last:border-0">
          <p className="mb-1 text-[12.5px] text-ink-4">
            {item.publisher}
            {item.publisher && item.published && " · "}
            {item.published && relativeTime(new Date(item.published).toISOString())}
          </p>
          <a
            href={item.link}
            target="_blank"
            rel="noopener"
            className="text-base font-semibold hover:underline"
          >
            {item.title}
          </a>
          {item.summary && <p className="mt-1 text-sm text-ink-3">{item.summary}</p>}
        </li>
      ))}
    </ul>
  );
}
