"""Shared env flags, paths, and constants for the Mood Index revamp."""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
FIXTURES_DIR = BASE_DIR / "fixtures"
OG_DIR = DATA_DIR / "og"
DB_PATH = DATA_DIR / "equilytics.db"
SCHEDULER_LOCK_PATH = DATA_DIR / "scheduler.lock"
JOBS_LOG_PATH = DATA_DIR / "jobs.log"
SNAPSHOT_JSON_PATH = DATA_DIR / "snapshot.json"

SAMPLE_MODE = os.environ.get("EQUILYTICS_SAMPLE_DATA") == "1"

IST_OFFSET_HOURS = 5.5

# Mood Index zones (score -> zone name), boundaries inclusive on the high end.
ZONES = [
    (24, "Extreme Fear"),
    (44, "Fear"),
    (55, "Neutral"),
    (75, "Greed"),
    (100, "Extreme Greed"),
]


def setup_logging():
    """Rotating file handler (5MB x 3) for every backend/jobs.py + scheduler.py
    logger, per the brief's "one failing job must never stop the scheduler,
    exceptions are logged" requirement. Safe to call more than once."""
    import logging
    import logging.handlers

    logger = logging.getLogger("equilytics")
    if any(isinstance(h, logging.handlers.RotatingFileHandler) for h in logger.handlers):
        return
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    handler = logging.handlers.RotatingFileHandler(
        JOBS_LOG_PATH, maxBytes=5 * 1024 * 1024, backupCount=3
    )
    handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s"))
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)


def zone_for_score(score: float) -> str:
    for upper, name in ZONES:
        if score <= upper:
            return name
    return ZONES[-1][1]


# Instrument keys beyond backend/instruments.json's 1,643 equities.
# NOTE: the sector-index keys follow Upstox's documented "NSE_INDEX|Nifty <Sector>"
# naming convention (same pattern as the existing nifty50/banknifty/finnifty entries
# in app.py's INDEX_QUOTE_CONFIG) but have NOT been confirmed against a live
# instrument-master fetch yet -- that needs the real Upstox token (Phase 9). Verify
# each one with `python -m jobs selftest` before relying on it, and fix here if any
# differ. See docs/REVAMP_NOTES.md.
INDIA_VIX_KEY = "NSE_INDEX|India VIX"

# GOLDBEES (NIPPON INDIA ETF GOLD BEES) instrument key is an NSE_EQ|<ISIN> key.
# Deliberately left unresolved rather than guessed -- look it up in the Upstox
# instrument master during Phase 9 and fill this in. selftest() should fail loudly
# while this is None.
GOLDBEES_KEY = None

SECTOR_INDEX_KEYS = {
    "bank": "NSE_INDEX|Nifty Bank",
    "it": "NSE_INDEX|Nifty IT",
    "auto": "NSE_INDEX|Nifty Auto",
    "pharma": "NSE_INDEX|Nifty Pharma",
    "fmcg": "NSE_INDEX|Nifty FMCG",
    "metal": "NSE_INDEX|Nifty Metal",
    "realty": "NSE_INDEX|Nifty Realty",
    "energy": "NSE_INDEX|Nifty Energy",
    "psu_bank": "NSE_INDEX|Nifty PSU Bank",
    "media": "NSE_INDEX|Nifty Media",
    "infra": "NSE_INDEX|Nifty Infrastructure",
    "fin_service": "NSE_INDEX|Nifty Fin Service",
}

# Mood signal 1 (FII) fallback scale, used until 60+ sessions of history exist.
FII_FALLBACK_LOW, FII_FALLBACK_HIGH = -15_000, 15_000
# Signal 2 (VIX, inverted).
VIX_FALLBACK_LOW, VIX_FALLBACK_HIGH = 25, 10
# Signal 3 (momentum, EMA30 vs EMA90 on Nifty 50).
MOMENTUM_FALLBACK_LOW, MOMENTUM_FALLBACK_HIGH = -4, 4
# Signal 6 (gold vs Nifty 10-session return, inverted).
GOLD_FALLBACK_LOW, GOLD_FALLBACK_HIGH = 5, -5

PERCENTILE_WINDOW_SESSIONS = 250
MIN_SESSIONS_FOR_PERCENTILE = 60
MIN_AVAILABLE_SIGNALS = 4
SIGNAL_STALE_AFTER_SESSIONS = 3
