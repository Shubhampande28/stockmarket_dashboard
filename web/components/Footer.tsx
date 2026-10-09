import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mx-auto mt-10 max-w-[1360px] border-t border-line px-5 py-8 text-sm text-ink-4 lg:px-10">
      <p className="mb-3 max-w-[70ch]">
        Equilytics publishes market data and educational explanations. It is
        not registered with SEBI as an investment adviser or research
        analyst, and nothing on this site is a recommendation to buy or sell
        any security. Market investments carry risk.
      </p>
      <nav className="flex flex-wrap gap-x-4 gap-y-1">
        <Link href="/methodology" className="hover:text-ink">Methodology</Link>
        <Link href="/about" className="hover:text-ink">About</Link>
        <Link href="/contact" className="hover:text-ink">Contact</Link>
        <Link href="/privacy-policy" className="hover:text-ink">Privacy</Link>
        <Link href="/disclaimer" className="hover:text-ink">Disclaimer</Link>
      </nav>
    </footer>
  );
}
