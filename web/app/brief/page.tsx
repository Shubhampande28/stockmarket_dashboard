import type { Metadata } from "next";
import Link from "next/link";
import { getBriefIndex } from "@/lib/api";

export const metadata: Metadata = {
  title: "Daily Brief Archive",
  description: "Every Equilytics Daily Brief: what moved the Indian stock market, day by day.",
};

export default async function BriefIndexPage() {
  let briefs: Awaited<ReturnType<typeof getBriefIndex>>["briefs"] = [];
  try {
    const result = await getBriefIndex(1);
    briefs = result.briefs;
  } catch {
    briefs = [];
  }

  return (
    <div className="mx-auto max-w-[1360px] px-5 py-8 lg:px-10">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-ink">Daily Brief</p>
      <h1 className="mb-6 text-[2rem] font-bold">Equilytics Daily Brief archive</h1>

      {briefs.length === 0 ? (
        <p className="text-sm text-ink-4">No briefs published yet -- check back after today&apos;s close.</p>
      ) : (
        <ul className="divide-y divide-line">
          {briefs.map((b) => (
            <li key={b.date} className="flex items-baseline gap-4 py-3">
              <span className="font-tabular w-20 shrink-0 text-xs text-ink-4">{b.date}</span>
              <Link href={`/brief/${b.date}`} className="flex-1 font-medium hover:underline">
                {b.title}
              </Link>
              {b.data?.mood && (
                <span className="font-tabular shrink-0 text-sm text-ink-4">{b.data.mood.score}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
