import { redirect } from "next/navigation";

// The old SPA's heuristic "Insights" feed is superseded by the Mood Index
// (home page) and the Daily Brief -- redirect rather than rebuild it.
export default function InsightsPage() {
  redirect("/brief");
}
