import random
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

import config
import mood
import store


def test_fallback_scale_normal_and_inverted():
    assert mood.fallback_scale(-15000, config.FII_FALLBACK_LOW, config.FII_FALLBACK_HIGH) == 0
    assert mood.fallback_scale(15000, config.FII_FALLBACK_LOW, config.FII_FALLBACK_HIGH) == 100
    assert mood.fallback_scale(0, config.FII_FALLBACK_LOW, config.FII_FALLBACK_HIGH) == 50
    # VIX is inverted: low=25->0, high=10->100
    assert mood.fallback_scale(25, config.VIX_FALLBACK_LOW, config.VIX_FALLBACK_HIGH) == 0
    assert mood.fallback_scale(10, config.VIX_FALLBACK_LOW, config.VIX_FALLBACK_HIGH) == 100
    # out-of-range values clamp
    assert mood.fallback_scale(50, config.VIX_FALLBACK_LOW, config.VIX_FALLBACK_HIGH) == 0
    assert mood.fallback_scale(-10, config.VIX_FALLBACK_LOW, config.VIX_FALLBACK_HIGH) == 100


def test_percentile_score_normal_and_inverted():
    history = list(range(1, 101))  # 1..100
    assert mood.percentile_score(100, history) == 100  # everything <= 100
    assert mood.percentile_score(0, history) == 0  # nothing <= 0
    assert mood.percentile_score(50, history) == 50
    assert mood.percentile_score(100, history, inverted=True) == 0
    assert mood.percentile_score(0, history, inverted=True) == 100


def test_zone_edges():
    cases = {24: "Extreme Fear", 25: "Fear", 44: "Fear", 45: "Neutral",
             55: "Neutral", 56: "Greed", 75: "Greed", 76: "Extreme Greed"}
    for score, zone in cases.items():
        assert config.zone_for_score(score) == zone


def test_breadth_signal_is_direct_ratio_not_percentile():
    payload = {"all": [{"change": 1} for _ in range(60)] + [{"change": -1} for _ in range(40)]}
    result = mood._breadth_signal(payload)
    assert result["score"] == 60.0  # 60/100 * 100, no percentile involved


def test_missing_signal_averaging_excludes_unavailable():
    components = [
        {"id": "fii", "available": True, "score": 80},
        {"id": "vix", "available": True, "score": 60},
        {"id": "momentum", "available": True, "score": 40},
        {"id": "breadth", "available": True, "score": 20},
        {"id": "highs_lows", "available": False, "score": None},
        {"id": "gold", "available": False, "score": None},
    ]
    score, available = mood._score_from_components(components)
    assert score == 50  # mean of 80,60,40,20
    assert len(available) == 4


def test_fewer_than_four_signals_available_returns_none(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "DB_PATH", tmp_path / "t.db")
    monkeypatch.setattr(store, "DB_PATH", tmp_path / "t.db")
    store.init_db()
    components = [
        {"id": "fii", "available": True, "score": 80},
        {"id": "vix", "available": True, "score": 60},
        {"id": "momentum", "available": False, "score": None},
        {"id": "breadth", "available": False, "score": None},
        {"id": "highs_lows", "available": False, "score": None},
        {"id": "gold", "available": False, "score": None},
    ]
    score, available = mood._score_from_components(components)
    assert score is None
    assert len(available) == 2


def test_compute_mood_raises_without_any_data_or_fallback(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "DB_PATH", tmp_path / "t2.db")
    monkeypatch.setattr(store, "DB_PATH", tmp_path / "t2.db")
    store.init_db()
    import snapshot
    monkeypatch.setattr(snapshot, "get_cached_snapshot", lambda: None)
    import pytest
    with pytest.raises(mood.InsufficientDataError):
        mood.compute_mood(kind="close", date="2026-10-07", snapshot_payload={}, seed=1)


def test_golden_fixture_day(tmp_path, monkeypatch):
    """A fixed, hand-built day of data must always produce the same score."""
    monkeypatch.setattr(config, "DB_PATH", tmp_path / "golden.db")
    monkeypatch.setattr(store, "DB_PATH", tmp_path / "golden.db")
    store.init_db()

    nifty_closes = [24000 + i * 5 for i in range(95)]  # steady uptrend -> positive momentum
    store.upsert_index_bars("NSE_INDEX|Nifty 50", [
        {"date": f"2026-06-{i+1:02d}" if i < 30 else f"2026-07-{i-29:02d}" if i < 61 else f"2026-08-{i-60:02d}",
         "close": c}
        for i, c in enumerate(nifty_closes)
    ])
    store.upsert_index_bars(config.INDIA_VIX_KEY, [
        {"date": f"2026-08-{i+1:02d}", "close": 14.0} for i in range(5)
    ])

    for day in range(1, 6):
        store.upsert_fii_dii(f"2026-08-{day:02d}", 500.0, -200.0, "2026-08-05T18:30:00+05:30", stale=False)

    payload = {"all": [{"change": 1} for _ in range(70)] + [{"change": -1} for _ in range(30)]}

    import snapshot
    monkeypatch.setattr(snapshot, "get_cached_snapshot", lambda: payload)

    result = mood.compute_mood(kind="close", date="2026-08-05", snapshot_payload=payload, seed=42)

    # Golden values recorded from this exact fixture -- if a signal formula
    # changes, update this fixture deliberately, not by chance.
    assert result["score"] == 75
    assert result["zone"] == "Greed"
