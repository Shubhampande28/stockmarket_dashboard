import { NextRequest, NextResponse } from "next/server";
import { getSnapshot } from "@/lib/api";
import { matchStocks } from "@/lib/search";

/** Suggestions for the home/header search box (brief section 4). Reuses the
 * existing /stocks snapshot as the search index -- no new data provider. */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  if (!q.trim()) return NextResponse.json({ results: [] });

  const snapshot = await getSnapshot().catch(() => null);
  if (!snapshot || "error" in snapshot) return NextResponse.json({ results: [] });

  return NextResponse.json({ results: matchStocks(snapshot, q) });
}
