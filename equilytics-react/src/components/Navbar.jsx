export default function Navbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-ink-950/78 backdrop-blur-2xl">
      <div className="mx-auto grid min-h-20 w-full max-w-[1760px] grid-cols-[1fr_auto] items-center gap-3 px-4 md:grid-cols-[260px_minmax(320px,1fr)_auto] md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-11 w-11 flex-none place-items-center rounded-2xl border border-accent-blue/40 bg-accent-blue/15 text-sm font-black text-white shadow-glow">
            EQ
          </div>
          <div className="min-w-0">
            <div className="truncate text-base font-black tracking-tight text-white">Equilytics</div>
            <div className="hidden truncate text-xs text-text-secondary sm:block">Financial intelligence, simplified</div>
          </div>
        </div>

        <label className="order-3 col-span-2 flex min-h-11 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.055] px-4 shadow-card transition focus-within:border-accent-blue/60 md:order-none md:col-span-1">
          <span className="text-xs font-black uppercase tracking-[0.16em] text-accent-blue">Search</span>
          <input
            className="w-full bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
            placeholder="Search stocks, screens, sectors..."
          />
        </label>

        <div className="flex items-center justify-end gap-3">
          <div className="hidden items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.055] px-3 py-2 text-sm text-text-secondary sm:flex">
            <span className="h-2.5 w-2.5 rounded-full bg-accent-green shadow-[0_0_18px_rgba(0,200,150,0.8)]" />
            Market open
          </div>
          <button className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/[0.065] text-sm font-black text-white transition duration-200 hover:scale-[1.02] hover:border-accent-blue/40 active:scale-[0.98]">
            SP
          </button>
        </div>
      </div>
    </header>
  );
}
