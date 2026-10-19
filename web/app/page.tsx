import type { Metadata } from "next";
import HomeClient from "@/components/HomeClient";
import { getMood, getSnapshot } from "@/lib/api";

export const metadata: Metadata = {
  title: "Equilytics — Search Indian Stocks, Mood Index & IPOs",
  description:
    "Search any NSE or BSE stock for price, financials and news. Free, no login required.",
  alternates: { canonical: "/" },
};

function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Equilytics",
    url: "https://equilytics.in/",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://equilytics.in/search?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };
}

export default async function Home() {
  const [moodResult, snapshotResult] = await Promise.allSettled([getMood(), getSnapshot()]);

  const mood =
    moodResult.status === "fulfilled" && !("error" in moodResult.value) ? moodResult.value : null;
  const snapshot =
    snapshotResult.status === "fulfilled" && !("error" in snapshotResult.value)
      ? snapshotResult.value
      : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd()) }}
      />
      <HomeClient mood={mood} snapshot={snapshot} />
    </>
  );
}
