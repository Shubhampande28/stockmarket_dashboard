export function formatPrice(value) {
  return `INR ${value.toLocaleString("en-IN", {
    maximumFractionDigits: 2
  })}`;
}

export function formatChange(value) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function isPositive(value) {
  return Number(value) >= 0;
}
