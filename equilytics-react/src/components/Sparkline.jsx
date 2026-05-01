import { useMemo } from "react";

export default function Sparkline({ points, positive = true, className = "" }) {
  const path = useMemo(() => {
    const max = Math.max(...points);
    const min = Math.min(...points);
    const range = max - min || 1;
    return points
      .map((point, index) => {
        const x = (index / (points.length - 1)) * 100;
        const y = 40 - ((point - min) / range) * 34;
        return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(" ");
  }, [points]);

  return (
    <svg
      viewBox="0 0 100 44"
      className={className}
      role="img"
      aria-label={positive ? "Upward trend" : "Downward trend"}
    >
      <path
        d={`${path} L 100 44 L 0 44 Z`}
        fill={positive ? "rgba(0, 200, 150, 0.14)" : "rgba(255, 90, 95, 0.14)"}
      />
      <path
        d={path}
        fill="none"
        stroke={positive ? "#00C896" : "#FF5A5F"}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3"
      />
    </svg>
  );
}
