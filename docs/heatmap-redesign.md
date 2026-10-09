# Equilytics heatmap redesign: brief for Claude Code

## How to use this file

1. Save this file in your repo as `docs/heatmap-redesign.md`.
2. Open Claude Code in the repo root and paste the **Kickoff prompt** below.
3. Work one phase at a time. After each phase, check the diff and the running page before pasting the next phase prompt.

Every phase prompt is in the **Phase prompts** section at the end. The spec in the middle is what Claude Code reads for the details, so you don't need to paste it.

> **Note (added during planning):** this brief assumes a Next.js codebase.
> It's being used as the design/behavior spec for the heatmap and Today page
> inside the broader `web/` Next.js rewrite described in the project's plan
> (see `docs/REVAMP_NOTES.md` for the rest of the site's architecture: the
> actual data layer is Flask JSON APIs, not a new provider). Section 5's
> "data contract" should be read as "the shape `lib/api.ts` returns after
> adapting Flask's `/stocks` response" rather than a brand new source.

---

## Kickoff prompt (paste this first)

```
Read docs/heatmap-redesign.md completely. Then read AGENTS.md and the guides
in node_modules/next/dist/docs/ that cover the App Router, client components
and data fetching. This Next.js version has breaking changes, so do not rely
on memory for Next.js APIs.

Do Phase 0 from the brief only. Investigate and report; change no files.
Work on a new branch called feat/heatmap-redesign. Do not push or deploy.
```

---

## 1. Context

- **Product:** equilytics.in, a free, no-login dashboard for Indian equities (NSE/BSE): heatmap, gainers/losers, sector analysis, company financials.
- **Stack:** Next.js 16.3 (App Router), React 19.2, TypeScript, Tailwind CSS v4, Geist and Geist Mono via `next/font`. There are no charting or animation libraries today. Keep it that way unless this brief says otherwise.
- **Design reference:** an interactive mockup exists as a Claude design canvas (owner has the link). This brief contains every value needed, so the code does not depend on the mockup.

## 2. Problems to fix

1. **Header nav wraps into three rows.** Six links (Today, Daily Brief, Focus Lists, Heatmap, Markets, Blog) sit in a narrow column between the logo and the index ticker.
2. **The Nifty 50 heatmap card on the Today page renders as an empty white area.** Only the title and "Open full heatmap →" show.
3. **The "Mood vs Nifty 50" chart (last 90 sessions) renders as an empty white area.** Only the title, legend and footnote show.

Problems 2 and 3 have no loading, empty or error state, so users see a blank box and assume the site is broken. Find the **root cause** of each blank render (Phase 0) before redesigning.

## 3. Goals and non-goals

**Goals**
- A heatmap where tile **size = index weight**, tile **colour = % change**, and stocks are **grouped by sector**.
- Click (not hover) a tile to see details, so it works the same on desktop and touch.
- Never show a blank box: every data view has loading, market-closed and error states.
- Subtle, purposeful motion that respects `prefers-reduced-motion`.
- Works at 390px wide with no horizontal page scroll.

**Non-goals**
- No new market-data provider, no login, no changes to Blog or Financials pages.
- No fabricated data. If a field (index weight, 1W/1M history, intraday snapshots) is not available from the existing data layer, say so and hide the feature that needs it. Don't fake it.

## 4. Design tokens

Add these as CSS variables (Tailwind v4 `@theme` in the global stylesheet) and use them everywhere.

| Token | Value | Use |
|---|---|---|
| `--ink` | `#111114` | Primary text, primary button |
| `--ink-2` | `#3A3B40` | Sector labels |
| `--ink-3` | `#55565C` | Secondary text |
| `--ink-4` | `#6B6C72` | Captions, axis labels |
| `--line` | `#ECECEF` | Card borders, dividers |
| `--line-2` | `#E4E4E8` | Button borders |
| `--surface` | `#FFFFFF` | Page |
| `--surface-2` | `#F6F6F7` | Sector block background |
| `--surface-3` | `#F2F2F4` | Segmented control track, active nav pill |
| `--brand` | `#D21F35` | "lytics" in logo only |
| `--brand-ink` | `#B81A2E` | Small eyebrow labels (e.g. MARKET MAP) |
| `--up-text` | `#167A3E` | Positive numbers in text |
| `--down-text` | `#C42B2B` | Negative numbers in text |
| `--live` | `#23864C` | Live dot |

**Type:** Geist for UI, Geist Mono for every number (prices, %, times). Page title 40px/700/−0.035em; mobile 30px. Body 14–15px. Eyebrows 12px/600/0.12em letter-spacing, uppercase.

**Radius:** cards 18px, sector blocks 14px, tiles 8px, buttons 12px, pills 9–999px.

### Heatmap colour scale (9 steps, diverging)

`changePct` → background / text colour. Thresholds are inclusive as written.

| Range | Background | Text |
|---|---|---|
| ≤ −2.5 | `#8A1A1A` | `#FFFFFF` |
| ≤ −1.5 | `#B02424` | `#FFFFFF` |
| ≤ −0.75 | `#C93A3A` | `#FFFFFF` |
| < −0.2 | `#F4C4C1` | `#5A1212` |
| −0.2 … +0.2 | `#E4E5E8` | `#2A2B30` |
| < +0.75 | `#BFE6CD` | `#0F3D22` |
| < +1.5 | `#23864C` | `#FFFFFF` |
| < +2.5 | `#18703D` | `#FFFFFF` |
| ≥ +2.5 | `#0E5A30` | `#FFFFFF` |

The neutral band (±0.2%) is deliberate: flat stocks must not look bullish or bearish. Every tile also shows a signed number (+/−), so colour is never the only signal. Use the real minus sign `−` (U+2212) in display text.

Put this in a pure function `lib/heatmap/scale.ts` → `toneFor(changePct): { bg: string; fg: string }`.

## 5. Data contract

Write an adapter that turns whatever the existing data layer returns into this shape. Find the existing source in Phase 0. Do not add a new provider.

```ts
// lib/market/types.ts
export type IndexId = 'nifty50' | 'banknifty' | 'finnifty' | 'midcap150' | 'sensex';
export type MarketStatus = 'pre-open' | 'open' | 'closed';

export interface StockQuote {
  symbol: string;        // "HDFCBANK"
  name: string;          // "HDFC Bank"
  sector: string;        // normalised sector name, see below
  ltp: number;           // last traded price
  changePct: number;     // vs previous close, e.g. -2.1
  weight: number | null; // index weight in %, null if unavailable
}

export interface HeatmapData {
  index: IndexId;
  indexLevel: number;
  indexChangePct: number;
  asOf: string;          // ISO timestamp of the quotes
  marketStatus: MarketStatus;
  stocks: StockQuote[];
}
```

**Weight rule:** use the index weight if the data layer has it. Otherwise use free-float market cap if available. If neither exists, fall back to equal weights, show a small note under the map ("Tiles are equal size: index weights unavailable"), and report this in the phase summary.

**Sectors:** group into at most 8 blocks so labels stay readable. Suggested grouping: Financials, IT, Energy & Power, FMCG, Auto, Pharma & Healthcare, Metals & Materials, Industrials & others. Merge anything smaller into "Industrials & others". Keep the mapping in one table in `lib/market/sectors.ts`.

## 6. Layout

### Header (fixes problem 1)

- One row: logo · nav · index ticker (right-aligned) · search icon button.
- Nav items in this order: Today, Daily Brief, Focus Lists, Heatmap, Markets, Blog. Each is a link with 9px×12px padding, 14px/500, `--ink-3`. The **active** item gets `aria-current="page"`, `--surface-3` background, `--ink` text, weight 600.
- Ticker: Geist Mono 12.5px. Label `--ink-4`, value 600 weight, change coloured `--up-text`/`--down-text`.
- **Below 1024px:** nav collapses to a menu button (44×44, `aria-label="Open menu"`), and the ticker moves to a horizontally scrollable strip under the header.

### Heatmap page (desktop, max-width 1360px, 40px side padding)

Top to bottom:
1. **Title block:** eyebrow "MARKET MAP", H1 "Nifty 50, at a glance" (index name follows the selected index), subline "Tile size is the stock's weight in the index. Colour is today's move. Select any tile for details." On the right, a **status chip**: green dot + "Live · updated 2 min ago" (relative time from `asOf`, refreshed every 30s).
2. **Controls row:** segmented control for index (Nifty 50, Bank Nifty, Fin Nifty, Midcap 150, Sensex), segmented control for period (1D, 1W, 1M; **hide 1W/1M if no history exists**), and a **breadth bar** on the right: "{n} up", a bar (green share = advancers / (advancers + decliners), red remainder, 8px tall, fully rounded), "{n} down".
3. **Two columns** (flex-wrap; map `flex: 999 1 720px`, side panel `flex: 1 1 300px`):
   - **Map:** 640px tall on desktop. Sector blocks with `--surface-2` background, 8px padding, 14px radius. Each block's header shows the sector name (12px/600) and its **weight-averaged** change (Geist Mono, coloured). Tiles inside, 3px gaps, 8px radius. Under the map: the 9-step legend (−3% … +3%) and the line "Quotes may be delayed. For information only, not investment advice."
   - **Side panel:** the **Stock inspector** card, then the **Biggest movers** card.

**Stock inspector:** sector eyebrow, symbol (28px/700), full name, a large change figure (40px Geist Mono) with an up/down arrow icon, "today, vs previous close", then two rows: "Sector today" with the sector average, and "vs Nifty 50 (−1.64%)" with "Beat by X pts" / "Lagged by X pts". Two buttons: **Open financials** (links to the existing Financials page for that symbol) and **Add to Focus List** (wire to the existing Focus Lists feature if one exists; otherwise render it disabled and say so in the summary). Default selection: the highest-weight stock.

**Biggest movers:** two columns, Gainers and Losers, top 3 each. Each row is a button that selects that stock in the map.

**URL state:** keep `?index=` and `?stock=` in the URL so a view can be shared and the back button works.

### Tile layout: squarified treemap

Write a pure function in `lib/heatmap/treemap.ts`, about 80 lines, with no dependency: a two-level squarified treemap (Bruls, Huizing & van Wijk). Level 1 is sectors, sized by the sum of their weights. Level 2 is stocks within each sector, sized by weight. Output rectangles as **percentages** of the container so the layout scales with CSS. Render tiles as absolutely positioned `<button>`s.

**Label rules** (measure the container with a `ResizeObserver`, compute each tile's px size):
- width ≥ 140 and height ≥ 90: symbol (24px/700) + full name (12px) + change (15px mono)
- width ≥ 64 and height ≥ 44: symbol (13–16px) + change (12px mono)
- width ≥ 40 and height ≥ 24: symbol only (11px)
- smaller: no label (still clickable, still has `aria-label`)

### Mobile (390px)

- Header: logo + search + menu buttons; ticker strip below.
- Title 30px; subline "Bigger tile, bigger index weight. Tap a stock."
- Index switcher becomes **horizontally scrollable chips** (selected chip: `--ink` background, white text).
- Breadth bar full width.
- Sectors **stack vertically**, one block each, full width, height proportional to sector weight (minimum 120px), with their own small treemap inside.
- The inspector becomes a **bottom sheet** (white, 22px top radius, drag handle, shadow) showing symbol, name, change, "vs Nifty", and the two buttons. It shows the selected stock and does not cover the breadth bar on first load.
- Movers card goes below the map.

## 7. States (fixes problems 2 and 3)

Build these as components and use them for **both the heatmap and the Mood vs Nifty 50 chart**:

| State | When | What the user sees |
|---|---|---|
| **Loading** | First fetch in flight | A skeleton with the same layout as the real thing (grey blocks `#EDEDF0`/`#F2F2F4`, gentle opacity pulse) and "Fetching live quotes…". Nothing jumps when data arrives. |
| **Market closed** | `marketStatus !== 'open'` | The last session's data, never blank. Status chip turns grey: "Closed · showing last close", plus "Opens 9:15 AM IST" (or the next trading day). |
| **Error** | Fetch fails, or data is empty | Icon, "Couldn't reach the market feed", "We'll keep trying in the background. Prices may be out of date until we reconnect.", a **Try again** button and a **Check NSE** link (nseindia.com). If stale data exists, keep showing it with a "Last updated HH:MM" warning chip instead of the error panel. |

The Mood chart footnote stays: "Extreme Fear readings (below 25) have often come close to short-term lows. That is a pattern from the past, not a forecast."

## 8. Motion

Use CSS transitions and small hooks only, no animation library. Animate only `transform`, `opacity` and `background-color` (and `width` on the breadth bar). Wrap everything in a `usePrefersReducedMotion()` check; under reduced motion, every change below is instant.

| Effect | Trigger | Spec |
|---|---|---|
| **Colour ease** | New quotes arrive | Tile `background-color` and `color` transition 550ms `ease`. |
| **Tick flash** | A stock's changePct moved by ≥ 0.05 pts since the last poll | A white overlay on the tile goes from opacity 0.35 to 0 over 600ms. At most one flash per tile per poll. If more than 40% of tiles changed, skip flashes for that poll so the map doesn't strobe. |
| **Number roll** | Index levels, inspector %, breadth counts change | Tween from old to new value over 400ms with ease-out, via `requestAnimationFrame` in a `useAnimatedNumber` hook. Keep tabular figures (Geist Mono) so widths don't jiggle. |
| **Breadth bar** | Counts change | Width transition 550ms `cubic-bezier(.2,.8,.2,1)`. |
| **Sector zoom** | Click a sector header | FLIP animation: the sector block scales from its rect to the full map rect over 450ms `cubic-bezier(.2,.8,.2,1)`; other blocks fade out over 200ms. A "← All sectors" button and Esc return the same way. Re-run the treemap for that one sector at full size so labels get bigger. Add `?sector=` to the URL. |
| **Selection ring** | Tile selected | `box-shadow: inset 0 0 0 2px #0B0B0C, inset 0 0 0 3.5px #FFFFFF`, no animation. |
| **Skeleton pulse** | Loading | Opacity 1 → 0.6 → 1 over 1.6s, infinite. |

## 9. Data refresh

- During market hours (Mon–Fri, 9:15–15:30 IST), poll every 60s (or whatever the existing data layer supports, whichever is slower). Pause when `document.visibilityState === 'hidden'`, and refetch at once on return.
- No polling when the market is closed.
- Keep the previous data on screen while refetching; never flash back to the skeleton.
- All IST time logic goes in one helper (`lib/market/session.ts`) using `Intl.DateTimeFormat` with `timeZone: 'Asia/Kolkata'`. Exchange holidays: use a list if the repo already has one; otherwise add a TODO and mention it in the summary.

## 10. Accessibility

- Tiles, pills, movers rows and nav items are real `<button>`/`<a>` elements, focusable with Tab, with a visible focus ring (2px `--ink` outline, 2px offset).
- Tile `aria-label`: "HDFC Bank, down 2.10 percent". The map region has `aria-label="Nifty 50 heatmap"`.
- Segmented controls use `aria-pressed`.
- Touch targets are at least 44px on mobile (tiles excepted; they're reachable through the movers list and the sector zoom).
- Text contrast is at least 4.5:1. The scale above already passes; don't lighten it.
- Status chip changes are announced with `aria-live="polite"` (once per state change, not every 30s).

## 11. Acceptance criteria

- [ ] Header is one row at ≥ 1024px. Below that it shows the menu button and ticker strip. Nothing wraps into a column.
- [ ] Today page heatmap card and Mood chart render data, a skeleton, or an explicit state. **Never an empty box.**
- [ ] Root cause of each original blank render is fixed and explained in the PR description.
- [ ] Heatmap tile areas are proportional to weight (or equal, with the note shown).
- [ ] Clicking a tile updates the inspector and the URL. The back button restores the previous selection.
- [ ] Index switcher changes the data. 1W/1M either work with real data or are hidden.
- [ ] Sector zoom in and out animates, and Esc works.
- [ ] With "reduce motion" turned on in the OS, nothing animates.
- [ ] No horizontal page scroll at 390px. The bottom sheet works on mobile.
- [ ] `npm run lint` and `npm run build` pass with no new warnings.
- [ ] No new runtime dependencies (a dev-only test runner is fine).
