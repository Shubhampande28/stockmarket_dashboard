import { NextResponse } from "next/server";
import { getIpoFeed } from "@/lib/ipo/source";

export async function GET() {
  const feed = await getIpoFeed();
  return NextResponse.json(feed);
}
