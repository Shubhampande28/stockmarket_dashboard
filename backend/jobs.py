"""CLI + scheduler entry points: python -m jobs backfill|snapshot|eod|brief|selftest|premarket|fii

Each `run_*` function is what scheduler.py calls on a timer, and each `cmd_*`
is the CLI wrapper jobs are invoked with directly (e.g. for the Phase 9 live
check: `python -m jobs selftest`, `python -m jobs backfill`, ...).

Imports from app.py are deferred (inside function bodies) rather than at
module level, because app.py imports scheduler.py (which imports this
module) at the bottom of its own definitions -- a top-level `from app import
...` here would be circular.
"""
import argparse
import logging
import sys
from datetime import datetime, timedelta, timezone

import config
from config import SAMPLE_MODE, FIXTURES_DIR
import store
import upstox_client
import nse_client
import snapshot
import mood
import lists
import brief as brief_module
import og_image
from token_manager import get_access_token

logging.basicConfig(level=logging.INFO)
config.setup_logging()
logger = logging.getLogger("equilytics.jobs")

IST = timezone(timedelta(hours=5, minutes=30))
BACKFILL_DAYS = 400
RESUME_THRESHOLD_BARS = 240


def _today():
    return datetime.now(IST).strftime("%Y-%m-%d")


def _sample_payload():
    import json
    return json.loads((FIXTURES_DIR / "sample_daily_bars.json").read_text())


def run_snapshot():
    store.init_db()
    if SAMPLE_MODE:
        from app import build_sample_snapshot_payload
        payload = build_sample_snapshot_payload()
    else:
        token = get_access_token()
        if not token:
            logger.warning("snapshot job: no access token, keeping last cached snapshot")
            return
        from app import build_snapshot_payload
        payload = build_snapshot_payload(token)
    snapshot.save_snapshot(payload)
    store.set_meta("last_snapshot_at", datetime.now(IST).isoformat())
    _recompute_live_mood()


def _recompute_live_mood():
    try:
        result = mood.compute_mood(kind="live")
        store.save_mood_live(result["score"], result["zone"], result["components"], result["computed_at"])
    except mood.InsufficientDataError as exc:
        logger.info("live mood skipped: %s", exc)


def run_eod():
    store.init_db()
    date = _today()
    if SAMPLE_MODE:
        from app import build_sample_snapshot_payload
        payload = build_sample_snapshot_payload()
    else:
        token = get_access_token()
        if not token:
            logger.warning("eod job: no access token, skipping")
            return
        from app import build_snapshot_payload
        payload = build_snapshot_payload(token)
        _append_daily_bars_from_payload(payload, date)
    snapshot.save_snapshot(payload)

    try:
        result = mood.compute_mood(kind="close", date=date, snapshot_payload=payload)
        all_bars = {
            stock["symbol"].replace(".NS", ""): store.get_daily_bars(stock["symbol"].replace(".NS", ""), limit_sessions=config.PERCENTILE_WINDOW_SESSIONS)
            for stock in payload.get("all", [])
        }
        result["components"] = mood.inject_highs_lows_signal(result["components"], all_bars)
        score, _ = mood._score_from_components(result["components"])
        if score is not None:
            result["score"] = score
            result["zone"] = config.zone_for_score(score)
        store.save_mood(date, "close", result["score"], result["zone"], result["components"], result["headline"], result["computed_at"])
    except mood.InsufficientDataError as exc:
        logger.info("close mood skipped: %s", exc)

    lists.compute_focus_lists(date, payload)
    store.set_meta("last_eod_at", datetime.now(IST).isoformat())


def _append_daily_bars_from_payload(payload, date):
    bars = []
    for stock in payload.get("all", []):
        bars.append({
            "symbol": stock["symbol"].replace(".NS", ""),
            "date": date,
            "open": stock.get("open") or stock["price"],
            "high": stock.get("high") or stock["price"],
            "low": stock.get("low") or stock["price"],
            "close": stock["price"],
            "volume": stock.get("volume") or 0,
        })
    by_symbol = {}
    for b in bars:
        by_symbol.setdefault(b["symbol"], []).append(b)
    for symbol, symbol_bars in by_symbol.items():
        store.upsert_daily_bars(symbol, symbol_bars)


def run_fii():
    store.init_db()
    date = _today()
    if SAMPLE_MODE:
        sample = _sample_payload()["fii_dii"][-1]
        store.upsert_fii_dii(sample["date"], sample["fii_net"], sample["dii_net"], datetime.now(IST).isoformat(), stale=False)
    else:
        result = nse_client.fetch_fii_dii()
        if result is None:
            latest = store.latest_fii_dii()
            if latest:
                store.upsert_fii_dii(date, latest["fii_net"], latest["dii_net"], datetime.now(IST).isoformat(), stale=True)
            logger.warning("fii job: NSE fetch failed, kept previous value as stale")
        else:
            store.upsert_fii_dii(result["date"] or date, result["fii_net"], result["dii_net"], datetime.now(IST).isoformat(), stale=False)

    try:
        result = mood.compute_mood(kind="close", date=date)
        store.save_mood(date, "close", result["score"], result["zone"], result["components"], result["headline"], result["computed_at"])
    except mood.InsufficientDataError as exc:
        logger.info("fii-refresh mood skipped: %s", exc)

    run_brief()
    og_image.generate_today()


def run_brief(force=False):
    store.init_db()
    date = _today()
    if not force and store.get_brief(date):
        return
    brief_module.generate_and_publish(date)
    og_image.generate_today()


def run_premarket():
    store.init_db()
    if not SAMPLE_MODE:
        token = get_access_token()
        if token:
            holidays = upstox_client.fetch_market_holidays(token)
            if holidays is not None:
                store.set_meta("market_holidays", holidays)
            status = upstox_client.fetch_market_status(token)
            if status is not None:
                store.set_meta("market_status", status)
    store.set_meta("last_premarket_at", datetime.now(IST).isoformat())


def cmd_backfill():
    """400 calendar days of daily candles for every equity + index, resumable.

    ~1,700 instruments at 5 req/s is ~6 minutes per the brief. Symbols that
    already have > RESUME_THRESHOLD_BARS stored are skipped so a re-run after
    an interruption only fetches what's missing.
    """
    store.init_db()
    token = get_access_token()
    if not token:
        print("FAIL: no UPSTOX_ACCESS_TOKEN set; backfill needs a live token.")
        return 1
    if config.GOLDBEES_KEY is None:
        print("FAIL: config.GOLDBEES_KEY is unset -- look it up before backfilling.")
        return 1

    from app import load_instrument_map
    instrument_map = load_instrument_map()

    index_keys = {
        "NSE_INDEX|Nifty 50": "NSE_INDEX|Nifty 50",
        config.INDIA_VIX_KEY: config.INDIA_VIX_KEY,
        config.GOLDBEES_KEY: config.GOLDBEES_KEY,
        **{v: v for v in config.SECTOR_INDEX_KEYS.values()},
    }

    to_date = datetime.now(IST).strftime("%Y-%m-%d")
    from_date = (datetime.now(IST) - timedelta(days=BACKFILL_DAYS)).strftime("%Y-%m-%d")

    pending_symbols = {
        symbol: key
        for symbol, key in instrument_map.items()
        if store.count_daily_bars(symbol) <= RESUME_THRESHOLD_BARS
    }
    print(f"Backfilling {len(pending_symbols)} of {len(instrument_map)} symbols "
          f"(rest already have > {RESUME_THRESHOLD_BARS} bars)...")

    def on_progress(done, total, key):
        if done % 50 == 0 or done == total:
            print(f"  {done}/{total} ({key})")

    symbol_keys = list(pending_symbols.items())
    results = upstox_client.backfill_candles(
        token, [k for _, k in symbol_keys], from_date, to_date, on_progress=on_progress
    )
    for symbol, key in symbol_keys:
        candles = results.get(key, [])
        bars = _candles_to_bars(candles)
        if bars:
            store.upsert_daily_bars(symbol, bars)

    print(f"Backfilling {len(index_keys)} index series...")
    index_results = upstox_client.backfill_candles(token, list(index_keys), from_date, to_date)
    for key in index_keys:
        candles = index_results.get(key, [])
        store.upsert_index_bars(key, [{"date": b["date"], "close": b["close"]} for b in _candles_to_bars(candles)])

    print("Backfill complete. Computing backfill-kind mood for every session with enough history...")
    mood.backfill_history()
    return 0


def _candles_to_bars(candles):
    """Upstox candle rows: [timestamp, open, high, low, close, volume, oi]."""
    bars = []
    for row in candles:
        if not row or len(row) < 6:
            continue
        date = str(row[0])[:10]
        bars.append({
            "date": date, "open": row[1], "high": row[2], "low": row[3],
            "close": row[4], "volume": row[5],
        })
    return bars


def cmd_selftest():
    store.init_db()
    print("== Equilytics selftest ==")
    if SAMPLE_MODE:
        print("EQUILYTICS_SAMPLE_DATA=1 -- running against fixtures, not live APIs.")
        payload = _sample_payload()
        assert payload["symbols"], "sample fixture has no symbols"
        print("OK: sample fixture loads (%d symbols, %d index series)" % (
            len(payload["symbols"]), len(payload["indices"])
        ))
        print("OK: config.GOLDBEES_KEY is", "unset (expected until Phase 9)" if __import__("config").GOLDBEES_KEY is None else __import__("config").GOLDBEES_KEY)
        return 0

    token = get_access_token()
    if not token:
        print("FAIL: no UPSTOX_ACCESS_TOKEN / OAuth token available")
        return 1
    if not upstox_client.token_looks_valid(token):
        print("FAIL: token looks expired")
        return 1
    print("OK: token present and not obviously expired")

    import config as cfg
    if cfg.GOLDBEES_KEY is None:
        print("FAIL: config.GOLDBEES_KEY is still unset -- look it up in the Upstox "
              "instrument master and fill it in before backfill/selftest can pass live.")
        return 1

    try:
        quotes = upstox_client.fetch_quotes(token, [cfg.INDIA_VIX_KEY, cfg.GOLDBEES_KEY])
        print("OK: fetched", len(quotes), "quote(s) for VIX/GOLDBEES")
    except Exception as exc:
        print("FAIL: quote fetch failed:", exc)
        return 1

    to_date = datetime.now(IST).strftime("%Y-%m-%d")
    from_date = (datetime.now(IST) - timedelta(days=10)).strftime("%Y-%m-%d")
    try:
        candles = upstox_client.fetch_historical_candles(token, cfg.INDIA_VIX_KEY, from_date, to_date)
        print("OK: fetched", len(candles), "candle(s) for VIX")
    except Exception as exc:
        print("FAIL: candle fetch failed:", exc)
        return 1

    fii = nse_client.fetch_fii_dii()
    if fii is None:
        print("WARN: NSE FII/DII fetch failed (not fatal, mood will mark it stale)")
    else:
        print("OK: fetched FII/DII for", fii.get("date"))

    print("selftest passed.")
    return 0


def main():
    parser = argparse.ArgumentParser(prog="python -m jobs")
    parser.add_argument(
        "command",
        choices=["backfill", "snapshot", "eod", "brief", "selftest", "fii", "premarket"],
    )
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    if args.command == "backfill":
        cmd_backfill()
    elif args.command == "snapshot":
        run_snapshot()
    elif args.command == "eod":
        run_eod()
    elif args.command == "brief":
        run_brief(force=args.force)
    elif args.command == "fii":
        run_fii()
    elif args.command == "premarket":
        run_premarket()
    elif args.command == "selftest":
        sys.exit(cmd_selftest())


if __name__ == "__main__":
    main()
