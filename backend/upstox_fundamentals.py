"""Upstox Company Fundamentals API client (search-first redesign brief,
section 10). Confirmed by live testing against RELIANCE/HDFCBANK/IDEA
before building this:

- Every endpoint is GET https://api.upstox.com/v2/fundamentals/{key}/{name},
  keyed by ISIN -- EXCEPT `competitors`, whose own docs page says "by ISIN"
  but which actually rejects a bare ISIN (UDAPI100011 "Invalid Instrument
  key") and requires the full `EXCHANGE|ISIN` instrument key.
- Key Ratios is sector-aware server-side: industrials get P/E, P/B, ROA,
  ROE, ROCE, Quick Ratio, EV/EBITDA; banks get P/E, P/B, NIM, ROA, ROE,
  Net NPA, CASA instead (ROCE/EV/EBITDA dropped). Render whatever comes
  back rather than hardcoding a field list.
- `full_statement` (fs=true) line items are always annual, never quarterly,
  for all three statement endpoints.
- No borrowings/debt or finance-costs/EBIT line item exists anywhere, so
  debt-to-equity and interest coverage are not computable from this API.
- Cash flow only gives operating/investing/financing totals -- no capex
  breakout -- so free cash flow is not computable either.
- Share-holdings returns exactly 4 quarters of history, not enough for a
  same-quarter-last-year promoter-holding comparison.

Every call falls back to the last cached copy (any age) on a fetch
failure or missing token, so the UI never shows a blank box -- callers
get a `stale` flag back and decide how to show that.
"""
import json
import time
from pathlib import Path

import requests

from token_manager import get_access_token

BASE_URL = "https://api.upstox.com/v2/fundamentals"
BASE_DIR = Path(__file__).resolve().parent
CACHE_PATH = BASE_DIR / "fundamentals_cache.json"
INSTRUMENTS_PATH = BASE_DIR / "instruments.json"
CACHE_TTL_SECONDS = 24 * 60 * 60
TIMEOUT_SECONDS = 15

_instrument_map = None


def _load_instrument_map():
    global _instrument_map
    if _instrument_map is None:
        with open(INSTRUMENTS_PATH, "r", encoding="utf-8") as f:
            _instrument_map = json.load(f)
    return _instrument_map


def symbol_to_instrument_key(symbol):
    """'RELIANCE' -> 'NSE_EQ|INE002A01018', or None if not in the instrument
    master."""
    return _load_instrument_map().get(str(symbol or "").upper().strip())


def symbol_to_isin(symbol):
    key = symbol_to_instrument_key(symbol)
    if not key or "|" not in key:
        return None
    return key.split("|", 1)[1]


_isin_to_symbol = None


def isin_to_symbol(isin):
    """Reverse of symbol_to_isin, for turning a competitor's instrument_key
    back into a clickable NSE symbol on our own stock pages."""
    global _isin_to_symbol
    if _isin_to_symbol is None:
        _isin_to_symbol = {}
        for sym, key in _load_instrument_map().items():
            if key and "|" in key:
                _isin_to_symbol[key.split("|", 1)[1]] = sym
    return _isin_to_symbol.get(isin)


def _load_cache():
    if not CACHE_PATH.exists():
        return {}
    try:
        return json.loads(CACHE_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}


def _save_cache(cache):
    CACHE_PATH.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8")


def _cache_key(endpoint, key, params):
    param_str = "&".join(f"{k}={v}" for k, v in sorted((params or {}).items()))
    return f"{endpoint}:{key}:{param_str}"


def _fetch(endpoint, key, params=None):
    """Returns (data, meta). meta = {cachedAt, stale}. Never raises --
    fetch failures fall back to the cache, then to (None, stale=True)."""
    cache = _load_cache()
    cache_key = _cache_key(endpoint, key, params)
    cached_entry = cache.get(cache_key)

    access_token = get_access_token()
    if access_token:
        try:
            res = requests.get(
                f"{BASE_URL}/{key}/{endpoint}",
                headers={"Accept": "application/json", "Authorization": f"Bearer {access_token}"},
                params=params,
                timeout=TIMEOUT_SECONDS,
            )
            res.raise_for_status()
            body = res.json()
            if body.get("status") == "success":
                now = time.time()
                cache[cache_key] = {"cachedAt": now, "payload": body.get("data")}
                _save_cache(cache)
                return body.get("data"), {"cachedAt": now, "stale": False}
        except (requests.RequestException, ValueError):
            pass

    if cached_entry:
        return cached_entry.get("payload"), {"cachedAt": cached_entry.get("cachedAt"), "stale": True}
    return None, {"cachedAt": None, "stale": True}


def is_fresh(meta):
    return not meta.get("stale") and meta.get("cachedAt") is not None and (
        time.time() - meta["cachedAt"] < CACHE_TTL_SECONDS
    )


def get_profile(isin):
    return _fetch("profile", isin)


def get_key_ratios(isin):
    return _fetch("key-ratios", isin)


def get_balance_sheet(isin, statement_type="consolidated", fs=False):
    params = {"type": statement_type}
    if fs:
        params["fs"] = "true"
    return _fetch("balance-sheet", isin, params)


def get_cash_flow(isin, statement_type="consolidated", fs=False):
    params = {"type": statement_type}
    if fs:
        params["fs"] = "true"
    return _fetch("cash-flow", isin, params)


def get_income_statement(isin, statement_type="consolidated", time_period="yearly", fs=False):
    params = {"type": statement_type, "time_period": time_period}
    if fs:
        params["fs"] = "true"
    return _fetch("income-statement", isin, params)


def get_share_holdings(isin):
    return _fetch("share-holdings", isin)


def get_corporate_actions(isin):
    return _fetch("corporate-actions", isin)


def get_competitors(symbol):
    """Needs the full instrument_key, not a bare ISIN -- see module
    docstring. `symbol` here is the NSE symbol, e.g. 'RELIANCE'."""
    key = symbol_to_instrument_key(symbol)
    if not key:
        return None, {"cachedAt": None, "stale": True}
    return _fetch("competitors", key)
