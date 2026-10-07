"""Daily Brief generation (brief sec 9): always a template brief; an optional
AI polish pass only runs if OPENAI_API_KEY is set, and only ever replaces the
template when it passes a strict fact-check -- otherwise the template ships.
"""
import json
import os
import re
from datetime import datetime, timedelta, timezone

import requests

import config
import lists as lists_module
import store

IST = timezone(timedelta(hours=5, minutes=30))

BANNED_WORDS = ["buy", "sell", "target price", "recommend", "should invest", "guaranteed"]
BANNED_PATTERN = re.compile(r"\b(" + "|".join(re.escape(w) for w in BANNED_WORDS) + r")\b", re.IGNORECASE)
NUMBER_PATTERN = re.compile(r"-?\d[\d,]*\.?\d*")


def _slugify(date):
    return date


def _collect_data(date, mood_result, snapshot_payload):
    stocks = snapshot_payload.get("all", [])
    index_quotes = snapshot_payload.get("indexQuotes", {})

    gainers = sorted(stocks, key=lambda s: s.get("change", 0), reverse=True)[:3]
    losers = sorted(stocks, key=lambda s: s.get("change", 0))[:3]

    sector_changes = []
    for key, label in {
        "bank": "Bank", "it": "IT", "auto": "Auto", "pharma": "Pharma", "fmcg": "FMCG",
        "metal": "Metal", "realty": "Realty", "energy": "Energy", "psu": "PSU Bank",
        "media": "Media", "infra": "Infra", "finance": "Fin Service",
    }.items():
        sector_stocks = snapshot_payload.get(key) or []
        changes = [s["change"] for s in sector_stocks if s.get("change") is not None]
        if changes:
            sector_changes.append({"label": label, "change": round(sum(changes) / len(changes), 2)})
    sector_changes.sort(key=lambda s: s["change"], reverse=True)

    fii_dii = store.latest_fii_dii() or {}
    vix_bars = store.get_index_bars(config.INDIA_VIX_KEY, limit_sessions=2)

    breadth_advances = sum(1 for s in stocks if s.get("change", 0) > 0)
    breadth_declines = sum(1 for s in stocks if s.get("change", 0) < 0)

    list_counts = {
        list_id: len(store.get_list(list_id, date)) for list_id in lists_module.RULES
    }

    return {
        "date": date,
        "mood": {"score": mood_result["score"], "zone": mood_result["zone"]},
        "nifty": index_quotes.get("nifty50", {}),
        "sensex": index_quotes.get("sensex", {}),
        "banknifty": index_quotes.get("banknifty", {}),
        "topSectors": sector_changes[:3],
        "bottomSectors": sector_changes[-3:][::-1],
        "fii": fii_dii.get("fii_net"),
        "dii": fii_dii.get("dii_net"),
        "fiiStale": bool(fii_dii.get("stale")),
        "vix": vix_bars[-1]["close"] if vix_bars else None,
        "breadthAdvances": breadth_advances,
        "breadthDeclines": breadth_declines,
        "gainers": [{"symbol": s["symbol"].replace(".NS", ""), "change": s["change"]} for s in gainers],
        "losers": [{"symbol": s["symbol"].replace(".NS", ""), "change": s["change"]} for s in losers],
        "listCounts": list_counts,
    }


def _fmt_pct(v):
    return f"{v:+.1f}%" if v is not None else "flat"


def _build_title(data):
    nifty_change = data["nifty"].get("change")
    direction = "rises" if (nifty_change or 0) >= 0 else "slips"
    driver = data["topSectors"][0]["label"] if nifty_change and nifty_change >= 0 and data["topSectors"] else (
        data["bottomSectors"][0]["label"] if data["bottomSectors"] else "Mixed sectors"
    )
    return f"{driver} as mood {direction} to {data['mood']['zone']}"


def _build_template_brief(data):
    nifty = data["nifty"]
    what_happened = (
        f"Nifty 50 {'rose' if (nifty.get('change') or 0) >= 0 else 'fell'} {_fmt_pct(nifty.get('change'))} to "
        f"{nifty.get('price', 'N/A')}. "
        f"{data['topSectors'][0]['label'] if data['topSectors'] else 'Some sectors'} led gains"
        f"{', while ' + data['bottomSectors'][0]['label'] + ' lagged' if data['bottomSectors'] else ''}."
    )
    fii_word = "bought" if (data["fii"] or 0) >= 0 else "sold"
    why = (
        f"Foreign investors net {fii_word} ₹{abs(round(data['fii'] or 0)):,} cr"
        f"{' (figure delayed, showing the previous session)' if data['fiiStale'] else ''}. "
        f"India VIX stood at {data['vix']:.1f}." if data["vix"] else "FII/DII and VIX data were not available today."
    )
    what_it_means = (
        "For long-term, SIP-style investors, a day like this changes little about a multi-year plan -- "
        "on down days, the same monthly investment simply buys more units. This is general education, not "
        "advice on any specific action to take."
    )
    what_to_watch = "Monthly F&O expiry, upcoming RBI policy dates, and the next US jobs report can all move sentiment in the days ahead."

    summary = (
        f"Nifty 50 {'rose' if (nifty.get('change') or 0) >= 0 else 'fell'} {_fmt_pct(nifty.get('change'))}; "
        f"the Mood Index is at {data['mood']['score']} ({data['mood']['zone']})."
    )
    body_html = (
        f"<ul>"
        f"<li><b>What happened:</b> {what_happened}</li>"
        f"<li><b>Why:</b> {why}</li>"
        f"<li><b>What it means for long-term investors:</b> {what_it_means}</li>"
        f"<li><b>What to watch:</b> {what_to_watch}</li>"
        f"</ul>"
    )
    return _build_title(data), summary, body_html


def _ai_polish(title, summary, body_html, data):
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return None

    plain_text = re.sub(r"<[^>]+>", " ", body_html)
    prompt = (
        "Rewrite this daily Indian stock market brief for clarity, aimed at a 14-year-old reading level, "
        "180-260 words. Keep every number exactly as given. Do not add any fact not already present. "
        "Do not use the words buy, sell, target price, recommend, should invest, or guaranteed.\n\n"
        f"Title: {title}\nSummary: {summary}\nBody: {plain_text}"
    )
    try:
        res = requests.post(
            "https://api.openai.com/v1/responses",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={"model": os.environ.get("OPENAI_SUMMARY_MODEL", "gpt-4.1-mini"), "input": prompt},
            timeout=20,
        )
        res.raise_for_status()
        payload = res.json()
        text = payload.get("output_text", "")
        if not text:
            for output in payload.get("output", []):
                for content in output.get("content", []):
                    if content.get("type") == "output_text":
                        text = content.get("text", "")
    except requests.RequestException:
        return None

    if not text or not _passes_fact_check(text, data):
        return None
    return text


def _passes_fact_check(text, data):
    if BANNED_PATTERN.search(text):
        return False
    source_numbers = set()
    for value in _flatten_numbers(data):
        source_numbers.add(round(value))
        source_numbers.add(round(value, 1))
    for match in NUMBER_PATTERN.findall(text):
        cleaned = match.replace(",", "")
        try:
            num = float(cleaned)
        except ValueError:
            continue
        if abs(num) < 1:
            continue  # tiny numbers (e.g. "1" in "1 cr") too noisy to check reliably
        if round(num) not in source_numbers and round(num, 1) not in source_numbers:
            return False
    return True


def _flatten_numbers(data):
    out = []
    def walk(v):
        if isinstance(v, (int, float)):
            out.append(float(v))
        elif isinstance(v, dict):
            for x in v.values():
                walk(x)
        elif isinstance(v, list):
            for x in v:
                walk(x)
    walk(data)
    return out


def generate_and_publish(date):
    import snapshot as snapshot_module
    import mood as mood_module

    snapshot_payload = snapshot_module.get_cached_snapshot() or {}
    mood_result = store.get_mood(date, "close") or store.latest_mood() or {"score": 50, "zone": "Neutral"}

    data = _collect_data(date, mood_result, snapshot_payload)
    title, summary, body_html = _build_template_brief(data)

    ai_text = _ai_polish(title, summary, body_html, data)
    if ai_text:
        body_html = "<p>" + ai_text.replace("\n\n", "</p><p>").replace("\n", " ") + "</p>"
        source = "ai"
    else:
        source = "template"

    store.save_brief(date, _slugify(date), title, summary, body_html, data, source, datetime.now(IST).isoformat())
    return {"title": title, "summary": summary, "source": source}
