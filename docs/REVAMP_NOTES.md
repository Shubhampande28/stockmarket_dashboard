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
- **`fetch_upstox_quotes`/`fetch_index_quotes` duplication in `app.py`** (one dead
  commented-out version, plus `fetch_index_quotes` defined twice at lines 383 and
  2618): left in place for now, not yet deleted — `app.py` still uses its own copies
  until Phase 2 rewires `/stocks` through `backend/upstox_client.py`. Removing them
  before that would break the live route.
