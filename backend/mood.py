"""Equilytics Mood Index: six market signals -> one 0-100 score.

Never call this "Market Mood Index" (that's Tickertape's product name) --
always "Equilytics Mood Index".
"""
import random
from datetime import datetime, timedelta, timezone

import config
import store
import mood_text

IST = timezone(timedelta(hours=5, minutes=30))


class InsufficientDataError(Exception):
    """Raised when fewer than config.MIN_AVAILABLE_SIGNALS signals can be computed."""


def fallback_scale(value, low, high):
    """Linear map: `low` -> 0, `high` -> 100, clamped. Works whether low < high
    (normal direction) or low > high (inverted signal, e.g. VIX, gold-vs-nifty)."""
    if high == low:
        return 50.0
    score = (value - low) / (high - low) * 100
    return max(0.0, min(100.0, score))


def percentile_score(value, history, inverted=False):
    """value's percentile rank within history (0-100). inverted flips it."""
    if not history:
        return 50.0
    rank = sum(1 for h in history if h <= value) / len(history) * 100
    return 100 - rank if inverted else rank


def _sub_score(raw, history, fallback_low, fallback_high, inverted=False):
    """Percentile-rank when enough history exists, else the fixed fallback scale."""
    if len(history) >= config.MIN_SESSIONS_FOR_PERCENTILE:
        windowed = history[-config.PERCENTILE_WINDOW_SESSIONS:]
        return percentile_score(raw, windowed, inverted=inverted)
    return fallback_scale(raw, fallback_low, fallback_high)


def _ema(values, span):
    if not values:
        return []
    alpha = 2 / (span + 1)
    out = [values[0]]
    for v in values[1:]:
        out.append(alpha * v + (1 - alpha) * out[-1])
    return out


# ---------------------------------------------------------------------------
# Signal 1: Foreign investors (FII) -- sum of trailing 5 sessions' net flow.
# ---------------------------------------------------------------------------

def _fii_signal(fii_rows):
    usable = [r for r in fii_rows if not r.get("stale")]
    if len(usable) < 5:
        return None
    trailing_sums = [
        sum(r["fii_net"] for r in usable[max(0, i - 4):i + 1])
        for i in range(4, len(usable))
    ]
    raw = trailing_sums[-1]
    history = trailing_sums[:-1]
    score = _sub_score(raw, history, config.FII_FALLBACK_LOW, config.FII_FALLBACK_HIGH)
    reading = f"Net {'bought' if raw >= 0 else 'sold'} ₹{abs(round(raw)):,} cr over the last 5 sessions"
    return {"score": score, "raw": raw, "reading": reading}


# ---------------------------------------------------------------------------
# Signal 2: Volatility (India VIX), inverted.
# ---------------------------------------------------------------------------

def _vix_signal(vix_bars):
    if not vix_bars:
        return None
    closes = [b["close"] for b in vix_bars]
    raw = closes[-1]
    history = closes[:-1]
    score = _sub_score(raw, history, config.VIX_FALLBACK_LOW, config.VIX_FALLBACK_HIGH, inverted=True)
    prev = closes[-2] if len(closes) > 1 else raw
    pct = ((raw - prev) / prev * 100) if prev else 0
    reading = f"{raw:.1f} · {'up' if pct >= 0 else 'down'} {abs(pct):.1f}% today"
    return {"score": score, "raw": raw, "reading": reading}


# ---------------------------------------------------------------------------
# Signal 3: Momentum -- (EMA30 - EMA90) / EMA90 * 100 on Nifty 50 closes.
# ---------------------------------------------------------------------------

def _momentum_series(closes):
    if len(closes) < 90:
        return []
    ema30, ema90 = _ema(closes, 30), _ema(closes, 90)
    return [(a - b) / b * 100 for a, b in zip(ema30, ema90)]


def _momentum_signal(nifty_bars):
    closes = [b["close"] for b in nifty_bars]
    series = _momentum_series(closes)
    if not series:
        return None
    raw = series[-1]
    history = series[:-1]
    score = _sub_score(raw, history, config.MOMENTUM_FALLBACK_LOW, config.MOMENTUM_FALLBACK_HIGH)
    reading = f"30-day avg {abs(raw):.1f}% {'above' if raw >= 0 else 'below'} 90-day avg"
    return {"score": score, "raw": raw, "reading": reading}


# ---------------------------------------------------------------------------
# Signal 4: Market breadth -- advances / (advances + declines), today only.
# ---------------------------------------------------------------------------

def _breadth_signal(snapshot_payload):
    stocks = snapshot_payload.get("all", [])
    advances = sum(1 for s in stocks if s.get("change", 0) > 0)
    declines = sum(1 for s in stocks if s.get("change", 0) < 0)
    total = advances + declines
    if total == 0:
        return None
    ratio = advances / total
    score = max(0.0, min(100.0, ratio * 100))
    reading = f"{advances:,} rose · {declines:,} fell"
    return {"score": score, "raw": ratio, "reading": reading}


# ---------------------------------------------------------------------------
# Signal 5: 52-week highs vs lows.
# ---------------------------------------------------------------------------

def _highs_lows_signal(all_daily_bars):
    """all_daily_bars: {symbol: [bars sorted by date]}, each >= 60 sessions."""
    highs = lows = 0
    counted = 0
    for bars in all_daily_bars.values():
        window = bars[-config.PERCENTILE_WINDOW_SESSIONS:]
        if len(window) < config.MIN_SESSIONS_FOR_PERCENTILE:
            continue
        closes = [b["close"] for b in window]
        today_close = closes[-1]
        session_high, session_low = max(closes), min(closes)
        counted += 1
        if today_close >= 0.98 * session_high:
            highs += 1
        if today_close <= 1.02 * session_low:
            lows += 1
    if counted == 0:
        return None
    value = (highs - lows) / max(highs + lows, 1)
    score = max(0.0, min(100.0, 50 + 50 * value))
    reading = f"{highs} new highs · {lows} new lows"
    return {"score": score, "raw": value, "reading": reading}


# ---------------------------------------------------------------------------
# Signal 6: Gold vs Nifty, 10-session return, inverted.
# ---------------------------------------------------------------------------

def _gold_signal(gold_bars, nifty_bars):
    if len(gold_bars) < 11 or len(nifty_bars) < 11:
        return None
    gold_return = (gold_bars[-1]["close"] - gold_bars[-11]["close"]) / gold_bars[-11]["close"] * 100
    nifty_return = (nifty_bars[-1]["close"] - nifty_bars[-11]["close"]) / nifty_bars[-11]["close"] * 100
    raw = gold_return - nifty_return
    score = fallback_scale(raw, config.GOLD_FALLBACK_LOW, config.GOLD_FALLBACK_HIGH)
    reading = f"Gold {gold_return:+.1f}% vs Nifty {nifty_return:+.1f}% (10 sessions)"
    return {"score": score, "raw": raw, "reading": reading}


SIGNAL_IDS = ["fii", "vix", "momentum", "breadth", "highs_lows", "gold"]


def _assemble_components(raw_signals, previous_components_by_id, rng):
    """raw_signals: {id: {score, raw, reading} or None}. Builds the public
    `components` list, with `explain`/`delta1d`/`available` filled in."""
    components = []
    for signal_id in SIGNAL_IDS:
        result = raw_signals.get(signal_id)
        available = result is not None
        score = round(result["score"]) if available else None
        prev = previous_components_by_id.get(signal_id)
        delta1d = (score - prev["score"]) if (available and prev and prev.get("score") is not None) else None
        components.append({
            "id": signal_id,
            "name": mood_text.SIGNAL_NAMES[signal_id],
            "score": score,
            "raw": result["raw"] if available else None,
            "reading": result["reading"] if available else "Data delayed",
            "explain": mood_text.signal_explain(signal_id, score, rng) if available else "This signal isn't available right now.",
            "available": available,
            "delta1d": delta1d,
        })
    return components


def _score_from_components(components):
    available = [c for c in components if c["available"] and c["score"] is not None]
    if len(available) < config.MIN_AVAILABLE_SIGNALS:
        return None, available
    score = round(sum(c["score"] for c in available) / len(available))
    return score, available


def compute_mood(kind="close", date=None, snapshot_payload=None, seed=None):
    """Builds the full mood object (brief sec 4.2 shape). Raises
    InsufficientDataError if fewer than MIN_AVAILABLE_SIGNALS are available
    AND there's no previous valid score to fall back to."""
    rng = random.Random(seed) if seed is not None else random

    date = date or datetime.now(IST).strftime("%Y-%m-%d")
    snapshot_payload = snapshot_payload or {}

    import snapshot as snapshot_module
    if not snapshot_payload:
        cached = snapshot_module.get_cached_snapshot()
        snapshot_payload = cached or {}

    fii_rows = store.get_fii_dii(limit_sessions=config.PERCENTILE_WINDOW_SESSIONS + 5)
    vix_bars = store.get_index_bars(config.INDIA_VIX_KEY, limit_sessions=config.PERCENTILE_WINDOW_SESSIONS + 1)
    nifty_bars = store.get_index_bars("NSE_INDEX|Nifty 50", limit_sessions=config.PERCENTILE_WINDOW_SESSIONS + 91)
    gold_bars = store.get_index_bars(config.GOLDBEES_KEY, limit_sessions=15) if config.GOLDBEES_KEY else []

    raw_signals = {
        "fii": _fii_signal(fii_rows),
        "vix": _vix_signal(vix_bars),
        "momentum": _momentum_signal(nifty_bars),
        "breadth": _breadth_signal(snapshot_payload),
        "highs_lows": None,  # filled by the eod job, which has every symbol's bars; see mood.highs_lows_from_bars
        "gold": _gold_signal(gold_bars, nifty_bars),
    }

    previous = store.get_mood(_previous_session_date(date), kind) or {}
    previous_components_by_id = {c["id"]: c for c in previous.get("components", [])}

    components = _assemble_components(raw_signals, previous_components_by_id, rng)
    score, available = _score_from_components(components)

    if score is None:
        last_good = store.latest_mood() if kind != "live" else store.get_mood_live()
        if last_good is None:
            raise InsufficientDataError(
                f"Only {sum(1 for c in components if c['available'])} of "
                f"{config.MIN_AVAILABLE_SIGNALS} required signals are available, "
                "and there's no previous score to fall back to."
            )
        last_good["note"] = "data delayed"
        return last_good

    zone = config.zone_for_score(score)
    breadth = next((c for c in components if c["id"] == "breadth"), None)
    breadth_disagrees = bool(breadth and breadth["available"] and (
        (score >= 50) != (breadth["score"] >= 50)
    ))
    headline = mood_text.build_headline(components, breadth_disagrees=breadth_disagrees)
    verdict = mood_text.verdict_for_score(score)

    compare = _compare_scores(date, kind)
    change = {
        key: (score - compare[key]) if compare.get(key) is not None else None
        for key in ("yesterday", "week_ago", "month_ago")
    }
    change = {"d1": change["yesterday"], "w1": change["week_ago"], "m1": change["month_ago"]}

    return {
        "date": date,
        "kind": kind,
        "score": score,
        "zone": zone,
        "change": change,
        "compare": compare,
        "components": components,
        "headline": headline,
        "verdict": verdict,
        "computed_at": datetime.now(IST).isoformat(),
    }


def inject_highs_lows_signal(mood_components, all_daily_bars):
    """The eod job (which has every symbol's bars) calls this to fill in the
    52-week highs/lows signal after compute_mood() has run without it, then
    the caller re-averages. Kept separate from compute_mood so /api/mood
    (which only has the cached snapshot, not every symbol's full history)
    doesn't need to load every symbol's daily bars on every request."""
    result = _highs_lows_signal(all_daily_bars)
    for c in mood_components:
        if c["id"] == "highs_lows" and result is not None:
            c.update({
                "score": round(result["score"]),
                "raw": result["raw"],
                "reading": result["reading"],
                "explain": mood_text.signal_explain("highs_lows", round(result["score"])),
                "available": True,
            })
    return mood_components


def _previous_session_date(date):
    d = datetime.strptime(date, "%Y-%m-%d") - timedelta(days=1)
    while d.weekday() >= 5:  # skip weekends; holidays are a close enough approximation here
        d -= timedelta(days=1)
    return d.strftime("%Y-%m-%d")


def _compare_scores(date, kind):
    history = store.get_mood_history(kind, days=config.PERCENTILE_WINDOW_SESSIONS)
    by_date = {h["date"]: h["score"] for h in history}
    d = datetime.strptime(date, "%Y-%m-%d")
    return {
        "yesterday": by_date.get(_previous_session_date(date)),
        "week_ago": by_date.get((d - timedelta(days=7)).strftime("%Y-%m-%d")),
        "month_ago": by_date.get((d - timedelta(days=30)).strftime("%Y-%m-%d")),
    }


def backfill_history():
    """Computes a 'backfill'-kind mood for every past session where the
    inputs exist (no FII, since NSE's endpoint has no history API), so the
    'Mood vs Nifty' chart has data from launch day."""
    nifty_bars = store.get_index_bars("NSE_INDEX|Nifty 50")
    if len(nifty_bars) < 90:
        return 0
    computed = 0
    for i in range(89, len(nifty_bars)):
        date = nifty_bars[i]["date"]
        window_nifty = nifty_bars[: i + 1]
        vix_bars = [b for b in store.get_index_bars(config.INDIA_VIX_KEY) if b["date"] <= date]
        gold_bars = [b for b in store.get_index_bars(config.GOLDBEES_KEY) if b["date"] <= date] if config.GOLDBEES_KEY else []
        raw_signals = {
            "fii": None,  # no FII history before launch day, per the brief
            "vix": _vix_signal(vix_bars),
            "momentum": _momentum_signal(window_nifty),
            "breadth": None,  # needs per-day full-universe data we don't backfill
            "highs_lows": None,
            "gold": _gold_signal(gold_bars, window_nifty),
        }
        components = _assemble_components(raw_signals, {}, random)
        score, _ = _score_from_components(components)
        if score is None:
            continue
        zone = config.zone_for_score(score)
        store.save_mood(date, "backfill", score, zone, components, "", datetime.now(IST).isoformat())
        computed += 1
    return computed
