"""Phase 1 checks: fixtures load, store.py round-trips, token-validity logic
matches the brief (non-JWT token treated as valid, not expired)."""
import json
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

import config
import store
import upstox_client


def test_sample_fixture_loads():
    data = json.loads((BACKEND_DIR / "fixtures" / "sample_daily_bars.json").read_text())
    assert "RELIANCE" in data["symbols"]
    assert len(data["symbols"]["RELIANCE"]) == 5
    assert "NSE_INDEX|Nifty 50" in data["indices"]


def test_zone_for_score_boundaries():
    assert config.zone_for_score(24) == "Extreme Fear"
    assert config.zone_for_score(25) == "Fear"
    assert config.zone_for_score(44) == "Fear"
    assert config.zone_for_score(45) == "Neutral"
    assert config.zone_for_score(55) == "Neutral"
    assert config.zone_for_score(56) == "Greed"
    assert config.zone_for_score(75) == "Greed"
    assert config.zone_for_score(76) == "Extreme Greed"
    assert config.zone_for_score(100) == "Extreme Greed"


def test_store_round_trip(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "DB_PATH", tmp_path / "test.db")
    monkeypatch.setattr(store, "DB_PATH", tmp_path / "test.db")
    store.init_db()

    store.upsert_daily_bars("RELIANCE", [
        {"date": "2026-10-01", "open": 1, "high": 2, "low": 0.5, "close": 1.5, "volume": 100},
    ])
    assert store.count_daily_bars("RELIANCE") == 1

    store.save_mood("2026-10-07", "close", 38, "Fear", [{"id": "fii", "score": 24}], "Mood slips to Fear", "2026-10-07T19:00:00+05:30")
    mood = store.get_mood("2026-10-07", "close")
    assert mood["score"] == 38
    assert mood["components"][0]["id"] == "fii"

    store.set_meta("token_status", {"valid": True})
    assert store.get_meta("token_status")["valid"] is True


def test_non_jwt_token_treated_as_valid():
    # The brief's intended behavior (opposite of the old token_manager.is_expired,
    # which treated any decode failure as expired).
    assert upstox_client.token_looks_valid("a-plain-analytics-token") is True
    assert upstox_client.token_looks_valid("") is False
    assert upstox_client.token_looks_valid(None) is False
