import HomeClient from "@/components/HomeClient";
import { getMood, getMoodHistory, getSnapshot } from "@/lib/api";

export default async function Home() {
  const [moodResult, historyResult, snapshotResult] = await Promise.allSettled([
    getMood(),
    getMoodHistory(90),
    getSnapshot(),
  ]);

  const mood =
    moodResult.status === "fulfilled" && !("error" in moodResult.value) ? moodResult.value : null;
  const history = historyResult.status === "fulfilled" ? historyResult.value : [];
  const snapshot =
    snapshotResult.status === "fulfilled" && !("error" in snapshotResult.value)
      ? snapshotResult.value
      : null;

  return <HomeClient initialMood={mood} initialSnapshot={snapshot} initialHistory={history} />;
}
