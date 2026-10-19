"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Logo from "./Logo";
import SearchBox from "./SearchBox";

const LEFT_NAV = [
  { href: "/market-mood", label: "Market Mood" },
  { href: "/ipos", label: "IPOs" },
  { href: "/heatmap", label: "Heatmap" },
  { href: "/markets", label: "Markets" },
];
const RIGHT_NAV = [
  { href: "/brief", label: "Daily Brief" },
  { href: "/focus-lists", label: "Focus Lists" },
  { href: "/blog", label: "Blog" },
];
const ALL_NAV = [...LEFT_NAV, ...RIGHT_NAV];

function isActive(pathname: string, href: string) {
  return pathname.startsWith(href);
}

function NavLink({ href, label, active, onClick }: { href: string; label: string; active: boolean; onClick?: () => void }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      onClick={onClick}
      className={`rounded-[9px] px-3 py-[9px] text-sm transition-colors ${
        active ? "bg-surface-3 font-semibold text-ink" : "font-medium text-ink-2 hover:bg-surface-2"
      }`}
    >
      {label}
    </Link>
  );
}

export default function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const isHome = pathname === "/";

  if (isHome) {
    return (
      <header className="px-4 py-4 sm:px-8">
        <div className="mx-auto flex max-w-[1360px] items-center justify-between gap-2">
          <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
            {LEFT_NAV.map((item) => (
              <NavLink key={item.href} {...item} active={isActive(pathname, item.href)} />
            ))}
          </nav>
          <nav aria-label="More" className="hidden items-center gap-1 lg:flex">
            {RIGHT_NAV.map((item) => (
              <NavLink key={item.href} {...item} active={isActive(pathname, item.href)} />
            ))}
          </nav>
          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="ml-auto flex h-11 w-11 items-center justify-center rounded-[12px] border border-line-2 lg:hidden"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M2 4h14M2 9h14M2 14h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        {menuOpen && (
          <nav aria-label="Main (mobile)" className="mx-auto mt-2 flex max-w-[1360px] flex-col gap-0.5 lg:hidden">
            {ALL_NAV.map((item) => (
              <NavLink
                key={item.href}
                {...item}
                active={isActive(pathname, item.href)}
                onClick={() => setMenuOpen(false)}
              />
            ))}
          </nav>
        )}
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1360px] items-center gap-4 px-5 py-3 lg:px-10">
        <div className="shrink-0 text-[1.2rem]">
          <Logo />
        </div>

        <div className="hidden max-w-[460px] flex-1 lg:block">
          <SearchBox variant="compact" />
        </div>

        <div className="hidden flex-1" />

        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {ALL_NAV.map((item) => (
            <NavLink key={item.href} {...item} active={isActive(pathname, item.href)} />
          ))}
        </nav>

        <button
          type="button"
          aria-label="Search"
          onClick={() => setMenuOpen((v) => !v)}
          className="flex h-11 w-11 items-center justify-center rounded-[12px] border border-line-2 lg:hidden"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.6" />
            <path d="M16 16L12.5 12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
        <button
          type="button"
          aria-label="Open menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
          className="flex h-11 w-11 items-center justify-center rounded-[12px] border border-line-2 lg:hidden"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M2 4h14M2 9h14M2 14h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {menuOpen && (
        <div className="flex flex-col gap-3 border-t border-line px-5 py-3 lg:hidden">
          <SearchBox variant="compact" />
          <nav aria-label="Main (mobile)" className="flex flex-col">
            {ALL_NAV.map((item) => (
              <NavLink
                key={item.href}
                {...item}
                active={isActive(pathname, item.href)}
                onClick={() => setMenuOpen(false)}
              />
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
