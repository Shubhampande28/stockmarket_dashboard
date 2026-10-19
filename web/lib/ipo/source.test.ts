import { describe, expect, it } from "vitest";
import {
  computeMinInvestment,
  deriveStatus,
  parseFreshVsOfs,
  parseNseDate,
  parsePriceBand,
  slugify,
} from "./source";

describe("deriveStatus", () => {
  // Fixed dates chosen to include a weekend (2026-10-17 is a Saturday) and
  // a known NSE holiday (2026-10-21, Diwali-Laxmi Pujan) -- status is a
  // pure date-interval comparison, so these don't need special handling,
  // but the fixtures exercise real calendar edge cases rather than
  // conveniently-round numbers.
  const dates = { open: "2026-10-15", close: "2026-10-19" };

  it("is upcoming before the open date", () => {
    expect(deriveStatus(dates, new Date("2026-10-10T10:00:00+05:30"))).toBe("upcoming");
  });

  it("is open on the open date itself", () => {
    expect(deriveStatus(dates, new Date("2026-10-15T10:00:00+05:30"))).toBe("open");
  });

  it("is open through a weekend inside the window", () => {
    // 2026-10-17 is a Saturday, still within [open, close].
    expect(deriveStatus(dates, new Date("2026-10-17T10:00:00+05:30"))).toBe("open");
  });

  it("is open on the close date itself", () => {
    expect(deriveStatus(dates, new Date("2026-10-19T23:00:00+05:30"))).toBe("open");
  });

  it("is listing-soon after close, before a known listing date", () => {
    // 2026-10-21 (Diwali-Laxmi Pujan) falls in this gap for a typical IPO.
    expect(deriveStatus({ ...dates, listing: "2026-10-23" }, new Date("2026-10-21T10:00:00+05:30"))).toBe(
      "listing-soon"
    );
  });

  it("is listing-soon after close when no listing date is known yet", () => {
    expect(deriveStatus(dates, new Date("2026-10-20T10:00:00+05:30"))).toBe("listing-soon");
  });

  it("is listed on and after the listing date", () => {
    const withListing = { ...dates, listing: "2026-10-23" };
    expect(deriveStatus(withListing, new Date("2026-10-23T10:00:00+05:30"))).toBe("listed");
    expect(deriveStatus(withListing, new Date("2026-10-30T10:00:00+05:30"))).toBe("listed");
  });

  it("is upcoming when no dates are known at all", () => {
    expect(deriveStatus({}, new Date("2026-10-19T10:00:00+05:30"))).toBe("upcoming");
  });
});

describe("computeMinInvestment", () => {
  it("multiplies lot size by the top of the price band", () => {
    expect(computeMinInvestment(21, 700)).toBe(14700);
  });

  it("is null when either input is missing", () => {
    expect(computeMinInvestment(null, 700)).toBeNull();
    expect(computeMinInvestment(21, null)).toBeNull();
  });
});

describe("parsePriceBand", () => {
  it("parses a range", () => {
    expect(parsePriceBand("Rs.665 to Rs.700")).toEqual({ low: 665, high: 700 });
  });

  it("parses a single fixed price as low === high", () => {
    expect(parsePriceBand("Rs.289")).toEqual({ low: 289, high: 289 });
  });

  it("is null for an empty or unparseable value", () => {
    expect(parsePriceBand(undefined)).toBeNull();
    expect(parsePriceBand("-")).toBeNull();
  });
});

describe("parseNseDate", () => {
  it("converts DD-Mon-YYYY to ISO", () => {
    expect(parseNseDate("15-Oct-2026")).toBe("2026-10-15");
  });

  it("is undefined for an unparseable or missing value", () => {
    expect(parseNseDate("-")).toBeUndefined();
    expect(parseNseDate(undefined)).toBeUndefined();
  });
});

describe("parseFreshVsOfs", () => {
  it("parses both figures when the prose states them clearly", () => {
    const text = "Fresh Issue of shares aggregating up to Rs.500 Cr and Offer for Sale aggregating up to Rs.300 Cr";
    expect(parseFreshVsOfs(text)).toEqual({ freshIssueCr: 500, ofsCr: 300 });
  });

  it("is null for the figure that isn't stated, never a guess", () => {
    const text = "Initial Public Offer comprising of Offer for Sale of up to 12,174,046 Equity Shares";
    expect(parseFreshVsOfs(text)).toEqual({ freshIssueCr: null, ofsCr: null });
  });

  it("is null for both when there's no issue-size text at all", () => {
    expect(parseFreshVsOfs(undefined)).toEqual({ freshIssueCr: null, ofsCr: null });
  });
});

describe("slugify", () => {
  it("drops Limited/Ltd and turns spaces into hyphens", () => {
    expect(slugify("Tonbo Imaging India Limited")).toBe("tonbo-imaging-india");
    expect(slugify("Reliance Jio Platforms Ltd.")).toBe("reliance-jio-platforms");
  });
});
