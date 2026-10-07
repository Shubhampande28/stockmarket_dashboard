"""All Upstox HTTP calls: quotes, historical candles, holidays, market status.

Moved out of app.py (which had fetch_upstox_quotes and a duplicated
fetch_index_quotes defined twice) so routes and scheduled jobs share one
throttled, retrying client.
"""
import base64
import json
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests

BASE_URL = "https://api.upstox.com"
QUOTES_URL = f"{BASE_URL}/v2/market-quote/quotes"
HOLIDAYS_URL = f"{BASE_URL}/v2/market/holidays"
MARKET_STATUS_URL = f"{BASE_URL}/v2/market/status/NSE"
# Verify this path/shape against Upstox's current docs before relying on it
# for backfill (Phase 9) -- v2 historical-candle endpoints have changed shape
# across Upstox API versions in the past.
HISTORICAL_CANDLE_URL = f"{BASE_URL}/v2/historical-candle/{{instrument_key}}/day/{{to_date}}/{{from_date}}"

CANDLE_REQUESTS_PER_SECOND = 5


def _chunked(items, size):
    for i in range(0, len(items), size):
        yield items[i:i + size]


def auth_headers(access_token):
    return {"Authorization": f"Bearer {access_token}", "Accept": "application/json"}


def fetch_quotes(access_token, instrument_keys):
    """Batch-fetch quotes: 100 instrument keys per call, 4 concurrent requests."""
    if not instrument_keys:
        return {}

    headers = auth_headers(access_token)
    unique_keys = list(dict.fromkeys(k for k in instrument_keys if k))

    def fetch_batch(batch):
        try:
            res = requests.get(
                QUOTES_URL,
                headers=headers,
                params={"instrument_key": ",".join(batch)},
                timeout=20,
            )
            res.raise_for_status()
            return res.json().get("data", {}) or {}
        except requests.RequestException as exc:
            print("UPSTOX QUOTE BATCH FAILED =", str(exc), "FIRST KEYS =", batch[:5])
            return {}

    batches = list(_chunked(unique_keys, 100))
    if len(batches) <= 1:
        return fetch_batch(batches[0]) if batches else {}

    all_data = {}
    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = [executor.submit(fetch_batch, batch) for batch in batches]
        for future in as_completed(futures):
            all_data.update(future.result())
    return all_data


def fetch_index_quotes(access_token, index_quote_config):
    """One quotes call per configured index (nifty50, banknifty, VIX, ...)."""
    keys = [config["instrumentKey"] for config in index_quote_config.values()]
    return fetch_quotes(access_token, keys)


def fetch_historical_candles(access_token, instrument_key, from_date, to_date):
    """Daily candles for one instrument between from_date and to_date (YYYY-MM-DD)."""
    url = HISTORICAL_CANDLE_URL.format(
        instrument_key=instrument_key, to_date=to_date, from_date=from_date
    )
    headers = auth_headers(access_token)
    delay = 1.0
    for attempt in range(5):
        res = requests.get(url, headers=headers, timeout=20)
        if res.status_code == 429 or res.status_code >= 500:
            time.sleep(delay)
            delay *= 2
            continue
        res.raise_for_status()
        return res.json().get("data", {}).get("candles", []) or []
    res.raise_for_status()
    return []


def backfill_candles(access_token, instrument_keys, from_date, to_date, on_progress=None):
    """Sequential, throttled candle fetch for many instruments (~5 req/s)."""
    results = {}
    interval = 1.0 / CANDLE_REQUESTS_PER_SECOND
    for i, key in enumerate(instrument_keys):
        started = time.monotonic()
        try:
            results[key] = fetch_historical_candles(access_token, key, from_date, to_date)
        except requests.RequestException as exc:
            print("CANDLE BACKFILL FAILED =", key, str(exc))
            results[key] = []
        if on_progress:
            on_progress(i + 1, len(instrument_keys), key)
        elapsed = time.monotonic() - started
        if elapsed < interval:
            time.sleep(interval - elapsed)
    return results


def fetch_market_holidays(access_token):
    try:
        res = requests.get(HOLIDAYS_URL, headers=auth_headers(access_token), timeout=15)
        res.raise_for_status()
        return res.json().get("data", []) or []
    except requests.RequestException as exc:
        print("UPSTOX HOLIDAYS FETCH FAILED =", str(exc))
        return None  # caller falls back to weekday-only


def fetch_market_status(access_token):
    try:
        res = requests.get(MARKET_STATUS_URL, headers=auth_headers(access_token), timeout=15)
        res.raise_for_status()
        return res.json().get("data", {}) or {}
    except requests.RequestException as exc:
        print("UPSTOX MARKET STATUS FETCH FAILED =", str(exc))
        return None


def token_looks_valid(access_token):
    """Decode a JWT's exp claim if present; otherwise assume valid.

    Unlike the old token_manager.is_expired (which treated any decode
    failure as "expired"), a non-JWT Analytics Token is treated as valid
    here -- real expiry is then caught by a 401 from the API, per the
    revamp brief.
    """
    if not access_token:
        return False
    parts = access_token.split(".")
    if len(parts) != 3:
        return True
    try:
        payload_b64 = parts[1] + "=" * (-len(parts[1]) % 4)
        payload = json.loads(base64.urlsafe_b64decode(payload_b64))
        exp = payload.get("exp")
        if exp is None:
            return True
        return time.time() < exp
    except Exception:
        return True


def token_expiry(access_token):
    """Return the JWT exp claim as a unix timestamp, or None if unknown."""
    if not access_token:
        return None
    parts = access_token.split(".")
    if len(parts) != 3:
        return None
    try:
        payload_b64 = parts[1] + "=" * (-len(parts[1]) % 4)
        payload = json.loads(base64.urlsafe_b64decode(payload_b64))
        return payload.get("exp")
    except Exception:
        return None
