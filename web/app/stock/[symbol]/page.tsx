import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getFinancials,
  getNews,
  getSnapshot,
  getStockHistory,
  getStockSummary,
  STOCK_HISTORY_RANGES,
  type StockHistoryRange,
  type StockRow,
} from "@/lib/api";
import PriceChart from "@/components/stock/PriceChart";
import { getFundamentals } from "@/lib/stock/upstox";
import {
  AboutCard,
  Actions,
  DividendsPanel,
  FinancialsPanel,
  KeyRatios,
  NewsPanel,
  PeersPanel,
  ShareholdingPanel,
  SummaryRow,
  TodayVsMarket,
} from "@/components/stock/StockSections";

type PageParams = { symbol: string };
type PageSearchParams = { tab?: string; range?: string; statement?: string };

async function loadSummary(symbol: string) {
  // Let network failures throw -- the error.tsx boundary shows a retry
  // panel for those. Only a defined {error} response (unknown symbol)
  // becomes a 404 via notFound() in the caller.
  const result = await getStockSummary(symbol);
  if ("error" in result) return null;
  return result;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { symbol } = await params;
  const summary = await loadSummary(symbol.toUpperCase());
  if (!summary) return { title: symbol.toUpperCase() };
  return {
    title: `${summary.name} (${summary.symbol}) Share Price`,
    description: `${summary.name} (NSE: ${summary.symbol}) live price, financials and news on Equilytics.`,
  };
}

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "financials", label: "Financials" },
  { id: "news", label: "News" },
] as const;

export default async function StockPage({
  params,
  searchParams,
}: {
  params: Promise<PageParams>;
  searchParams: Promise<PageSearchParams>;
}) {
  const { symbol: rawSymbol } = await params;
  const symbol = rawSymbol.toUpperCase();
  const sp = await searchParams;
  const activeTab = TABS.some((t) => t.id === sp.tab) ? sp.tab! : "overview";
  const requestedRange = STOCK_HISTORY_RANGES.includes(sp.range as StockHistoryRange)
    ? (sp.range as StockHistoryRange)
    : undefined;

  const summary = await loadSummary(symbol);
  if (!summary) notFound();

  const [snapshotResult, historyResult, financialsResult, newsResult, fundamentalsResult] = await Promise.allSettled([
    getSnapshot(),
    getStockHistory(symbol, requestedRange),
    getFinancials(symbol),
    getNews(symbol),
    getFundamentals(symbol),
  ]);

  const snapshot = snapshotResult.status === "fulfilled" && !("error" in snapshotResult.value) ? snapshotResult.value : null;
  const history = historyResult.status === "fulfilled" && !("error" in historyResult.value) ? historyResult.value : null;
  const financials = financialsResult.status === "fulfilled" && !("error" in financialsResult.value) ? financialsResult.value : null;
  const news = newsResult.status === "fulfilled" && !("error" in newsResult.value) ? newsResult.value.items : [];
  const fundamentals =
    fundamentalsResult.status === "fulfilled" && !("error" in fundamentalsResult.value) ? fundamentalsResult.value : null;

  const sectorRows = snapshot && summary.sectorKey ? ((snapshot[summary.sectorKey] as StockRow[] | undefined) ?? []) : [];
  const sectorChange = sectorRows.length
    ? sectorRows.reduce((sum, r) => sum + r.change, 0) / sectorRows.length
    : null;
  const niftyChange = snapshot?.indexQuotes?.["NIFTY 50"]?.change ?? null;
  const asOfMs = snapshot?._meta?.computedAt ? snapshot._meta.computedAt * 1000 : null;

  return (
    <div className="mx-auto max-w-[1360px] px-5 py-6 lg:px-10">
      <Link href="/" className="mb-4 inline-block text-[13.5px] text-ink-3 hover:underline">
        ← Back to search
      </Link>

      <SummaryRow summary={summary} asOfMs={asOfMs} />
      <Actions symbol={summary.symbol} />

      <div role="tablist" aria-label="Stock sections" className="mt-6 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((tab) => (
          <Link
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            href={`?tab=${tab.id}`}
            scroll={false}
            className={`shrink-0 whitespace-nowrap border-b-2 px-4 py-3 text-sm ${
              activeTab === tab.id ? "border-ink font-semibold text-ink" : "border-transparent text-ink-3"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="py-6">
        {activeTab === "overview" && (
          <div className="flex flex-wrap gap-5">
            <div className="flex min-w-0 flex-col gap-5" style={{ flex: "999 1 640px" }}>
              <PriceChart symbol={summary.symbol} history={history} />
              <AboutCard description={fundamentals?.profile?.company_profile} />
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <PeersPanel competitors={fundamentals?.competitors ?? null} />
                <ShareholdingPanel shareHoldings={fundamentals?.shareHoldings ?? null} />
              </div>
            </div>
            <div className="flex flex-col gap-5" style={{ flex: "1 1 300px" }}>
              <KeyRatios
                keyRatios={fundamentals?.keyRatios ?? null}
                bookValue={financials?.info?.bookValue}
                faceValue={financials?.info?.faceValue}
                asOf={fundamentals?.asOf ?? null}
                stale={fundamentals?.stale ?? false}
              />
              <TodayVsMarket
                stockChange={summary.quote?.change ?? null}
                sectorChange={sectorChange}
                sectorLabel={summary.sector}
                niftyChange={niftyChange}
              />
              <DividendsPanel actions={fundamentals?.corporateActions ?? null} />
            </div>
          </div>
        )}

        {activeTab === "financials" && (
          <FinancialsPanel
            incomeStatementQuarterly={fundamentals?.incomeStatementQuarterly ?? null}
            incomeStatementAnnual={fundamentals?.incomeStatementAnnual ?? null}
            balanceSheet={fundamentals?.balanceSheet ?? null}
            cashFlow={fundamentals?.cashFlow ?? null}
            statementKey={sp.statement ?? "quarterly"}
            symbol={summary.symbol}
          />
        )}

        {activeTab === "news" && <NewsPanel items={news} symbol={summary.symbol} />}
      </div>

      <p className="mt-10 border-t border-line pt-5 text-xs text-ink-4">
        Quotes may be delayed. For information only, not investment advice. Verify with NSE/BSE filings before acting.
      </p>
    </div>
  );
}
