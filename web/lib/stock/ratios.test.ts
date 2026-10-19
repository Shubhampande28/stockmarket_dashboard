import { describe, expect, it } from "vitest";
import {
  cagr,
  cashConversion,
  currentRatio,
  growthOverYears,
  netMargin,
  operatingMargin,
  payoutRatio,
  promoterHoldingChangeQoQ,
  trailingDividendYield,
} from "./ratios";

describe("operatingMargin / netMargin", () => {
  it("computes a normal margin", () => {
    expect(operatingMargin(1000, 150)).toBe(15);
    expect(netMargin(1000, 80)).toBe(8);
  });

  it("is null when an input is missing", () => {
    expect(operatingMargin(null, 150)).toBeNull();
    expect(netMargin(1000, null)).toBeNull();
  });

  it("handles a loss-making company (negative net profit) as a negative margin, not null", () => {
    expect(netMargin(1000, -50)).toBe(-5);
  });

  it("is null on zero revenue rather than dividing by zero", () => {
    expect(operatingMargin(0, 10)).toBeNull();
  });
});

describe("cagr / growthOverYears", () => {
  it("computes CAGR for simple doubling over 3 years", () => {
    // (2/1)^(1/3) - 1 ≈ 25.99%
    expect(cagr(2, 1, 3)).toBeCloseTo(25.99, 1);
  });

  it("is null across a sign change (loss to profit or vice versa)", () => {
    expect(cagr(100, -50, 1)).toBeNull();
    expect(cagr(-100, 50, 1)).toBeNull();
  });

  it("is null when not enough years of history exist", () => {
    const yearly = [{ period: "Mar 2024", value: 100 }, { period: "Mar 2025", value: 110 }];
    expect(growthOverYears(yearly, 3)).toBeNull();
    expect(growthOverYears(yearly, 5)).toBeNull();
  });

  it("computes 1-year growth when exactly enough history exists", () => {
    const yearly = [{ period: "Mar 2024", value: 100 }, { period: "Mar 2025", value: 120 }];
    expect(growthOverYears(yearly, 1)).toBeCloseTo(20, 5);
  });
});

describe("currentRatio / cashConversion (bank exclusion case)", () => {
  it("computes a normal current ratio", () => {
    expect(currentRatio(500, 250)).toBe(2);
  });

  it("is null for a bank with no current-asset/liability line items", () => {
    // Banks' balance sheets from Upstox have no current_assets/current_liabilities
    // fields at all (confirmed live for HDFCBANK) -- callers pass null/null.
    expect(currentRatio(null, null)).toBeNull();
  });

  it("cash conversion is null when net profit is zero", () => {
    expect(cashConversion(500, 0)).toBeNull();
  });
});

describe("trailingDividendYield / payoutRatio", () => {
  const now = new Date("2026-10-19T00:00:00Z");

  it("sums only dividends within the trailing 365 days", () => {
    const dividends = [
      { amountPerShare: 13, exDate: "2026-06-19" }, // within window
      { amountPerShare: 7, exDate: "2024-01-01" }, // outside window
    ];
    const yieldPct = trailingDividendYield(dividends, 1000, now);
    expect(yieldPct).toBeCloseTo(1.3, 5);
  });

  it("is null when there were no dividends in the window", () => {
    expect(trailingDividendYield([{ amountPerShare: 5, exDate: "2020-01-01" }], 1000, now)).toBeNull();
  });

  it("payout ratio is null for a loss-making company (can't divide by a loss)", () => {
    expect(payoutRatio(10, -50)).toBeNull();
  });
});

describe("promoterHoldingChangeQoQ", () => {
  it("is the difference between the latest and previous quarter, not year-over-year", () => {
    const history = [
      { period: "Jun 2026", value: 25.64 },
      { period: "Mar 2026", value: 25.64 },
      { period: "Dec 2025", value: 25.57 },
      { period: "Sep 2025", value: 25.57 },
    ];
    expect(promoterHoldingChangeQoQ(history)).toBeCloseTo(0, 5);
  });

  it("is null with fewer than 2 quarters", () => {
    expect(promoterHoldingChangeQoQ([{ period: "Jun 2026", value: 25.64 }])).toBeNull();
  });
});
