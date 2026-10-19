import type { Metadata } from "next";
import MarketMoodClient from "@/components/MarketMoodClient";
import { getMood, getMoodHistory } from "@/lib/api";

export const metadata: Metadata = {
  title: "Market Mood",
  description:
    "The Equilytics Mood Index: one score from 0 to 100 built from six real-time signals across NSE stocks, plus the Mood vs Nifty 50 chart.",
};

export default async function MarketMoodPage() {
  const [moodResult, historyResult] = await Promise.allSettled([getMood(), getMoodHistory(365)]);

  const mood = moodResult.status === "fulfilled" && !("error" in moodResult.value) ? moodResult.value : null;
  const history = historyResult.status === "fulfilled" ? historyResult.value : [];

  return <MarketMoodClient initialMood={mood} initialHistory={history} />;
}
