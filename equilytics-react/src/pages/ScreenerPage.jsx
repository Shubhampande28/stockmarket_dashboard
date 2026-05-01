import { useMemo, useState } from "react";
import FilterPanel from "../components/FilterPanel.jsx";
import StockCard from "../components/StockCard.jsx";
import StockTable from "../components/StockTable.jsx";
import { stocks } from "../data/stocks.js";

export default function ScreenerPage() {
  const [filterOpen, setFilterOpen] = useState(false);
  const gainers = useMemo(() => stocks.filter((stock) => stock.change > 0).length, []);
  const avgChange = useMemo(
    () => stocks.reduce((total, stock) => total + stock.change, 0) / stocks.length,
    []
  );

  return (
    <main className="min-w-0 space-y-4">
      <section className="rounded-[32px] border border-white/10 bg-white/[0.045] p-5 shadow-card backdrop-blur-2xl md:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-accent-blue">Premium screener</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-white md:text-5xl">
              Discover strong businesses before the crowd does.
            </h1>
            <p className="mt-4 text-sm leading-6 text-text-secondary md:text-base">
              Filter the market by quality, valuation and momentum. Built for scanning speed, calm decision-making
              and high signal-to-noise research.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 sm:min-w-[380px]">
            <Metric label="Stocks" value={stocks.length} />
            <Metric label="Gainers" value={gainers} positive />
            <Metric label="Avg move" value={`${avgChange.toFixed(2)}%`} />
          </div>
        </div>
      </section>

      <div className="grid min-h-[640px] grid-cols-1 gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
        <FilterPanel />

        <section className="min-w-0 space-y-4">
          <div className="flex items-center justify-between gap-3 rounded-[24px] border border-white/10 bg-white/[0.045] p-3 shadow-card backdrop-blur-2xl">
            <div>
              <h2 className="text-lg font-black text-white">Screen results</h2>
              <p className="mt-1 text-sm text-text-secondary">Sorted by signal quality and current price action.</p>
            </div>
            <button
              onClick={() => setFilterOpen(true)}
              className="rounded-2xl border border-accent-blue/40 bg-accent-blue/15 px-4 py-2 text-sm font-black text-white transition duration-200 hover:-translate-y-0.5 active:scale-[0.98] xl:hidden"
            >
              Filters
            </button>
          </div>

          <StockTable stocks={stocks} />

          <div className="space-y-3 md:hidden">
            {stocks.map((stock) => (
              <StockCard key={stock.id} stock={stock} />
            ))}
          </div>
        </section>
      </div>

      {filterOpen && <FilterPanel sheet onClose={() => setFilterOpen(false)} />}
    </main>
  );
}

function Metric({ label, value, positive = false }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-ink-850/80 p-4">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-text-muted">{label}</p>
      <p className={`mt-2 text-2xl font-black ${positive ? "text-accent-green" : "text-white"}`}>{value}</p>
    </div>
  );
}
