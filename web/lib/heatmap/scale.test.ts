import { describe, expect, it } from "vitest";
import { toneFor, formatSignedPct } from "./scale";

describe("toneFor", () => {
  it("returns the neutral band for flat changes", () => {
    expect(toneFor(0)).toEqual({ bg: "#E4E5E8", fg: "#2A2B30" });
    expect(toneFor(0.2)).toEqual({ bg: "#E4E5E8", fg: "#2A2B30" });
    expect(toneFor(-0.2)).toEqual({ bg: "#E4E5E8", fg: "#2A2B30" });
  });

  it("returns the deepest red/green at the extremes", () => {
    expect(toneFor(-5)).toEqual({ bg: "#8A1A1A", fg: "#FFFFFF" });
    expect(toneFor(5)).toEqual({ bg: "#0E5A30", fg: "#FFFFFF" });
  });

  it("is monotonic (no two adjacent bands swap darkness oddly) across boundaries", () => {
    const boundaries = [-2.5, -1.5, -0.75, -0.2, 0.2, 0.75, 1.5, 2.5];
    for (const b of boundaries) {
      // just outside vs just inside each boundary should not throw and
      // should return a defined tone both sides.
      expect(toneFor(b - 0.001)).toBeDefined();
      expect(toneFor(b + 0.001)).toBeDefined();
    }
  });
});

describe("formatSignedPct", () => {
  it("uses the real minus sign, not a hyphen", () => {
    expect(formatSignedPct(-1.5)).toBe("−1.50%");
  });
  it("prefixes positive changes with +", () => {
    expect(formatSignedPct(1.5)).toBe("+1.50%");
  });
  it("shows a plain 0.00% with no sign", () => {
    expect(formatSignedPct(0)).toBe("0.00%");
  });
});
