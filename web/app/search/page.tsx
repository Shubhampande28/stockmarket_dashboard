import Link from "next/link";
import type { Metadata } from "next";
import { getSnapshot } from "@/lib/api";
import { matchStocks } from "@/lib/search";
import { formatSignedPct } from "@/lib/heatmap/scale";

export const metadata: Metadata = {
  title: "Search results",
  robots: { index: false, follow: true },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";

  const snapshot = await getSnapshot().catch(() => null);
  const results = snapshot && !("error" in snapshot) ? matchStocks(snapshot, q, 20) : [];

  return (
    <div className="mx-auto max-w-[640px] px-5 py-10">
      <h1 className="mb-1 text-xl font-bold">Search results for &ldquo;{q}&rdquo;</h1>
      {results.length === 0 ? (
        <p className="mt-4 text-sm text-ink-4">
          No stock matches &ldquo;{q}&rdquo;. Try a symbol like RELIANCE or TCS.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-line rounded-[16px] border border-line">
          {results.map((r) => (
            <li key={r.symbol}>
              <Link
                href={`/stock/${r.symbol}`}
                className="flex h-14 items-center justify-between gap-3 px-4 hover:bg-surface-2"
              >
                <div className="min-w-0">
                  <div className="truncate text-[15px] font-semibold text-ink">{r.name}</div>
                  <div className="font-tabular text-[12.5px] text-ink-4">{r.symbol} · NSE</div>
                </div>
                <div className="shrink-0 text-right font-tabular">
                  <div className="text-sm font-semibold text-ink">
                    {r.price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                  </div>
                  <div className={Math.abs(r.change) <= 0.2 ? "text-ink-3" : r.change > 0 ? "up" : "down"}>
                    {formatSignedPct(r.change)}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
