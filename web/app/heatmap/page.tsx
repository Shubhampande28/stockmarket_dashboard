import { Suspense } from "react";
import type { Metadata } from "next";
import HeatmapClient from "@/components/heatmap/HeatmapClient";
import { getSnapshot } from "@/lib/api";

export const metadata: Metadata = {
  title: "Nifty 50 Heatmap",
  description: "Live NSE heatmap: tile size is index weight, colour is today's move, grouped by sector.",
};

async function HeatmapData() {
  let snapshot = null;
  try {
    const result = await getSnapshot();
    if (!("error" in result)) snapshot = result;
  } catch {
    snapshot = null;
  }
  return <HeatmapClient initialSnapshot={snapshot} />;
}

export default function HeatmapPage() {
  return (
    <Suspense>
      <HeatmapData />
    </Suspense>
  );
}
