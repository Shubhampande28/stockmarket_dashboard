# Equilytics search-first redesign: brief for Claude Code

## How to use this file

1. Save this file in your repo as `docs/search-first-redesign.md`.
2. Open Claude Code in the repo root and paste the **Kickoff prompt** below.
3. Work one phase at a time. After each phase, check the diff and the running site before pasting the next phase prompt.

The phase prompts are at the end. The spec in the middle is what Claude Code reads for the details, so you don't need to paste it.

---

## Kickoff prompt (paste this first)

```
Read docs/search-first-redesign.md completely. Then read AGENTS.md and the
guides in node_modules/next/dist/docs/ that cover the App Router, routing,
dynamic routes, metadata, redirects and client components. This Next.js
version has breaking changes, so do not rely on memory for Next.js APIs.

Do Phase 0 from the brief only. Investigate and report; change no files.
Work on a new branch called feat/search-first-home. Do not push or deploy.
```

---

## 1. What we are changing

The homepage today is a busy "Today" dashboard (index cards, heatmap card, Market Mood, movers). We are replacing it with a search-first home, like Google or Screener: the logo, one search bar, nothing else competing for attention.

1. **Home (`/`)** becomes just the logo, a search bar with live suggestions, and a few popular stocks.
2. **Stock details** are shown only after a user searches and picks a result. They live on their own page per stock.
3. **Market Mood** moves off the homepage to its own page, `/market-mood`, linked from the main nav.
4. **IPOs** is a new page, `/ipos`, with open, upcoming and listing-soon IPOs and full details for each, from live data.

The current logo stays exactly as it is: "Equi" in black and "lytics" in red. Use the existing logo component or file. Do not redraw it.

**Design reference:** an interactive design canvas, "Equilytics Search-First Redesign", exists (the owner has the link). It has four screens: Home, Stock details, Market Mood and Mobile home. Every value needed is in this brief, so the code does not depend on the canvas. The numbers in the canvas are sample values; the build must use real data.

**Non-goals**
- No new market-data provider and no login.
- No changes to Blog, Daily Brief, Focus Lists or the Heatmap page beyond the shared header.
- No fabricated data. If a field shown below isn't in the existing data layer, hide that element and list it in the phase summary. Don't fake it.
- No new runtime dependencies.

## 2. Design tokens

Reuse the tokens already in the global stylesheet from the heatmap redesign (`docs/heatmap-redesign.md`, section 4). If they are not there yet, add them. The ones this brief uses:

| Token | Value | Use |
|---|---|---|
| `--ink` | `#111114` | Primary text, "Equi", primary button |
| `--ink-2` | `#3A3B40` | Nav links, chips |
| `--ink-3` | `#55565C` | Secondary text |
| `--ink-4` | `#6B6C72` | Captions, symbols in results |
| `--line` | `#ECECEF` | Card borders, dividers |
| `--line-2` | `#E4E4E8` | Chip borders |
| `--surface-2` | `#F6F6F7` | Footer band, highlighted suggestion |
| `--surface-3` | `#F2F2F4` | Active nav pill, segmented-control track |
| `--brand` | `#D21F35` | "lytics" in the logo only |
| `--brand-ink` | `#B81A2E` | Eyebrow labels, Market Mood link |
| `--up-text` | `#167A3E` | Positive numbers |
| `--down-text` | `#C42B2B` | Negative numbers |
| `--live` | `#23864C` | Live dot |

Search box border: `#DCDCE1`. Geist for UI, Geist Mono for every number. Use the real minus sign `−` (U+2212) in displayed changes. Moves within ±0.2% use `--ink-3`, not green or red.

## 3. Routes

| Route | What it is |
|---|---|
| `/` | Search-first home (section 4) |
| `/stock/[symbol]` | Stock details (section 5). **If a per-symbol Financials route already exists, extend that route instead of adding a new one**, and keep its URL. Decide in Phase 0. |
| `/market-mood` | Market Mood page (section 6) |
| `/ipos` and `/ipos/[slug]` | IPO calendar and IPO details (section 7). `/ipos?ipo=slug` may select an IPO on the calendar instead of a separate page; decide in Phase 0. |
| `/search?q=` | Optional results page for Enter with no exact match (section 4) |

- If the old Today page has its own route (for example `/today`), redirect it permanently to `/`.
- Update the `WebSite` → `SearchAction` JSON-LD so its `urlTemplate` points at the route that actually handles a search query.
- Every page gets its own `<title>` and meta description through the metadata API.

## 4. Home (`/`)

Full-height page, white, with three bands: a slim top bar, the centred search, and a slim bottom strip plus footer.

**Top bar** (16px × 32px padding, no border): links on the left (Market Mood, Heatmap, Markets) and on the right (Daily Brief, Focus Lists, Blog). 14px/500, `--ink-2`, 40px min height, 9px radius. No logo here; the big logo is the centre of the page.

**Centre** (starts about 14vh from the top, max width 640px, centred):
- Logo at 76px, weight 800, letter-spacing −0.05em. Mobile: 52px.
- Line under it: "Search any NSE or BSE stock for price, financials and news." 16px, `--ink-3`.
- Search box: 60px tall (mobile 54px), pill-shaped, 1px `#DCDCE1` border, soft shadow `0 6px 24px rgba(17,17,20,0.08)`, search icon on the left, 17px input text. Placeholder: "Company name or symbol, e.g. Reliance". A clear (×) button appears once there is text. It must be a real `<input type="search">` with a visible-to-screen-readers `<label>` inside a `<form role="search">`.
- Under the box: "Popular" plus 5 chips (Geist Mono 12.5px/600, 36px tall, `--line-2` border, fully rounded). Each chip links to that stock's details page. Use the existing most-searched or largest-weight list if there is one; otherwise hard-code RELIANCE, HDFCBANK, TCS, INFY, TATAMOTORS.
- Autofocus the search input on desktop only. Never autofocus on touch devices, because it pops the keyboard.

**Suggestions dropdown** (opens as you type, from the first character):
- Up to 6 results, matched on symbol and company name. Prefix matches first, then contains matches. Reuse the existing search index or endpoint; do not add a provider.
- Each row (56px tall): company name (15px/600), "SYMBOL · NSE" (Geist Mono 12.5px, `--ink-4`), and on the right the last price and today's change (Geist Mono, coloured). If live price isn't available in the search data, show only the name and symbol.
- Keyboard: ↓/↑ move the highlight (highlighted row gets `--surface-2`), Enter opens the highlighted result, Esc closes the list. Use the combobox pattern: `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`, and `role="option"` rows.
- No match: "No stock matches "{query}". Try a symbol like RELIANCE or TCS."
- Enter with no highlighted row: if the query exactly matches a symbol, go to that stock; otherwise go to `/search?q=` (a simple list of the same matches), or open the dropdown if you skip that page.
- Debounce input by about 120ms. Don't refetch for the same query.

**Bottom strip** (1px `--line` top border, centred, wraps on small screens):
- Live dot + "Market open" (or "Market closed" with a grey dot; use the IST session helper from the heatmap brief, `lib/market/session.ts`).
- NIFTY 50, SENSEX, BANK NIFTY, MIDCAP 150: name in `--ink-4`, level and change in Geist Mono 600. Use the same data the header ticker uses today.
- A link "Market Mood: {label} →" in `--brand-ink`, 13px/600, to `/market-mood`. If the mood score isn't available, show "Market Mood →".

**Footer band** (`--surface-2`): "Quotes may be delayed. For information only, not investment advice." on the left; About, Data sources, Disclaimer, Privacy links on the right (use the existing pages).

**SEO:** the old homepage had crawlable text sections (overview, heatmap, movers, FAQ). Don't delete that content. Move it below the fold of the home page under a quiet "About Equilytics" section, or to `/about`, and keep the FAQPage JSON-LD only on the page that still shows the FAQ. Report which you chose.

## 5. Stock details (`/stock/[symbol]`, or the existing Financials route)

Reached only by picking a search result, a popular chip, or a direct link. Max width 1360px, 40px side padding.

**Header** (all pages except home): 1px `--line` bottom border. Logo at 24px (links to `/`), a compact search box (44px tall, pill, max 460px, same suggestions behaviour as home), and the nav on the right: Market Mood, Heatmap, Markets, Daily Brief, Blog. Active page gets `aria-current="page"`, `--surface-3` background and weight 600. Below 1024px: logo + search icon + menu button (44×44, `aria-label="Open menu"`).

**Page, top to bottom:**
1. "← Back to search" link (13.5px, `--ink-3`) to `/`.
2. **Summary row** (wraps): left side has an eyebrow with sector and index membership (e.g. "ENERGY · NIFTY 50", 12px/600, `--brand-ink`), the company name as H1 (40px/700, −0.035em), and "NSE: SYMBOL · BSE: code" (Geist Mono 13px, `--ink-4`). Right side, right-aligned: price (Geist Mono 40px/600), "−26.20 (−1.82%) today" coloured, and "As of HH:MM AM IST · NSE" (12.5px, `--ink-4`).
3. **Actions:** "Add to Focus List" (dark button, `--ink`, 44px, 12px radius) wired to the existing Focus Lists feature; "See on heatmap" (outlined) linking to the heatmap with `?stock=SYMBOL`. If Focus Lists has no add action, render the button disabled and say so in the summary.
4. **Tabs:** Overview, Financials, News. Real tab pattern (`role="tablist"`, `aria-selected`), active tab has a 2px `--ink` underline and weight 600. Keep the tab in the URL (`?tab=financials`) so it can be shared and the back button works.

**Overview tab** (two columns that wrap: chart `flex: 999 1 640px`, key numbers `flex: 1 1 300px`):
- **Price chart card:** "Price" plus the change over the selected range, coloured. Range segmented control: 1D, 1W, 1M, 1Y, 5Y (`aria-pressed`, `--surface-3` track, white selected pill). Line chart 280px tall in green or red by direction, a very light fill under the line, 3 faint gridlines, start and end labels under it. **Show only the ranges the data layer actually has history for.** No chart library: a small SVG component is fine. If the site already embeds a chart widget for stocks, reuse it instead and say so.
- **Key numbers card:** rows of label (`--ink-3`) and value (Geist Mono 600): Market cap, P/E, Book value, Dividend yield, ROCE, ROE, 52-week high, 52-week low, Face value. Hide any row whose value is missing.
- **About card:** the company description from the data layer. Hide the card if there is none.
- **Today vs the market card:** sector change today, Nifty 50 change today, and "Beat by X pts" / "Lagged by X pts".

**Financials tab:** move the existing financial statements here (P&L, Balance Sheet, Cash Flow, ratios). Default view: quarterly results for the last 5 quarters in ₹ crore, in a table that scrolls horizontally inside its card on small screens. Buttons to switch to Profit & Loss, Balance Sheet, Cash Flow. Source line: "Source: Screener.in and NSE filings" (or whatever the data layer really uses).

**News tab:** the existing news feed for the symbol. Each item: source · relative time (12.5px, `--ink-4`) and the headline (16px/600), linking out with `rel="noopener"`. Empty state: "No recent news for SYMBOL."

**States:** loading skeleton matching the layout (no blank boxes), "We couldn't find SYMBOL" with the search box for an unknown symbol (return a 404 status), and an error panel with "Try again" if the fetch fails. Reuse the state components from the heatmap brief if they exist.

Footer line: "Quotes may be delayed. For information only, not investment advice. Verify with NSE/BSE filings before acting."

## 6. Market Mood (`/market-mood`)

Same header as section 5, with Market Mood active. Max width 1360px.

1. **Title block:** eyebrow "MARKET MOOD", H1 "How the Indian market feels today", subline "One score from 0 to 100, built from breadth, momentum and volatility across NSE stocks. Low means fear, high means greed." **Rewrite the subline to match how the score is really computed** (find this in Phase 0). On the right, the live status chip ("Live · updated N min ago" / "Closed · showing last close"), announced with `aria-live="polite"` once per state change.
2. **Two cards, side by side, wrapping** (gauge `flex: 1 1 400px`, drivers `flex: 2 1 560px`):
   - **Gauge card:** a half-circle gauge in 5 bands with a black needle. Below it, the score (Geist Mono 56px) and the label (20px/700, coloured). "Extreme fear / Neutral / Extreme greed" under the arc. Then three small tiles: Yesterday, 1 week ago, 1 month ago, each with score and label (hide any you don't have history for). The SVG has `role="img"` and an `aria-label` like "Mood score 32 out of 100, Fear".
   - **Drivers card:** "What's driving it" and "Each part scores 0–100. The mood is their average." (change this line if the score isn't a plain average). One row per real input to the score: name, score, an 8px bar coloured by band, and a one-line plain-English note built from the live numbers (e.g. "612 stocks up, 1,488 down on NSE."). **Only list inputs the score actually uses.** The canvas shows Breadth, Momentum, Sector participation and Volatility as examples.
3. **Mood vs Nifty 50 chart** (full width): move the existing chart here from the old Today page. Legend (Mood score in `--brand-ink`, Nifty 50 in `--ink`), period control (30 sessions, 90 sessions, 1 year; show only what history supports), a light red band behind scores below 25, and the existing footnote, unchanged: "Extreme Fear readings (below 25) have often come close to short-term lows. That is a pattern from the past, not a forecast."

**Bands and colours** (inclusive as written):

| Score | Label | Colour |
|---|---|---|
| 0–24 | Extreme fear | `#8A1A1A` |
| 25–44 | Fear | `#C93A3A` (label text `#B02424`) |
| 45–55 | Neutral | `#D5D6DA` (label text `--ink-3`) |
| 56–75 | Greed | `#23864C` |
| 76–100 | Extreme greed | `#0E5A30` |

If the existing mood logic uses different band edges or labels, keep the existing ones and tell me.

Motion: the needle swings from 0 to the score over about 1.4s and the chart lines draw in once on load. Nothing animates under `prefers-reduced-motion`.

## 7. IPOs (`/ipos`)

A new page, in the main nav as "IPOs" right after Market Mood (home top bar, inner header and mobile menu). The canvas screen "IPOs — calendar and details" shows the layout with real figures from 19 Oct 2026; the build must fetch live data.

### 7.1 Data

There is no IPO data in the app today, so this is the one place we add a source. Rules:

- **Use official exchange data first.** NSE publishes current, upcoming and past issues, with bid-by-category subscription figures, on its website (the "All upcoming issues" and current-issue pages, and the JSON behind them). BSE has the same. In Phase 0, find out what the existing backend can fetch and how it already handles NSE requests (cookies, headers, rate limits). Do not guess endpoint URLs; check them.
- **Fetch on the server, never from the browser.** Add one module, `lib/ipo/source.ts`, that fetches and normalises the data, and one route handler, `/api/ipos`, that serves it. Cache it: every 5 minutes while any issue is open during market hours (9:00–17:00 IST), every hour otherwise. If the source fails, keep serving the last good copy with its timestamp.
- **If the existing setup can't reach exchange data reliably, stop and propose a source** (with cost and terms) for my approval. Do not scrape broker or IPO-news sites without approval.
- **Grey market premium (GMP)** is not published by any exchange. Leave it out unless I approve a source. If approved, always label it "GMP (unofficial)".
- Anything a source doesn't give (lot size before the price band is fixed, registrar, lead managers) shows as "Not announced", never a guess.

Normalise to this shape:

```ts
// lib/ipo/types.ts
export type IpoStatus = 'upcoming' | 'open' | 'closed' | 'listing-soon' | 'listed';
export type IpoSegment = 'mainboard' | 'sme';

export interface Ipo {
  slug: string;              // "jio-platforms"
  name: string;
  segment: IpoSegment;
  exchanges: string[];       // ["NSE", "BSE"] or ["NSE Emerge"]
  status: IpoStatus;         // derived from dates in IST, not from the source's label
  dates: { anchor?: string; open?: string; close?: string; allotment?: string; listing?: string }; // ISO dates
  priceBand: { low: number; high: number } | null;  // single price → low === high
  lotSize: number | null;
  minInvestment: number | null;  // lotSize × high, computed, not fetched
  issueSizeCr: number | null;
  freshIssueCr: number | null;
  ofsCr: number | null;
  quotas?: { qib?: number; nii?: number; retail?: number; employee?: number }; // % of issue
  subscription?: {
    asOf: string;            // ISO timestamp of the figures
    overall: number;         // times subscribed
    qib?: number; nii?: number; retail?: number; employee?: number;
  };
  registrar?: string;
  leadManagers?: string[];
  about?: string;            // one or two lines from the offer document
  offerDocUrl?: string;      // RHP/DRHP link
  listing?: { price?: number; gainPct?: number }; // after listing
}
```

Status comes from the dates in IST via `lib/market/session.ts`: before open → upcoming; open ≤ today ≤ close → open; after close and before listing → listing-soon; on or after listing → listed. Show listed IPOs for 14 days after listing, then drop them.

### 7.2 Layout (desktop, max width 1360px)

1. **Title block:** eyebrow "IPOS", H1 "IPO calendar", subline "Issues open now, opening soon and about to list on NSE and BSE. Select any IPO for dates, pricing, subscription and who is behind it." Status chip on the right: "Updated {day} {time} IST", from the data timestamp.
2. **Controls row:** status filter (All, Open now, Upcoming, Listing soon, each with its count in Geist Mono) and segment filter (All, Mainboard, SME). Both segmented controls with `aria-pressed`, kept in the URL (`?status=open&segment=sme`).
3. **Two columns** (wrap): list `flex: 1 1 520px`, details `flex: 1 1 440px`.
   - **List:** one card per IPO (18px radius, `--line` border; selected card gets a 1px `--ink` ring and `aria-pressed="true"`). Card: name (17px/700), "Mainboard · NSE, BSE", a status pill on the right ("Closes today" green, "Opens Wed, 21 Oct" neutral, "Lists Thu, 22 Oct" red-brand), then four figures in a row: Price band, Min. investment, Issue size, Subscribed (green when ≥ 1x). Sort: open (closing soonest first), then upcoming (opening soonest), then listing soon.
   - Below the list: "In the pipeline, dates not announced": chips of companies with SEBI approval or filed papers but no dates, if the source has them. Hide the block otherwise.
   - **Details panel** for the selected IPO: eyebrow (segment · exchanges · status), name (28px/700), the "about" line, then:
     - **Timeline:** Opens, Closes, Allotment, Listing as four steps with bars; done steps `--ink`, the current step `--brand-ink`, future steps `--line-2`.
     - **Issue details:** Price band, Lot size, Min. retail investment, Issue size, Fresh issue, Offer for sale (and GMP only if approved).
     - **Fresh vs OFS bar:** a 10px split bar with a legend ("Fresh issue: money to the company", "Offer for sale: to sellers"). Hide it when neither number is known.
     - **Subscription:** "as of" note, then bars for Overall, QIB, NII, Retail (and Employee if present). Bar width = min(times, 10) × 10%, a tick at 1x, green fill at ≥ 1x, grey below. Before opening: "Bidding opens {day}, {date}."
     - **Who is running the issue:** Registrar and Lead managers.
     - Buttons: "Check on NSE" (dark) and "Read the offer document" (outlined, links `offerDocUrl`; hidden if missing). Both open in a new tab with `rel="noopener"`.
   - Default selection: the first card in the sorted list. Selecting a card updates `?ipo=slug`.
4. **Footnote:** "Figures as reported on {date} by NSE and BSE; subscription changes through the day. For information only, not investment advice. Read the offer document before applying." Add the GMP sentence only if GMP is shown.

**States:** skeleton cards while loading; "No IPOs match this filter right now." for an empty filter; if the feed fails with cached data, keep showing it with a "Last updated HH:MM" warning chip; with no data at all, the error panel from the heatmap brief with "Try again".

**Mobile:** filters scroll horizontally as chips; the four card figures become a 2×2 grid; the details panel moves below the list, and selecting a card scrolls to it.

**SEO:** `/ipos` gets its own title and description ("Upcoming IPOs in India: dates, price band, lot size and subscription"). Add `/ipos` to the sitemap.

## 8. Mobile (390px)

- Home: top bar becomes a "Mood: {label}" link on the left (with a coloured dot) and a menu button on the right that opens a dropdown with all nav links (44px rows). Logo 52px, search 54px, 4 popular chips, a 2-index strip (NIFTY, SENSEX) at the bottom, then a one-line disclaimer.
- Stock page: summary stacks (price below the name, left-aligned), tabs scroll horizontally, cards stack full width, the table scrolls inside its card.
- Market Mood: cards stack; the gauge stays centred.
- No horizontal page scroll at 390px. Touch targets at least 44px.

## 9. Acceptance criteria

- [ ] `/` shows only the top bar, logo, search, popular chips, bottom strip and footer above the fold. No Market Mood card, heatmap or movers.
- [ ] Typing shows suggestions; mouse, touch and keyboard (↑ ↓ Enter Esc) all work; picking one opens that stock's page.
- [ ] Stock page tabs and chart range work with real data; unavailable fields and ranges are hidden, not faked.
- [ ] `/market-mood` shows the gauge, drivers and the Mood vs Nifty 50 chart with real data, and it's in the main nav.
- [ ] `/ipos` lists open, upcoming and listing-soon IPOs from the live source, filters work and stay in the URL, and the details panel shows dates, pricing, issue split and subscription with an "as of" time. Nothing is guessed; missing fields say "Not announced".
- [ ] IPO data is fetched and cached on the server; a source failure shows the last good data with its timestamp.
- [ ] Old Today route redirects to `/`; old per-stock links still work.
- [ ] The logo is the existing red-and-black logo, unchanged.
- [ ] Every data view has loading, closed-market and error states. Never an empty box.
- [ ] No horizontal page scroll at 390px. Reduced motion disables all animation.
- [ ] `npm run lint` and `npm run build` pass with no new warnings. No new runtime dependencies.

---

## Phase prompts

Paste these one at a time.

### Phase 0: investigate (no code changes)

```
Phase 0 from docs/search-first-redesign.md. Change no files.

1. Map the code: the current homepage (Today) and its route, the header/nav
   and logo component, the existing stock search (UI, index or endpoint),
   any per-symbol Financials page, the news feed, the Market Mood score and
   the Mood vs Nifty 50 chart, and the data layer behind each. List files.
2. Report what the data layer can give for section 5 (price, change, sector,
   index membership, BSE code, key numbers, description, price history and
   which ranges, quarterly results, news) and section 6 (how the mood score
   is computed, its inputs, band edges, history length).
3. Decide: extend the existing Financials route or add /stock/[symbol]?
   Where should the old homepage SEO text and FAQ go?
4. For the IPOs page (section 7): check how the backend already talks to
   NSE/BSE and whether it can fetch current, upcoming and past issues with
   subscription by category. Confirm the real endpoints by testing them.
   List which fields of the Ipo type you can fill. If exchange data isn't
   reachable, propose a source with cost and terms.
5. Give me a short plan for Phases 1–4 and any decisions you need from me.
   Then stop.
```

### Phase 1: home and search

```
Phase 1 from docs/search-first-redesign.md, using what you found in Phase 0.

- Tokens (section 2) if missing, and the shared header for inner pages
  (section 5, Header), with the existing logo.
- The new home page (section 4), including the suggestions combobox with
  full keyboard support, popular chips, bottom strip and footer.
- Routes and redirects (section 3), metadata and the SearchAction JSON-LD.
- Move the old homepage SEO content as agreed in Phase 0.

When done: npm run lint, npm run build, then check / at 1440px and 390px
(Playwright screenshots if available). Commit on feat/search-first-home.
Summarise what changed and anything you couldn't do.
```

### Phase 2: stock details page

```
Phase 2 from docs/search-first-redesign.md: the stock details page
(section 5) with summary, actions, Overview / Financials / News tabs, tab
and range state in the URL, the SVG price chart, and loading / not-found /
error states. Hide anything the data layer can't supply and list it.

Same checks as Phase 1, at 1440px and 390px, for at least RELIANCE, one
small-cap and an unknown symbol. Commit and summarise.
```

### Phase 3: Market Mood page and mobile pass

```
Phase 3 from docs/search-first-redesign.md: the /market-mood page
(section 6) with the gauge, drivers built from the real score inputs, and
the Mood vs Nifty 50 chart moved from the old Today page. Add it to the
nav. Then do the mobile pass in section 8 across all three pages.

Same checks, plus OS "reduce motion" on. Tab through each page with the
keyboard and confirm the focus order makes sense. Commit and summarise.
```

### Phase 4: IPOs page

```
Phase 4 from docs/search-first-redesign.md: the IPOs page (section 7),
using the data source agreed in Phase 0.

- lib/ipo/types.ts, lib/ipo/source.ts (fetch + normalise + status from IST
  dates) and the cached /api/ipos route handler. Unit-test the status and
  minInvestment logic with fixed dates, including a holiday and a weekend.
- The /ipos page: filters in the URL, list cards, details panel, all states,
  mobile layout, metadata and sitemap entry. Add "IPOs" to every nav.
- No GMP unless I approved a source. Nothing guessed.

Same checks as Phase 1, plus: load /ipos with the source switched off and
confirm the cached copy and warning chip appear. Then go through every item
in section 9. Commit and summarise.
```
