import Link from "next/link";
import type { Metadata } from "next";
import { getIpoFeed } from "@/lib/ipo/source";
import type { Ipo, IpoSegment } from "@/lib/ipo/types";
import { IpoCard, IpoDetails } from "@/components/ipo/IpoSections";

export const metadata: Metadata = {
  title: "IPOs",
  description: "Upcoming IPOs in India: dates, price band, lot size and subscription.",
};

const STATUS_FILTERS = [
  { id: "all", label: "All" },
  { id: "open", label: "Open now" },
  { id: "upcoming", label: "Upcoming" },
  { id: "listing-soon", label: "Listing soon" },
] as const;

const SEGMENT_FILTERS = [
  { id: "all", label: "All" },
  { id: "mainboard", label: "Mainboard" },
  { id: "sme", label: "SME" },
] as const;

const STATUS_ORDER: Record<string, number> = { open: 0, upcoming: 1, "listing-soon": 2, closed: 3, listed: 4 };

function sortIpos(ipos: Ipo[]): Ipo[] {
  return [...ipos].sort((a, b) => {
    const orderDiff = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9);
    if (orderDiff !== 0) return orderDiff;
    const aDate = a.status === "open" ? a.dates.close : a.status === "upcoming" ? a.dates.open : a.dates.listing;
    const bDate = b.status === "open" ? b.dates.close : b.status === "upcoming" ? b.dates.open : b.dates.listing;
    if (!aDate || !bDate) return 0;
    return aDate.localeCompare(bDate);
  });
}

export default async function IposPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; segment?: string; ipo?: string }>;
}) {
  const sp = await searchParams;
  const feed = await getIpoFeed();
  const statusFilter = STATUS_FILTERS.some((f) => f.id === sp.status) ? sp.status! : "all";
  const segmentFilter = SEGMENT_FILTERS.some((f) => f.id === sp.segment) ? (sp.segment as IpoSegment | "all") : "all";

  const counts = {
    all: feed.ipos.length,
    open: feed.ipos.filter((i) => i.status === "open").length,
    upcoming: feed.ipos.filter((i) => i.status === "upcoming").length,
    "listing-soon": feed.ipos.filter((i) => i.status === "listing-soon").length,
  };

  const filtered = feed.ipos.filter((i) => {
    if (statusFilter !== "all" && i.status !== statusFilter) return false;
    if (segmentFilter !== "all" && i.segment !== segmentFilter) return false;
    return true;
  });
  const sorted = sortIpos(filtered);
  const selectedSlug = sp.ipo && sorted.some((i) => i.slug === sp.ipo) ? sp.ipo : sorted[0]?.slug;
  const selected = sorted.find((i) => i.slug === selectedSlug);

  const filterHref = (next: Partial<{ status: string; segment: string; ipo: string }>) => {
    const params = new URLSearchParams();
    const status = next.status ?? statusFilter;
    const segment = next.segment ?? segmentFilter;
    if (status !== "all") params.set("status", status);
    if (segment !== "all") params.set("segment", segment);
    if (next.ipo) params.set("ipo", next.ipo);
    const qs = params.toString();
    return qs ? `/ipos?${qs}` : "/ipos";
  };

  if (feed.ipos.length === 0 && feed.stale) {
    // No cached copy exists either -- a true failure, not just an empty
    // filter. error.tsx would only catch a thrown exception; getIpoFeed()
    // never throws, so this state is handled inline instead.
    return (
      <div className="mx-auto max-w-[640px] px-5 py-16 text-center">
        <p className="mb-2 font-semibold">Couldn&apos;t reach the IPO feed</p>
        <p className="text-sm text-ink-4">NSE&apos;s IPO data is temporarily unavailable. Try again shortly.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1360px] px-5 py-6 lg:px-10">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.1em] text-brand-ink">IPOS</p>
          <h1 className="text-[2rem] font-bold tracking-[-0.03em]">IPO calendar</h1>
          <p className="mt-1 max-w-[62ch] text-sm text-ink-3">
            Issues open now, opening soon and about to list on NSE and BSE. Select any IPO for dates,
            pricing, subscription and who is behind it.
          </p>
        </div>
        <span className="whitespace-nowrap rounded-full bg-surface-3 px-3 py-1.5 text-xs font-semibold text-ink-3">
          {feed.stale && "Last updated · "}
          Updated{" "}
          {new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(
            new Date(feed.asOf)
          )}{" "}
          IST
        </span>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="scroll-x-strip flex items-center gap-1 rounded-full bg-surface-3 p-1">
          {STATUS_FILTERS.map((f) => (
            <Link
              key={f.id}
              href={filterHref({ status: f.id })}
              aria-pressed={statusFilter === f.id}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
                statusFilter === f.id ? "bg-surface text-ink shadow-sm" : "text-ink-3"
              }`}
            >
              {f.label}{" "}
              <span className="font-tabular">{f.id === "all" ? counts.all : counts[f.id as keyof typeof counts]}</span>
            </Link>
          ))}
        </div>
        <div className="scroll-x-strip flex items-center gap-1 rounded-full bg-surface-3 p-1">
          {SEGMENT_FILTERS.map((f) => (
            <Link
              key={f.id}
              href={filterHref({ segment: f.id })}
              aria-pressed={segmentFilter === f.id}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
                segmentFilter === f.id ? "bg-surface text-ink shadow-sm" : "text-ink-3"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-5">
        <div className="min-w-0" style={{ flex: "1 1 520px" }}>
          {sorted.length === 0 ? (
            <p className="rounded-[18px] border border-line bg-surface-2 p-6 text-sm text-ink-4">
              No IPOs match this filter right now.
            </p>
          ) : (
            <div className="space-y-3">
              {sorted.map((ipo) => (
                <IpoCard key={ipo.slug} ipo={ipo} selected={ipo.slug === selectedSlug} href={filterHref({ ipo: ipo.slug })} />
              ))}
            </div>
          )}

          {feed.pipeline.length > 0 && (
            <div className="mt-5">
              <h2 className="mb-2 text-sm font-semibold text-ink-3">In the pipeline, dates not announced</h2>
              <div className="flex flex-wrap gap-2">
                {feed.pipeline.map((name) => (
                  <span key={name} className="rounded-full border px-3 py-1.5 text-xs" style={{ borderColor: "var(--line-2)" }}>
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="min-w-0" style={{ flex: "1 1 440px" }}>
          {selected ? (
            <IpoDetails ipo={selected} />
          ) : (
            <p className="rounded-[18px] border border-line bg-surface-2 p-6 text-sm text-ink-4">
              Select an IPO from the list.
            </p>
          )}
        </div>
      </div>

      <p className="mt-10 border-t border-line pt-5 text-xs text-ink-4">
        Figures as reported by NSE; subscription changes through the day. For information only, not
        investment advice. Read the offer document before applying.
      </p>
    </div>
  );
}
