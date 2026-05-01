import Sparkline from "./Sparkline.jsx";
import { formatChange, formatPrice, isPositive } from "../utils/format.js";

export default function StockCard({ stock }) {
  const positive = isPositive(stock.change);

  return (
    <article className="rounded-[28px] border border-white/10 bg-white/[0.045] p-4 shadow-card backdrop-blur-2xl transition duration-200 active:scale-[0.98]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-black text-white">{stock.name}</h3>
          <p className="mt-1 text-xs font-bold text-text-muted">{stock.id} · {stock.sector}</p>
        </div>
        <span
          className={`rounded-full px-3 py-1.5 text-xs font-black ${
            positive ? "bg-accent-green/14 text-accent-green" : "bg-accent-red/14 text-accent-red"
          }`}
        >
          {formatChange(stock.change)}
        </span>
      </div>

      <div className="mt-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-text-muted">Price</p>
          <p className="mt-1 text-xl font-black text-white">{formatPrice(stock.price)}</p>
        </div>
        <Sparkline points={stock.sparkline} positive={positive} className="h-14 w-32" />
      </div>
    </article>
  );
}
