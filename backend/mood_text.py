"""Deterministic plain-English copy for each mood signal, picked by sub-score
band and direction vs. yesterday. No AI here -- see brief.py for the one
place AI optionally touches generated text (and even there, only as an
optional polish pass with a fact-check fallback to this same template style).

Deviation from the brief: it names this module `backend/copy/mood_text.py`.
A package literally named `copy` would shadow Python's stdlib `copy` module
for the whole process (backend/ is on sys.path via --chdir), silently
breaking anything that does `import copy` (requests, json, etc. use it
internally) -- so this lives at `backend/mood_text.py` instead. See
docs/REVAMP_NOTES.md.
"""
import random

BANDS = [(24, "extreme_fear"), (44, "fear"), (55, "neutral"), (75, "greed"), (100, "extreme_greed")]


def band_for_score(score):
    for upper, name in BANDS:
        if score <= upper:
            return name
    return BANDS[-1][1]


SIGNAL_TEMPLATES = {
    "fii": {
        "extreme_fear": [
            "Foreign investors are selling heavily -- when they pull out this fast, large-cap stocks usually feel it.",
            "A sharp wave of foreign selling. This kind of outflow tends to weigh on the index's biggest names.",
            "Foreign funds are exiting in size. Heavy, sustained selling like this is a strong fear signal.",
        ],
        "fear": [
            "Foreign funds are net sellers. Steady selling like this usually puts some pressure on large caps.",
            "Foreign investors have been pulling money out. Not a flood, but a consistent drag.",
            "More foreign selling than buying lately -- a mild but real headwind for the index.",
        ],
        "neutral": [
            "Foreign flows are roughly balanced -- neither a strong tailwind nor headwind right now.",
            "No clear direction from foreign investors this week.",
        ],
        "greed": [
            "Foreign funds have been net buyers, adding steady support to the market.",
            "Foreign money is coming in. Consistent buying like this tends to support large-cap prices.",
        ],
        "extreme_greed": [
            "Foreign investors are buying aggressively -- a strong vote of confidence from overseas money.",
            "A big wave of foreign buying. This kind of inflow often lifts the whole market.",
        ],
    },
    "vix": {
        "extreme_fear": [
            "India VIX is elevated -- traders are paying a lot to protect against big swings.",
            "Volatility is high. When VIX jumps like this, it usually means traders expect a rough ride.",
        ],
        "fear": [
            "VIX has ticked up. People are a little more nervous about near-term swings.",
            "Volatility is above its recent calm levels -- some caution creeping in.",
        ],
        "neutral": [
            "VIX is at a fairly typical level -- no unusual nervousness in the options market.",
        ],
        "greed": [
            "VIX is low, meaning traders aren't paying much to protect against swings -- a sign of calm.",
            "Volatility is subdued. Low VIX usually goes with a steadier, more confident market.",
        ],
        "extreme_greed": [
            "VIX is very low -- traders see little near-term risk, which often goes with a confident market.",
        ],
    },
    "momentum": {
        "extreme_fear": [
            "Nifty's short-term trend has turned sharply down against its longer trend -- clear loss of momentum.",
        ],
        "fear": [
            "Nifty's recent trend has slipped a bit below its longer-term trend. Not a crash, just lost steam.",
            "The index's short-term average has drifted below its longer one -- momentum is cooling.",
        ],
        "neutral": [
            "Nifty's short- and longer-term trends are roughly in line -- no strong push either way.",
        ],
        "greed": [
            "Nifty's short-term trend is running a bit ahead of its longer trend -- a mild upward push.",
        ],
        "extreme_greed": [
            "Nifty's short-term trend is running well ahead of its longer trend -- strong upward momentum.",
        ],
    },
    "breadth": {
        "extreme_fear": [
            "Far more stocks fell than rose today -- the selling was broad, not limited to a few names.",
        ],
        "fear": [
            "More stocks fell than rose today, even if the index move looked small.",
        ],
        "neutral": [
            "Roughly as many stocks rose as fell today -- a mixed, balanced session.",
        ],
        "greed": [
            "More stocks rose than fell today -- broad-based buying, not just a few large names.",
        ],
        "extreme_greed": [
            "The vast majority of stocks rose today -- very broad buying across the market.",
        ],
    },
    "highs_lows": {
        "extreme_fear": [
            "Far more stocks hit one-year lows than one-year highs -- a broad loss of momentum underneath the index.",
        ],
        "fear": [
            "More stocks hit one-year lows than highs. Fewer stocks are reaching new peaks.",
        ],
        "neutral": [
            "New highs and new lows are roughly balanced across the market.",
        ],
        "greed": [
            "More stocks are hitting one-year highs than lows -- a healthy sign beneath the surface.",
        ],
        "extreme_greed": [
            "A large number of stocks are hitting one-year highs, with very few at new lows.",
        ],
    },
    "gold": {
        "extreme_fear": [
            "Gold has sharply outrun stocks recently -- investors often rush to gold when confidence is low.",
        ],
        "fear": [
            "Gold has been beating stocks lately. Investors often move to gold when they feel unsure.",
        ],
        "neutral": [
            "Gold and stocks have moved in step recently -- no strong flight to safety either way.",
        ],
        "greed": [
            "Stocks have outpaced gold recently -- a sign investors are favouring risk over safety.",
        ],
        "extreme_greed": [
            "Stocks have sharply outrun gold -- investors are clearly favouring risk right now.",
        ],
    },
}

SIGNAL_NAMES = {
    "fii": "Foreign investors (FII)",
    "vix": "Volatility (India VIX)",
    "momentum": "Momentum",
    "breadth": "Market breadth",
    "highs_lows": "52-week highs vs lows",
    "gold": "Gold vs Nifty",
}

VERDICTS = [
    (10, "panicking"),
    (24, "nervous, not panicking"),
    (44, "cautious"),
    (55, "calm and watchful"),
    (65, "calm and confident"),
    (75, "getting greedy, so be careful"),
    (100, "euphoric, worth some caution"),
]


def verdict_for_score(score):
    for upper, text in VERDICTS:
        if score <= upper:
            return text
    return VERDICTS[-1][1]


def signal_explain(signal_id, score, rng=None):
    rng = rng or random
    band = band_for_score(score)
    options = SIGNAL_TEMPLATES[signal_id][band]
    return rng.choice(options)


def build_headline(components, breadth_disagrees=False):
    """Name the two signals that moved most since yesterday, plus breadth if
    it disagrees with the overall direction."""
    movers = sorted(
        (c for c in components if c.get("available") and c.get("delta1d") is not None),
        key=lambda c: abs(c["delta1d"]),
        reverse=True,
    )
    if not movers:
        return "The mood index held roughly steady today."

    parts = []
    for c in movers[:2]:
        direction = "rose" if c["delta1d"] > 0 else "fell"
        parts.append(f"{SIGNAL_NAMES.get(c['id'], c['id'])} {direction}")

    sentence = " and ".join(parts) + "."
    if breadth_disagrees:
        breadth = next((c for c in components if c["id"] == "breadth"), None)
        if breadth:
            extra = "slightly more stocks rose than fell" if breadth["score"] >= 50 else "more stocks fell than rose"
            sentence += f" Even so, {extra}."
    return sentence
