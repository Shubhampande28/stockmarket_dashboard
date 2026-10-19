"use client";

import { usePathname } from "next/navigation";
import SearchBox from "@/components/SearchBox";

export default function StockNotFound() {
  const pathname = usePathname();
  const symbol = decodeURIComponent(pathname?.split("/").pop() ?? "").toUpperCase();

  return (
    <div className="mx-auto max-w-[640px] px-5 py-16 text-center">
      <h1 className="mb-2 text-xl font-bold">We couldn&apos;t find {symbol}</h1>
      <p className="mb-6 text-sm text-ink-4">
        Check the spelling, or search for the stock below.
      </p>
      <SearchBox variant="hero" />
    </div>
  );
}
