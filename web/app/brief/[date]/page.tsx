import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBriefByDate } from "@/lib/api";

type Params = Promise<{ date: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { date } = await params;
  const result = await getBriefByDate(date).catch(() => null);
  if (!result || "error" in result) return { title: "Daily Brief" };
  return {
    title: result.brief.title,
    description: result.brief.summary,
  };
}

export default async function BriefPage({ params }: { params: Params }) {
  const { date } = await params;
  const result = await getBriefByDate(date).catch(() => null);

  if (!result || "error" in result) notFound();

  const { brief, nearby } = result;

  return (
    <div className="mx-auto max-w-[900px] px-5 py-8 lg:px-10">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-ink">
        Daily Brief · {brief.date} · {brief.source}
      </p>
      <h1 className="mb-3 text-[2rem] font-bold">{brief.title}</h1>
      <div
        className="prose-sm max-w-none [&_li]:mb-2 [&_ul]:list-disc [&_ul]:pl-5"
        dangerouslySetInnerHTML={{ __html: brief.body_html }}
      />
      <p className="mt-4 text-xs text-ink-4">
        Byline: Equilytics Desk · <Link href="/methodology#brief" className="underline">How this brief is made</Link>
      </p>

      {nearby.length > 0 && (
        <div className="mt-8 border-t border-line pt-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-ink-4">More briefs</p>
          <ul className="divide-y divide-line">
            {nearby.map((b) => (
              <li key={b.date} className="flex items-baseline gap-4 py-2">
                <span className="font-tabular w-20 shrink-0 text-xs text-ink-4">{b.date}</span>
                <Link href={`/brief/${b.date}`} className="flex-1 text-sm hover:underline">
                  {b.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
