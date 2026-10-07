# Revamp notes

Decisions made during the build that `Documents/EQUILYTICS_REVAMP.md` left open, or
where the brief's description of the code didn't match reality. Updated as each
phase lands.

## Phase 1 — Foundation

- **Sector index instrument keys** (`backend/config.py`'s `SECTOR_INDEX_KEYS`): filled
  in by following the same `NSE_INDEX|Nifty <Sector>` pattern already used for
  `nifty50`/`banknifty`/`finnifty` in `app.py`'s `INDEX_QUOTE_CONFIG`, not by guessing
  blind. **Not yet confirmed against a live Upstox instrument-master fetch** — do that
  as part of `python -m jobs selftest` in Phase 9, once the real token is in `.env`,
  and fix any key here that Upstox's quotes API doesn't recognize.
- **GOLDBEES instrument key** (`backend/config.py`'s `GOLDBEES_KEY`): deliberately left
  `None` rather than guessed. The brief explicitly says "look it up... don't guess it."
  Needs a real instrument-master lookup in Phase 9; `jobs.py selftest` should fail
  loudly while this is unset so it can't be silently skipped.
- **`token_manager.is_expired()` vs. the brief's intended token-validity behavior**:
  the existing function treats any JWT-decode failure as *expired*. The brief wants a
  non-JWT Analytics Token treated as *valid* (rely on a 401 from the API instead).
  Rather than edit the old function in place, the new behavior lives in
  `upstox_client.token_looks_valid()` and will replace call sites in Phase 2 when
  `/stocks` and the scheduler move over to `upstox_client.py`. `token_manager.py`
  itself is left alone for now since `/admin`'s existing OAuth flow still reads it.
- **Deleted as unused** (confirmed via grep, zero references): `backend/instruments_fixed.json`,
  `backend/remaining_nse_stocks.json`, `backend/utils/instruments.py` (orphaned, pointed at
  a nonexistent path; its own `backend/utils/` directory removed with it).
- **`backend/requirements.txt`**: new deps (`APScheduler`, `Pillow`, `python-dotenv`,
  `pytest`) appended unpinned, matching the file's existing style (nothing else in it
  is version-pinned either).
- **`fetch_upstox_quotes`/`fetch_index_quotes` duplication in `app.py`**: the dead
  commented-out version and the first (shadowed) `fetch_index_quotes` definition
  are now deleted; `app.py` keeps its own `fetch_upstox_quotes`/`fetch_index_quotes`
  (used only by `build_snapshot_payload`, which only ever runs from the scheduled
  `snapshot`/`eod` jobs, never per-request) rather than fully switching to
  `backend/upstox_client.py`'s copies -- the app.py versions already have the
  exact behavior needed and `build_snapshot_payload`'s surrounding code (`SECTOR_GROUPS`,
  `STOCK_NAMES`, etc.) is deeply app.py-local, so routing it through a second
  client module would have meant moving ~1,600 lines of stock-name/sector data out
  of app.py for no behavioral gain. `upstox_client.py` is still the client used by
  `jobs.py` for candle backfill, holidays and market-status (things app.py never did).

## Phase 2 — Snapshot + scheduler

- **Commit ordering**: `backend/jobs.py` and `backend/scheduler.py` were written during
  Phase 2 but not committed until their Phase 5/6 dependencies (`lists.py`, `brief.py`,
  `og_image.py`) existed too, since `jobs.py` imports all of them at module level --
  committing it earlier would leave a commit in history that doesn't actually import.
  `scheduler.py` lazy-imports `jobs` only inside `start_scheduler()`, so it was fine
  on its own.
- **fcntl**: the brief's lock (`fcntl.flock` on `backend/data/scheduler.lock`) is
  Linux-only; added a Windows dev-box fallback (an in-process `threading.Lock`) so
  local testing on this machine doesn't crash on `import fcntl`. Production (Hostinger,
  per `DEPLOY_HOSTINGER.md`) is Linux, where the real file lock is used as specified.
- **Scheduler startup gating**: rather than always starting APScheduler on import
  (which would fire during `pytest` and any `python -m jobs ...` invocation too),
  it's gated behind `EQUILYTICS_RUN_SCHEDULER=1`, set in `Procfile` for the real
  gunicorn process. The owner still does nothing extra -- the brief's "no cron setup
  needed" goal holds for the actual deployment.

## Phase 3 — Mood Index engine

- **`backend/copy/mood_text.py` -> `backend/mood_text.py`**: a package literally
  named `copy` would shadow Python's stdlib `copy` module for every other import in
  the process (backend/ is on `sys.path` via gunicorn's `--chdir backend`), which
  would silently break `requests`, `json` and anything else that does `import copy`
  internally. Kept the same content/purpose, just without the subpackage.
- **Signals 4 (breadth) and 5 (52-week highs/lows)** are computed directly from
  their own already-0-100-bounded formula on every call, never percentile-ranked --
  matching the brief's explicit "no percentile; already 0-100" note for breadth, and
  treating signal 5's "50 + 50 × value" the same way since it's equally self-bounded.
  Signals 1/2/3/6 percentile-rank once 60+ sessions exist, per the brief.
- **52-week highs/lows signal** needs every symbol's ~250-session history, which
  `/api/mood` (backed only by the lightweight snapshot cache) doesn't have cheaply
  on every request. `mood.compute_mood()` always reports it `available: false` from
  the API path; the `eod` job (which does load every symbol's `daily_bars`) calls
  `mood.inject_highs_lows_signal()` separately and re-saves the corrected mood.

## Phase 4 — Homepage redesign

- **Nifty 50 heatmap embed**: the brief asks to "reuse the existing heatmap
  rendering from script.js, embedded as a section." `script.js`'s heatmap is ~1,000+
  lines deeply coupled to the SPA's own DOM/state (`#heatmapPanel`, `loadHeatmap`,
  `renderGrid`, etc.) -- lifting it into a server-rendered Jinja page cleanly wasn't
  realistic in this pass. Shipped instead: a "today's biggest movers" tile grid built
  straight from the cached snapshot's gainers/losers, with a prominent "Open full
  heatmap -> /heatmap" link. Revisit if the owner wants the real grid embedded.
- **Sector heatmap tiles** (12 sectors, brief sec 6 item 9): rather than fetching 12
  new NSE sector *index* quotes (`config.SECTOR_INDEX_KEYS`, which would need extra
  Upstox calls per snapshot cycle), each tile shows the average `change` of the
  stocks already grouped under the closest matching key in `app.py`'s existing
  `SECTOR_GROUPS` (`SECTOR_TILE_LABELS` in `app.py` maps the brief's 12 display
  names onto the nearest existing group, e.g. "PSU Bank" -> `psu`, "Fin Service" ->
  `finance`). Cheaper, reuses data already fetched, but is a sector-*stock-average*
  rather than a true sector-*index* tile -- note this if it's ever user-facing-sensitive.
- **Templates render path**: `app.py`'s Flask app uses Flask's default
  `templates/` folder (`backend/templates/`), not a custom path -- no config change
  needed, just adding `render_template` to the Flask import.
