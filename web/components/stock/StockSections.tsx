import Link from "next/link";
import type { FinancialsData, NewsItem, StockSummary } from "@/lib/api";
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

const KEY_NUMBER_ORDER: [string, string][] = [
  ["marketCap", "Market cap"],
  ["stockPe", "P/E"],
  ["bookValue", "Book value"],
  ["dividendYield", "Dividend yield"],
  ["roce", "ROCE"],
  ["roe", "ROE"],
  ["highLow", "52-week high / low"],
  ["faceValue", "Face value"],
];

export function KeyNumbers({ info }: { info: FinancialsData["info"] | null }) {
  if (!info) return null;
  const rows = KEY_NUMBER_ORDER.filter(([key]) => info[key]);
  if (rows.length === 0) return null;
  return (
    <div className="rounded-[18px] border border-line p-5">
      <h2 className="mb-3 text-lg font-bold">Key numbers</h2>
      <dl className="space-y-2.5">
        {rows.map(([key, label]) => (
          <div key={key} className="flex items-center justify-between gap-3 text-sm">
            <dt className="text-ink-3">{label}</dt>
            <dd className="font-tabular font-semibold">{info[key]}</dd>
          </div>
        ))}
      </dl>
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

const STATEMENT_LABELS: Record<string, string> = {
  profitLoss: "Profit & Loss",
  balanceSheet: "Balance Sheet",
  cashFlow: "Cash Flow",
};

export function FinancialsPanel({
  data,
  statementKey,
  symbol,
}: {
  data: FinancialsData | null;
  statementKey: string;
  symbol: string;
}) {
  if (!data) {
    return (
      <div className="rounded-[18px] border border-line bg-surface-2 p-6 text-sm text-ink-4">
        Financial statements aren&apos;t available for {symbol} right now.
      </div>
    );
  }
  const keys = Object.keys(data.statements);
  const activeKey = keys.includes(statementKey) ? statementKey : keys[0];
  const statement = activeKey ? data.statements[activeKey] : null;

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1 rounded-full bg-surface-3 p-1" style={{ width: "fit-content" }}>
        {keys.map((key) => (
          <Link
            key={key}
            href={`?tab=financials&statement=${key}`}
            scroll={false}
            aria-pressed={key === activeKey}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              key === activeKey ? "bg-surface text-ink shadow-sm" : "text-ink-3"
            }`}
          >
            {STATEMENT_LABELS[key] ?? key}
          </Link>
        ))}
      </div>

      {statement && (
        <div className="overflow-x-auto rounded-[18px] border border-line">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase text-ink-4">
                <th className="p-3">Line item</th>
                {statement.periods.slice(-5).map((p) => (
                  <th key={p} className="p-3 text-right font-tabular">{p}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {statement.rows.map((row) => (
                <tr key={row.key} className="border-b border-line last:border-0">
                  <td className="p-3 pr-4">{row.label}</td>
                  {row.values.slice(-5).map((v, i) => (
                    <td key={i} className="p-3 text-right font-tabular">
                      {v != null ? v.toLocaleString("en-IN") : "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-xs text-ink-4">{data.sourceNote}</p>
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
