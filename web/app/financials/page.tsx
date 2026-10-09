import type { Metadata } from "next";
import FinancialsClient from "@/components/FinancialsClient";

export const metadata: Metadata = {
  title: "Financials",
  description: "Search any NSE-listed company for P&L, balance sheet, cash flow, and key ratios.",
};

export default async function FinancialsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const symbol = typeof params.symbol === "string" ? params.symbol : undefined;

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-8 lg:px-10">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-ink">Financials</p>
      <h1 className="mb-5 text-[2rem] font-bold">Company financials</h1>
      <FinancialsClient initialSymbol={symbol} />
    </div>
  );
}
