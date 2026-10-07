"""Focus List screens (brief sec 8.4): four rule-based stock lists, computed
over the full universe in the `eod` job and served from store.py's cache.
"""
import store

RULES = {
    "near-52w-high": "Rule: closing price within 3% of its 52-week high, with today's volume above its 20-day average.",
    "near-52w-low": "Rule: closing price within 3% of its 52-week low.",
    "volume-shockers": "Rule: today's volume at least 3× its 20-day average, price at least ₹20.",
    "steady-climbers": "Rule: up on at least 14 of the last 20 sessions, with no single-day fall over 2%.",
}

LABELS = {
    "near-52w-high": "Near 52-week high",
    "near-52w-low": "Near 52-week low",
    "volume-shockers": "Volume shockers",
    "steady-climbers": "Steady climbers",
}

DISCLAIMER = "These are data screens, not buy or sell recommendations. Equilytics is not a SEBI-registered investment adviser or research analyst."


def _avg(values):
    return sum(values) / len(values) if values else 0


def compute_focus_lists(date, snapshot_payload, window_sessions=250):
    """Computes all four lists from today's snapshot + each symbol's
    daily_bars history, and saves them via store.save_list."""
    stocks = snapshot_payload.get("all", [])

    near_high, near_low, shockers, climbers = [], [], [], []

    for s in stocks:
        symbol = s["symbol"].replace(".NS", "")
        bars = store.get_daily_bars(symbol, limit_sessions=window_sessions)
        if len(bars) < 20:
            continue
        closes = [b["close"] for b in bars]
        volumes = [b["volume"] for b in bars]
        price = s["price"]
        session_high, session_low = max(closes), min(closes)
        avg_vol_20 = _avg(volumes[-20:])
        today_vol = volumes[-1]

        if session_high and price >= 0.97 * session_high and today_vol > avg_vol_20:
            near_high.append((symbol, s, (price / session_high) * 100))
        if session_low and price <= 1.03 * session_low:
            near_low.append((symbol, s, (price / session_low) * 100))
        if avg_vol_20 and today_vol >= 3 * avg_vol_20 and price >= 20:
            near_vol_mult = today_vol / avg_vol_20
            shockers.append((symbol, s, near_vol_mult))

        last20 = bars[-20:]
        up_days = sum(1 for i in range(1, len(last20)) if last20[i]["close"] > last20[i - 1]["close"])
        max_drop = max(
            (0,) + tuple(
                (last20[i - 1]["close"] - last20[i]["close"]) / last20[i - 1]["close"] * 100
                for i in range(1, len(last20))
            )
        )
        if up_days >= 14 and max_drop <= 2 and len(bars) >= 20:
            ret_20d = (closes[-1] - closes[-20]) / closes[-20] * 100
            climbers.append((symbol, s, ret_20d, up_days))

    near_high.sort(key=lambda t: -t[2])
    near_low.sort(key=lambda t: t[2])
    shockers.sort(key=lambda t: -t[2])
    climbers.sort(key=lambda t: -t[2])

    store.save_list(date, "near-52w-high", [
        {"symbol": sym, "sector": "", "price": s["price"], "fromHigh": round(pct - 100, 1), "volVsAvg": None}
        for sym, s, pct in near_high[:10]
    ])
    store.save_list(date, "near-52w-low", [
        {"symbol": sym, "sector": "", "price": s["price"], "fromLow": round(pct - 100, 1)}
        for sym, s, pct in near_low[:10]
    ])
    store.save_list(date, "volume-shockers", [
        {"symbol": sym, "sector": "", "price": s["price"], "change": s["change"], "volMultiple": round(mult, 1)}
        for sym, s, mult in shockers[:10]
    ])
    store.save_list(date, "steady-climbers", [
        {"symbol": sym, "sector": "", "price": s["price"], "return20d": round(ret, 1), "upDays": f"{up}/20"}
        for sym, s, ret, up in climbers[:10]
    ])


def get_list_for_api(list_id):
    if list_id not in RULES:
        return None
    rows = store.get_list(list_id)
    if list_id == "near-52w-high":
        cols = ["Stock", "Price ₹", "From high", "Vol vs avg"]
        table_rows = [[r["symbol"], r["price"], f"{r['fromHigh']}%", "—"] for r in rows]
    elif list_id == "near-52w-low":
        cols = ["Stock", "Price ₹", "From low"]
        table_rows = [[r["symbol"], r["price"], f"{r['fromLow']}%"] for r in rows]
    elif list_id == "volume-shockers":
        cols = ["Stock", "Price ₹", "Change", "Vol vs avg"]
        table_rows = [[r["symbol"], r["price"], f"{r['change']:+.1f}%", f"{r['volMultiple']}×"] for r in rows]
    else:
        cols = ["Stock", "Price ₹", "20-day return", "Up days"]
        table_rows = [[r["symbol"], r["price"], f"{r['return20d']:+.1f}%", r["upDays"]] for r in rows]

    return {"id": list_id, "label": LABELS[list_id], "rule": RULES[list_id], "cols": cols, "rows": table_rows, "disclaimer": DISCLAIMER}
