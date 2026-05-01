import { useState } from "react";
import { filterGroups } from "../data/stocks.js";

function FilterControl({ control }) {
  if (control.type === "range") {
    return (
      <label className="block">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="font-bold text-text-secondary">{control.label}</span>
          <span className="font-black text-white">{control.value}</span>
        </div>
        <input
          type="range"
          min={control.min}
          max={control.max}
          defaultValue={control.value}
          className="h-1.5 w-full accent-accent-blue"
        />
      </label>
    );
  }

  if (control.type === "toggle") {
    return (
      <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] p-3">
        <span className="text-sm font-bold text-text-secondary">{control.label}</span>
        <button className="relative h-6 w-11 rounded-full bg-accent-green/30">
          <span className="absolute right-1 top-1 h-4 w-4 rounded-full bg-accent-green shadow-[0_0_16px_rgba(0,200,150,0.55)]" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 text-xs font-bold text-text-secondary">{control.label}</div>
      <div className="flex flex-wrap gap-2">
        {control.options.map((option, index) => (
          <button
            key={option}
            className={`rounded-full border px-3 py-1.5 text-xs font-black transition duration-200 active:scale-[0.98] ${
              index === 0
                ? "border-accent-blue/50 bg-accent-blue/15 text-white"
                : "border-white/10 bg-white/[0.04] text-text-secondary hover:text-white"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function FilterPanel({ onClose, sheet = false }) {
  const [open, setOpen] = useState("valuation");

  return (
    <aside
      className={`${
        sheet
          ? "fixed inset-0 z-50 overflow-y-auto bg-ink-950 p-4"
          : "hidden min-h-0 rounded-[28px] border border-white/10 bg-white/[0.045] p-4 shadow-card backdrop-blur-2xl xl:block"
      }`}
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-accent-blue">Filters</p>
          <h2 className="mt-2 text-xl font-black text-white">Find better setups</h2>
          <p className="mt-2 text-sm leading-6 text-text-secondary">
            Start broad, then narrow by valuation, quality and momentum.
          </p>
        </div>
        {sheet && (
          <button
            onClick={onClose}
            className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-black text-white"
          >
            Close
          </button>
        )}
      </div>

      <div className="space-y-3">
        {filterGroups.map((group) => {
          const active = open === group.id;
          return (
            <section key={group.id} className="overflow-hidden rounded-3xl border border-white/10 bg-ink-850/70">
              <button
                onClick={() => setOpen(active ? "" : group.id)}
                className="flex w-full items-center justify-between gap-3 p-4 text-left transition duration-200 hover:bg-white/[0.04] active:scale-[0.99]"
              >
                <span>
                  <span className="block text-sm font-black text-white">{group.label}</span>
                  <span className="mt-1 block text-xs text-text-muted">{group.description}</span>
                </span>
                <span className="text-lg font-black text-accent-blue">{active ? "-" : "+"}</span>
              </button>

              <div
                className={`grid transition-all duration-200 ease-in-out ${
                  active ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="min-h-0 overflow-hidden">
                  <div className="space-y-5 border-t border-white/10 p-4">
                    {group.controls.map((control) => (
                      <FilterControl key={control.label} control={control} />
                    ))}
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </aside>
  );
}
