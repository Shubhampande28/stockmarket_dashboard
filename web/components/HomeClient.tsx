import Link from "next/link";
import SearchBox from "./SearchBox";
import { formatSignedPct } from "@/lib/heatmap/scale";
import { marketStatus } from "@/lib/market/session";
import type { MoodResult, Snapshot } from "@/lib/api";

const POPULAR_SYMBOLS = ["RELIANCE", "HDFCBANK", "TCS", "INFY", "TATAMOTORS"];
const BOTTOM_STRIP_KEYS = ["NIFTY 50", "SENSEX", "BANK NIFTY", "MIDCAP 150"];

export default function HomeClient({
  mood,
  snapshot,
}: {
  mood: MoodResult | null;
  snapshot: Snapshot | null;
}) {
  const open = marketStatus() === "open";
  const indexQuotes = snapshot && !("error" in snapshot) ? snapshot.indexQuotes ?? {} : {};
  const stripEntries = Object.entries(indexQuotes).filter(
    ([, q]) => BOTTOM_STRIP_KEYS.includes(q.label) && typeof q.price === "number"
  );

  return (
    <div className="flex min-h-[calc(100vh-56px)] flex-col">
      <div className="flex flex-1 flex-col items-center justify-center px-5 py-10" style={{ paddingTop: "14vh" }}>
        <div className="mx-auto flex w-full max-w-[640px] flex-col items-center gap-5 text-center">
          <h1 className="text-[52px] font-extrabold leading-none tracking-[-0.05em] sm:text-[76px]">
            Equi<span className="text-brand">lytics</span>
          </h1>
          <p className="text-base text-ink-3 sm:text-[16px]">
            Search any NSE or BSE stock for price, financials and news.
          </p>
          <div className="w-full">
            <SearchBox variant="hero" autoFocus />
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="font-tabular text-[12.5px] font-semibold text-ink-4">Popular</span>
            {POPULAR_SYMBOLS.map((symbol) => (
              <Link
                key={symbol}
                href={`/stock/${symbol}`}
                className="flex h-9 items-center rounded-full border px-3 font-tabular text-[12.5px] font-semibold text-ink-2 transition-colors hover:bg-surface-2"
                style={{ borderColor: "var(--line-2)" }}
              >
                {symbol}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-line px-5 py-4">
        <div className="mx-auto flex max-w-[1360px] flex-wrap items-center justify-center gap-5 font-tabular text-[12.5px]">
          <span className="flex items-center gap-1.5 font-sans font-medium text-ink-3">
            <span
              className={`inline-block h-[7px] w-[7px] rounded-full ${open ? "bg-live" : "bg-ink-4"}`}
              aria-hidden="true"
            />
            {open ? "Market open" : "Market closed"}
          </span>
          {stripEntries.map(([key, q]) => (
            <span key={key} className="whitespace-nowrap">
              <span className="text-ink-4">{q.label}</span>{" "}
              <b className="font-semibold">{q.price!.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</b>{" "}
              <span className={Math.abs(q.change ?? 0) <= 0.2 ? "text-ink-3" : (q.change ?? 0) >= 0 ? "up" : "down"}>
                {formatSignedPct(q.change ?? 0, 2)}
              </span>
            </span>
          ))}
          <Link href="/market-mood" className="font-sans text-[13px] font-semibold text-brand-ink">
            {mood ? `Market Mood: ${mood.zone} →` : "Market Mood →"}
          </Link>
        </div>
      </div>

      <section className="border-t border-line bg-surface-2 px-5 py-10">
        <div className="mx-auto max-w-[760px] text-sm text-ink-3">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-ink-4">About Equilytics</h2>
          <p>
            Equilytics is a free, no-login lookup for Indian equities. Search any NSE or BSE-listed
            company for its live price, financial statements and recent news, track the Equilytics
            Mood Index — a daily read on market sentiment built from breadth, momentum, volatility
            and other NSE-wide signals — browse the Nifty 50 heatmap, follow open and upcoming IPOs,
            and read the Daily Brief for a short summary of each trading day.
          </p>
        </div>
      </section>
    </div>
  );
}
