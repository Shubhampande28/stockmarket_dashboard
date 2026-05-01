const items = ["Home", "Screener", "Watchlist", "Portfolio"];

export default function BottomNav() {
  return (
    <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-4 gap-1 rounded-3xl border border-white/10 bg-ink-950/86 p-2 shadow-lift backdrop-blur-2xl lg:hidden">
      {items.map((item) => (
        <a
          key={item}
          href="#"
          className={`rounded-2xl px-2 py-3 text-center text-xs font-black transition duration-200 active:scale-[0.98] ${
            item === "Screener" ? "bg-accent-blue/18 text-white" : "text-text-secondary"
          }`}
        >
          {item}
        </a>
      ))}
    </nav>
  );
}
