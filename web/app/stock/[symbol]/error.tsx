"use client";

import { ErrorPanel } from "@/components/states/DataStates";

export default function StockError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-[640px] px-5 py-16">
      <ErrorPanel onRetry={reset} />
    </div>
  );
}
