"use client";

import { useEffect, useState } from "react";
import { getFinancials, getNews, type FinancialsData, type NewsItem } from "@/lib/api";
import { Skeleton, ErrorPanel } from "./states/DataStates";

const INFO_LABELS: Record<string, string> = {
  currentPrice: "Current price",
  highLow: "52-week high / low",
  marketCap: "Market cap",
  stockPe: "P/E",
  bookValue: "Book value",
  dividendYield: "Dividend yield",
  roce: "ROCE",
  roe: "ROE",
  faceValue: "Face value",
};

function StatementTable({ title, statement }: { title: string; statement: FinancialsData["statements"][string] }) {
  return (
    <div className="mb-6">
      <h3 className="mb-2 font-semibold">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase text-ink-4">
              <th className="py-2">Line item</th>
              {statement.periods.map((p) => (
                <th key={p} className="py-2 text-right font-tabular">{p}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {statement.rows.map((row) => (
              <tr key={row.key} className="border-b border-line">
                <td className="py-1.5 pr-4">{row.label}</td>
                {row.values.map((v, i) => (
                  <td key={i} className="py-1.5 text-right font-tabular">
                    {v != null ? v.toLocaleString("en-IN") : "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function FinancialsClient({ initialSymbol }: { initialSymbol?: string }) {
  const [query, setQuery] = useState(initialSymbol ?? "");
  const [symbol, setSymbol] = useState<string | null>(initialSymbol ?? null);
  const [data, setData] = useState<FinancialsData | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (initialSymbol) load(initialSymbol);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load(sym: string) {
    setLoading(true);
    setError(false);
    setData(null);
    try {
      const result = await getFinancials(sym);
      if ("error" in result) {
        setError(true);
      } else {
        setData(result);
        setSymbol(sym);
      }
      const newsResult = await getNews(sym).catch(() => null);
      if (newsResult && !("error" in newsResult)) setNews(newsResult.items);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (query.trim()) load(query.trim().toUpperCase());
        }}
        className="mb-6 flex gap-2"
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a stock, e.g. RELIANCE"
          className="min-h-11 flex-1 rounded-[12px] border border-line-2 px-3 text-sm"
        />
        <button type="submit" className="rounded-[12px] bg-ink px-4 text-sm font-semibold text-white">
          Search
        </button>
      </form>

      {loading && <Skeleton height={300} />}
      {error && <ErrorPanel onRetry={() => symbol && load(symbol)} />}

      {data && (
        <div>
          <h2 className="mb-1 text-xl font-bold">{data.name}</h2>
          <p className="mb-4 text-xs text-ink-4">
            {data.sourceNote}{" "}
            <a href={data.source.url} target="_blank" rel="noreferrer" className="underline">
              {data.source.provider}
            </a>
          </p>

          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Object.entries(data.info).map(([key, value]) => (
              <div key={key} className="rounded-[10px] border border-line p-2.5">
                <p className="text-xs text-ink-4">{INFO_LABELS[key] ?? key}</p>
                <p className="font-tabular text-sm font-semibold">{value}</p>
              </div>
            ))}
          </div>

          {Object.entries(data.statements).map(([key, statement]) => (
            <StatementTable key={key} title={key} statement={statement} />
          ))}

          {news.length > 0 && (
            <div className="mt-6 border-t border-line pt-5">
              <h3 className="mb-2 font-semibold">Recent news</h3>
              <ul className="space-y-2">
                {news.map((n) => (
                  <li key={n.link}>
                    <a href={n.link} target="_blank" rel="noreferrer" className="text-sm font-medium hover:underline">
                      {n.title}
                    </a>
                    {n.summary && <p className="text-xs text-ink-4">{n.summary}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
