import { describe, expect, it } from "vitest";
import { squarify, buildTwoLevelLayout, type WeightedItem, type TreemapRect } from "./treemap";

function totalArea(rects: TreemapRect[]): number {
  return rects.reduce((sum, r) => sum + r.widthPct * r.heightPct, 0);
}

function rectsOverlap(a: TreemapRect, b: TreemapRect): boolean {
  const EPS = 1e-6;
  return (
    a.xPct + a.widthPct > b.xPct + EPS &&
    b.xPct + b.widthPct > a.xPct + EPS &&
    a.yPct + a.heightPct > b.yPct + EPS &&
    b.yPct + b.heightPct > a.yPct + EPS
  );
}

function assertNoOverlaps(rects: TreemapRect[]) {
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      expect(rectsOverlap(rects[i], rects[j])).toBe(false);
    }
  }
}

function assertWithinContainer(rects: TreemapRect[], x: number, y: number, w: number, h: number) {
  const EPS = 1e-6;
  for (const r of rects) {
    expect(r.xPct).toBeGreaterThanOrEqual(x - EPS);
    expect(r.yPct).toBeGreaterThanOrEqual(y - EPS);
    expect(r.xPct + r.widthPct).toBeLessThanOrEqual(x + w + EPS);
    expect(r.yPct + r.heightPct).toBeLessThanOrEqual(y + h + EPS);
  }
}

describe("squarify", () => {
  it("fills the full container area", () => {
    const items: WeightedItem[] = [
      { id: "a", weight: 40 },
      { id: "b", weight: 25 },
      { id: "c", weight: 20 },
      { id: "d", weight: 10 },
      { id: "e", weight: 5 },
    ];
    const rects = squarify(items, 0, 0, 100, 100);
    expect(rects).toHaveLength(5);
    expect(totalArea(rects)).toBeCloseTo(100 * 100, 0);
  });

  it("gives larger items a proportionally larger area", () => {
    const items: WeightedItem[] = [
      { id: "big", weight: 80 },
      { id: "small", weight: 20 },
    ];
    const rects = squarify(items, 0, 0, 100, 50);
    const big = rects.find((r) => r.id === "big")!;
    const small = rects.find((r) => r.id === "small")!;
    const bigArea = big.widthPct * big.heightPct;
    const smallArea = small.widthPct * small.heightPct;
    expect(bigArea / smallArea).toBeCloseTo(4, 0); // 80/20
  });

  it("produces no overlapping rects", () => {
    const items: WeightedItem[] = Array.from({ length: 12 }, (_, i) => ({
      id: `s${i}`,
      weight: Math.random() * 100 + 1,
    }));
    const rects = squarify(items, 0, 0, 100, 60);
    assertNoOverlaps(rects);
    assertWithinContainer(rects, 0, 0, 100, 60);
  });

  it("ignores zero/negative weight items and returns empty for no valid items", () => {
    expect(squarify([{ id: "z", weight: 0 }], 0, 0, 100, 100)).toEqual([]);
    expect(squarify([], 0, 0, 100, 100)).toEqual([]);
  });

  it("offsets correctly when the container doesn't start at the origin", () => {
    const items: WeightedItem[] = [{ id: "a", weight: 1 }, { id: "b", weight: 1 }];
    const rects = squarify(items, 10, 20, 50, 30);
    assertWithinContainer(rects, 10, 20, 50, 30);
  });
});

describe("buildTwoLevelLayout", () => {
  it("sizes sector blocks by their stocks' total weight, within the 0-100 map", () => {
    const groups = [
      { sectorId: "Financials", stocks: [{ id: "HDFCBANK", weight: 40 }, { id: "ICICIBANK", weight: 20 }] },
      { sectorId: "IT", stocks: [{ id: "TCS", weight: 25 }, { id: "INFY", weight: 15 }] },
    ];
    const { sectorRects, stockRectsBySector } = buildTwoLevelLayout(groups);

    assertWithinContainer(sectorRects, 0, 0, 100, 100);
    assertNoOverlaps(sectorRects);

    const financials = sectorRects.find((r) => r.id === "Financials")!;
    const it = sectorRects.find((r) => r.id === "IT")!;
    const financialsArea = financials.widthPct * financials.heightPct;
    const itArea = it.widthPct * it.heightPct;
    expect(financialsArea / itArea).toBeCloseTo(60 / 40, 0); // (40+20) vs (25+15)

    // Each sector's own stocks lay out in a fresh LOCAL 0-100 space (not
    // nested in the sector's outer-map coordinates) -- rendered inside a
    // `position: relative` sector box in the component layer.
    for (const sectorRect of sectorRects) {
      const stockRects = stockRectsBySector[sectorRect.id];
      assertNoOverlaps(stockRects);
      assertWithinContainer(stockRects, 0, 0, 100, 100);
    }
  });
});
