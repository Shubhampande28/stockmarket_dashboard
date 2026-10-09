/**
 * Two-level squarified treemap (Bruls, Huizing & van Wijk). Pure function,
 * no dependency. Level 1 = sectors (sized by sum of their stocks' weights),
 * level 2 = stocks within each sector (sized by weight). Rects are output
 * as percentages of the container (0-100), so CSS scales the layout.
 */

export interface WeightedItem {
  id: string;
  weight: number; // > 0
}

export interface TreemapRect {
  id: string;
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
}

function worst(areas: number[], sideLength: number): number {
  const sum = areas.reduce((a, b) => a + b, 0);
  const max = Math.max(...areas);
  const min = Math.min(...areas);
  const s2 = sum * sum;
  const l2 = sideLength * sideLength;
  return Math.max((l2 * max) / s2, s2 / (l2 * min));
}

function layoutRow(
  row: WeightedItem[],
  areas: number[],
  x: number,
  y: number,
  width: number,
  height: number,
  vertical: boolean
): TreemapRect[] {
  const rowArea = areas.reduce((a, b) => a + b, 0);
  const rects: TreemapRect[] = [];
  if (vertical) {
    const rowWidth = rowArea / height;
    let curY = y;
    for (let i = 0; i < row.length; i++) {
      const h = areas[i] / rowWidth;
      rects.push({ id: row[i].id, xPct: x, yPct: curY, widthPct: rowWidth, heightPct: h });
      curY += h;
    }
  } else {
    const rowHeight = rowArea / width;
    let curX = x;
    for (let i = 0; i < row.length; i++) {
      const w = areas[i] / rowHeight;
      rects.push({ id: row[i].id, xPct: curX, yPct: y, widthPct: w, heightPct: rowHeight });
      curX += w;
    }
  }
  return rects;
}

/** Squarifies `items` into the rect (x, y, width, height), in the same units. */
export function squarify(
  items: WeightedItem[],
  x: number,
  y: number,
  width: number,
  height: number
): TreemapRect[] {
  const sorted = [...items].filter((i) => i.weight > 0).sort((a, b) => b.weight - a.weight);
  const totalWeight = sorted.reduce((a, b) => a + b.weight, 0);
  if (totalWeight <= 0 || sorted.length === 0 || width <= 0 || height <= 0) return [];

  const scale = (width * height) / totalWeight;
  const areaOf = (w: number) => w * scale;

  const result: TreemapRect[] = [];
  let remaining = sorted;
  let rx = x, ry = y, rw = width, rh = height;

  while (remaining.length > 0) {
    if (rw <= 0 || rh <= 0) break;
    const vertical = rw >= rh;
    const sideLength = vertical ? rh : rw;

    const row: WeightedItem[] = [remaining[0]];
    let rowAreas: number[] = [areaOf(remaining[0].weight)];
    let bestWorst = worst(rowAreas, sideLength);
    let i = 1;

    while (i < remaining.length) {
      const nextAreas = [...rowAreas, areaOf(remaining[i].weight)];
      const nextWorst = worst(nextAreas, sideLength);
      if (nextWorst <= bestWorst) {
        row.push(remaining[i]);
        rowAreas = nextAreas;
        bestWorst = nextWorst;
        i++;
      } else {
        break;
      }
    }

    result.push(...layoutRow(row, rowAreas, rx, ry, rw, rh, vertical));

    const rowArea = rowAreas.reduce((a, b) => a + b, 0);
    if (vertical) {
      const usedWidth = rowArea / rh;
      rx += usedWidth;
      rw -= usedWidth;
    } else {
      const usedHeight = rowArea / rw;
      ry += usedHeight;
      rh -= usedHeight;
    }
    remaining = remaining.slice(row.length);
  }

  return result;
}

export interface SectorGroup {
  sectorId: string;
  stocks: WeightedItem[];
}

export interface TwoLevelLayout {
  /** Sector blocks, sized by the sum of their stocks' weights, as % of the
   * whole map container -- rendered as CSS grid/flex blocks, not absolute
   * positioning (so each becomes its own `position: relative` box). */
  sectorRects: TreemapRect[];
  /** Each sector's stock tiles in LOCAL 0-100 coordinates *relative to that
   * sector's own box* (not the outer map) -- render these absolutely
   * positioned inside the matching sector block, where CSS percentages are
   * naturally relative to that nearest positioned ancestor. */
  stockRectsBySector: Record<string, TreemapRect[]>;
}

/** Lays out sectors by weight, then lays out each sector's own stocks
 * independently in a fresh 0-100 local space (brief: "a two-level
 * treemap... sized by weight" at each level, each level self-contained). */
export function buildTwoLevelLayout(groups: SectorGroup[]): TwoLevelLayout {
  const sectorItems: WeightedItem[] = groups.map((g) => ({
    id: g.sectorId,
    weight: g.stocks.reduce((a, b) => a + b.weight, 0),
  }));
  const sectorRects = squarify(sectorItems, 0, 0, 100, 100);

  const stockRectsBySector: Record<string, TreemapRect[]> = {};
  for (const group of groups) {
    stockRectsBySector[group.sectorId] = squarify(group.stocks, 0, 0, 100, 100);
  }

  return { sectorRects, stockRectsBySector };
}
