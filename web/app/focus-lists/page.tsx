import type { Metadata } from "next";
import FocusListsClient from "@/components/FocusListsClient";

export const metadata: Metadata = {
  title: "Focus Lists",
  description: "Rule-based stock screens, refreshed after every close: near 52-week high/low, volume shockers, steady climbers.",
};

export default function FocusListsPage() {
  return (
    <div className="mx-auto max-w-[1360px] px-5 py-8 lg:px-10">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-ink">Focus Lists</p>
      <h1 className="mb-1 text-[2rem] font-bold">Stocks the data is pointing at</h1>
      <p className="mb-5 max-w-[62ch] text-sm text-ink-4">
        Rule-based screens over the stock universe, refreshed after every close. Each list shows the exact rule it uses, so you can see why a stock is on it.
      </p>
      <FocusListsClient />
    </div>
  );
}
