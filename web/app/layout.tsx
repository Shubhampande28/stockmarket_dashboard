import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getSnapshot, type IndexQuote } from "@/lib/api";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Equilytics — Live Indian Market Heatmap & Mood",
    template: "%s | Equilytics",
  },
  description:
    "Free, no-login dashboard for Indian equities: Nifty 50 heatmap, sector moves, the Equilytics Mood Index, and the Daily Brief.",
};

async function safeIndexQuotes(): Promise<Record<string, IndexQuote>> {
  try {
    const snapshot = await getSnapshot();
    if ("error" in snapshot) return {};
    return snapshot.indexQuotes ?? {};
  } catch {
    return {};
  }
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const indexQuotes = await safeIndexQuotes();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Header indexQuotes={indexQuotes} />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
