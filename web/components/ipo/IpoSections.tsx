import Link from "next/link";
import type { Ipo, IpoStatus } from "@/lib/ipo/types";

function fmtCr(v: number | null | undefined): string | null {
  if (v == null) return null;
  return `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 2 })} Cr`;
}

function fmtRupees(v: number | null | undefined): string | null {
  if (v == null) return null;
  return `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function fmtDate(iso: string | undefined): string | null {
  if (!iso) return null;
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", weekday: "short" }).format(
    new Date(`${iso}T00:00:00+05:30`)
  );
}

export function StatusPill({ ipo }: { ipo: Ipo }) {
  const map: Record<IpoStatus, { text: string; className: string }> = {
    open: { text: "Closes " + (fmtDate(ipo.dates.close) ?? "soon"), className: "bg-[#E6F4EC] text-[#167A3E]" },
    upcoming: { text: "Opens " + (fmtDate(ipo.dates.open) ?? "soon"), className: "bg-surface-3 text-ink-3" },
    "listing-soon": { text: "Lists " + (fmtDate(ipo.dates.listing) ?? "soon"), className: "bg-[#FBEAEC] text-brand-ink" },
    closed: { text: "Closed", className: "bg-surface-3 text-ink-3" },
    listed: { text: "Listed", className: "bg-surface-3 text-ink-3" },
  };
  const { text, className } = map[ipo.status];
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>{text}</span>;
}

export function IpoCard({ ipo, selected, href }: { ipo: Ipo; selected: boolean; href: string }) {
  const subscribed = ipo.subscription?.overall;
  return (
    <Link
      href={href}
      scroll={false}
      aria-pressed={selected}
      className={`block rounded-[18px] border p-4 transition-colors ${
        selected ? "ring-1 ring-ink" : "hover:bg-surface-2"
      }`}
      style={{ borderColor: "var(--line)" }}
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <p className="text-[17px] font-bold">{ipo.name}</p>
          <p className="text-xs text-ink-4">
            {ipo.segment === "mainboard" ? "Mainboard" : "SME"} · {ipo.exchanges.join(", ")}
          </p>
        </div>
        <StatusPill ipo={ipo} />
      </div>
      <div className="grid grid-cols-2 gap-2 font-tabular text-[13px] sm:grid-cols-4">
        <div>
          <p className="text-[11px] text-ink-4">Price band</p>
          <p className="font-semibold">
            {ipo.priceBand ? `₹${ipo.priceBand.low}${ipo.priceBand.low !== ipo.priceBand.high ? `–${ipo.priceBand.high}` : ""}` : "—"}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-ink-4">Min. investment</p>
          <p className="font-semibold">{fmtRupees(ipo.minInvestment) ?? "—"}</p>
        </div>
        <div>
          <p className="text-[11px] text-ink-4">Issue size</p>
          <p className="font-semibold">{fmtCr(ipo.issueSizeCr) ?? "—"}</p>
        </div>
        <div>
          <p className="text-[11px] text-ink-4">Subscribed</p>
          <p className={`font-semibold ${subscribed != null && subscribed >= 1 ? "up" : ""}`}>
            {subscribed != null ? `${subscribed.toFixed(2)}x` : "—"}
          </p>
        </div>
      </div>
    </Link>
  );
}

function Timeline({ dates, status }: { dates: Ipo["dates"]; status: IpoStatus }) {
  const steps: { label: string; date?: string; key: "open" | "close" | "allotment" | "listing" }[] = [
    { label: "Opens", date: dates.open, key: "open" },
    { label: "Closes", date: dates.close, key: "close" },
    { label: "Allotment", date: dates.allotment, key: "allotment" },
    { label: "Listing", date: dates.listing, key: "listing" },
  ];
  const currentKey: Record<IpoStatus, string> = {
    upcoming: "open",
    open: "close",
    closed: "allotment",
    "listing-soon": "listing",
    listed: "listing",
  };

  return (
    <div className="grid grid-cols-4 gap-2">
      {steps.map((s) => {
        const isCurrent = currentKey[status] === s.key;
        const isDone = s.date != null && !isCurrent;
        const color = isCurrent ? "var(--brand-ink)" : isDone ? "var(--ink)" : "var(--line-2)";
        return (
          <div key={s.key}>
            <div className="mb-1.5 h-1.5 rounded-full" style={{ background: color }} />
            <p className="text-[11px] text-ink-4">{s.label}</p>
            <p className="text-xs font-semibold">{fmtDate(s.date) ?? "Not announced"}</p>
          </div>
        );
      })}
    </div>
  );
}

function SubscriptionBar({ label, times }: { label: string; times: number | undefined }) {
  if (times == null) return null;
  const widthPct = Math.min(times, 10) * 10;
  return (
    <div className="mb-2">
      <div className="mb-0.5 flex items-center justify-between text-xs">
        <span className="text-ink-3">{label}</span>
        <span className={`font-tabular font-semibold ${times >= 1 ? "up" : "text-ink-3"}`}>{times.toFixed(2)}x</span>
      </div>
      <div className="relative h-2 rounded-full bg-surface-3">
        <div
          className="h-full rounded-full"
          style={{ width: `${widthPct}%`, background: times >= 1 ? "var(--up-text)" : "var(--ink-4)" }}
        />
        <div className="absolute top-0 h-2 w-px bg-ink-3" style={{ left: "10%" }} title="1x" />
      </div>
    </div>
  );
}

export function IpoDetails({ ipo }: { ipo: Ipo }) {
  const hasFreshOfs = ipo.freshIssueCr != null || ipo.ofsCr != null;
  const freshPct =
    hasFreshOfs && ipo.freshIssueCr != null && ipo.ofsCr != null
      ? (ipo.freshIssueCr / (ipo.freshIssueCr + ipo.ofsCr)) * 100
      : null;

  return (
    <div className="rounded-[18px] border border-line p-5">
      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.06em] text-brand-ink">
        {ipo.segment === "mainboard" ? "Mainboard" : "SME"} · {ipo.exchanges.join(", ")} · {ipo.status}
      </p>
      <h2 className="mb-3 text-[1.75rem] font-bold">{ipo.name}</h2>
      {ipo.about && <p className="mb-4 text-sm text-ink-3">{ipo.about}</p>}

      <h3 className="mb-2 text-sm font-semibold text-ink-3">Timeline</h3>
      <Timeline dates={ipo.dates} status={ipo.status} />

      <h3 className="mb-2 mt-5 text-sm font-semibold text-ink-3">Issue details</h3>
      <dl className="space-y-2">
        {[
          ["Price band", ipo.priceBand ? `₹${ipo.priceBand.low}–${ipo.priceBand.high}` : null],
          ["Lot size", ipo.lotSize != null ? `${ipo.lotSize} shares` : null],
          ["Min. retail investment", fmtRupees(ipo.minInvestment)],
          ["Issue size", fmtCr(ipo.issueSizeCr)],
          ["Fresh issue", fmtCr(ipo.freshIssueCr)],
          ["Offer for sale", fmtCr(ipo.ofsCr)],
        ]
          .filter(([, v]) => v != null)
          .map(([label, value]) => (
            <div key={label} className="flex items-center justify-between text-sm">
              <dt className="text-ink-3">{label}</dt>
              <dd className="font-tabular font-semibold">{value}</dd>
            </div>
          ))}
        {[
          ["Price band", ipo.priceBand],
          ["Lot size", ipo.lotSize],
          ["Min. retail investment", ipo.minInvestment],
          ["Issue size", ipo.issueSizeCr],
        ].every(([, v]) => v == null) && <p className="text-sm text-ink-4">Not announced.</p>}
      </dl>

      {hasFreshOfs && freshPct != null && (
        <div className="mt-4">
          <div className="flex h-[10px] overflow-hidden rounded-full">
            <div style={{ width: `${freshPct}%`, background: "var(--brand-ink)" }} />
            <div style={{ width: `${100 - freshPct}%`, background: "var(--line-2)" }} />
          </div>
          <div className="mt-1.5 flex gap-4 text-[11px] text-ink-4">
            <span>Fresh issue: money to the company</span>
            <span>Offer for sale: to sellers</span>
          </div>
        </div>
      )}

      <h3 className="mb-2 mt-5 text-sm font-semibold text-ink-3">Subscription</h3>
      {ipo.subscription ? (
        <div>
          <p className="mb-2 text-[11px] text-ink-4">
            As of {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(ipo.subscription.asOf))}
          </p>
          <SubscriptionBar label="Overall" times={ipo.subscription.overall} />
          <SubscriptionBar label="QIB" times={ipo.subscription.qib} />
          <SubscriptionBar label="NII" times={ipo.subscription.nii} />
          <SubscriptionBar label="Retail" times={ipo.subscription.retail} />
          <SubscriptionBar label="Employee" times={ipo.subscription.employee} />
        </div>
      ) : (
        <p className="text-sm text-ink-4">
          {ipo.dates.open ? `Bidding opens ${fmtDate(ipo.dates.open)}.` : "Not announced."}
        </p>
      )}

      {(ipo.registrar || (ipo.leadManagers && ipo.leadManagers.length > 0)) && (
        <>
          <h3 className="mb-2 mt-5 text-sm font-semibold text-ink-3">Who is running the issue</h3>
          <dl className="space-y-2">
            {ipo.registrar && (
              <div className="flex items-center justify-between text-sm">
                <dt className="text-ink-3">Registrar</dt>
                <dd className="text-right font-semibold">{ipo.registrar}</dd>
              </div>
            )}
            {ipo.leadManagers && ipo.leadManagers.length > 0 && (
              <div className="flex items-center justify-between gap-3 text-sm">
                <dt className="text-ink-3">Lead managers</dt>
                <dd className="text-right font-semibold">{ipo.leadManagers.join(", ")}</dd>
              </div>
            )}
          </dl>
        </>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <a
          href="https://www.nseindia.com/market-data/all-upcoming-issues-ipo"
          target="_blank"
          rel="noopener"
          className="flex h-11 items-center rounded-[12px] bg-ink px-4 text-sm font-semibold text-white"
        >
          Check on NSE
        </a>
        {ipo.offerDocUrl && (
          <a
            href={ipo.offerDocUrl}
            target="_blank"
            rel="noopener"
            className="flex h-11 items-center rounded-[12px] border border-line-2 px-4 text-sm font-semibold text-ink"
          >
            Read the offer document
          </a>
        )}
      </div>
    </div>
  );
}
