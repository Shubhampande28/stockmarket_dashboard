const navItems = ["Dashboard", "Screener", "Watchlist", "Portfolio"];

export default function Sidebar() {
  return (
    <aside className="hidden rounded-[28px] border border-white/10 bg-white/[0.045] p-4 shadow-card backdrop-blur-2xl lg:block">
      <div className="mb-5 rounded-3xl border border-white/10 bg-ink-850/70 p-4">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-accent-blue">Workspace</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-white">Screener</h1>
        <p className="mt-2 text-sm leading-6 text-text-secondary">
          Build calm, focused screens with valuation, quality and momentum filters.
        </p>
      </div>

      <nav className="space-y-2">
        {navItems.map((item) => (
          <a
            key={item}
            href="#"
            className={`flex min-h-11 items-center rounded-2xl px-4 text-sm font-bold transition duration-200 hover:bg-white/[0.07] ${
              item === "Screener"
                ? "border border-accent-blue/40 bg-accent-blue/15 text-white shadow-glow"
                : "text-text-secondary"
            }`}
          >
            {item}
          </a>
        ))}
      </nav>
    </aside>
  );
}
