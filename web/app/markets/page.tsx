import type { Metadata } from "next";
import MarketsClient from "@/components/MarketsClient";
import { getSnapshot } from "@/lib/api";

export const metadata: Metadata = {
  title: "Markets",
  description: "Index levels, market breadth, sector performance and today's biggest gainers and losers.",
};

export default async function MarketsPage() {
  let snapshot = null;
  try {
    const result = await getSnapshot();
    if (!("error" in result)) snapshot = result;
  } catch {
    snapshot = null;
  }
  return (
    <div className="mx-auto max-w-[1360px] px-5 py-8 lg:px-10">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-ink">Markets</p>
      <h1 className="mb-5 text-[2rem] font-bold">Markets overview</h1>
      <MarketsClient initialSnapshot={snapshot} />
    </div>
  );
}
