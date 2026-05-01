import Sparkline from "./Sparkline.jsx";
import { formatChange, formatPrice, isPositive } from "../utils/format.js";

export default function StockTable({ stocks }) {
  return (
    <div className="hidden overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] shadow-card backdrop-blur-2xl md:block">
      <table className="w-full border-collapse text-left">
        <thead className="sticky top-0 z-10 bg-ink-850/95 text-xs uppercase tracking-[0.12em] text-text-muted">
          <tr>
            <th className="px-5 py-4">Stock</th>
            <th className="px-5 py-4 text-right">Price</th>
            <th className="px-5 py-4 text-right">Change</th>
            <th className="px-5 py-4 text-right">Market cap</th>
            <th className="px-5 py-4">Trend</th>
          </tr>
        </thead>
        <tbody>
          {stocks.map((stock) => {
            const positive = isPositive(stock.change);
            return (
              <tr
                key={stock.id}
                className="group border-t border-white/10 transition duration-200 hover:-translate-y-0.5 hover:bg-white/[0.055] hover:shadow-card"
              >
                <td className="px-5 py-4">
                  <div className="font-black text-white">{stock.name}</div>
                  <div className="mt-1 text-xs font-bold text-text-muted">{stock.id} · {stock.sector}</div>
                </td>
                <td className="px-5 py-4 text-right font-black text-white">{formatPrice(stock.price)}</td>
                <td className="px-5 py-4 text-right">
                  <span
                    className={`rounded-full px-3 py-1.5 text-xs font-black ${
                      positive ? "bg-accent-green/14 text-accent-green" : "bg-accent-red/14 text-accent-red"
                    }`}
                  >
                    {formatChange(stock.change)}
                  </span>
                </td>
                <td className="px-5 py-4 text-right font-bold text-text-secondary">{stock.marketCap}</td>
                <td className="px-5 py-4">
                  <Sparkline points={stock.sparkline} positive={positive} className="h-12 w-36" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
