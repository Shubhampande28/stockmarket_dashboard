"""SQLite storage for the Mood Index revamp. All SQL lives here -- routes and
jobs call these functions, never raw cursors.
"""
import json
import sqlite3
from contextlib import contextmanager

from config import DB_PATH

SCHEMA = """
CREATE TABLE IF NOT EXISTS daily_bars (
    symbol TEXT, date TEXT, open REAL, high REAL, low REAL, close REAL, volume INTEGER,
    PRIMARY KEY (symbol, date)
);
CREATE TABLE IF NOT EXISTS index_bars (
    key TEXT, date TEXT, close REAL,
    PRIMARY KEY (key, date)
);
CREATE TABLE IF NOT EXISTS fii_dii (
    date TEXT PRIMARY KEY, fii_net REAL, dii_net REAL, fetched_at TEXT, stale INTEGER
);
CREATE TABLE IF NOT EXISTS mood (
    date TEXT, kind TEXT, score REAL, zone TEXT, components TEXT, headline TEXT, computed_at TEXT,
    PRIMARY KEY (date, kind)
);
CREATE TABLE IF NOT EXISTS mood_live (
    id INTEGER PRIMARY KEY CHECK (id = 1), score REAL, zone TEXT, components TEXT, computed_at TEXT
);
CREATE TABLE IF NOT EXISTS lists (
    date TEXT, list_id TEXT, rows TEXT,
    PRIMARY KEY (date, list_id)
);
CREATE TABLE IF NOT EXISTS briefs (
    date TEXT PRIMARY KEY, slug TEXT, title TEXT, summary TEXT, body_html TEXT, data TEXT,
    source TEXT, published_at TEXT
);
CREATE TABLE IF NOT EXISTS poll_votes (
    date TEXT, voter TEXT, choice TEXT, created_at TEXT,
    PRIMARY KEY (date, voter)
);
CREATE TABLE IF NOT EXISTS poll_results (
    date TEXT PRIMARY KEY, up INTEGER, flat INTEGER, down INTEGER, actual TEXT, crowd_correct INTEGER
);
CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY, value TEXT
);
"""


@contextmanager
def connect():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db():
    with connect() as conn:
        conn.executescript(SCHEMA)


# ---- daily_bars / index_bars ----

def upsert_daily_bars(symbol, bars):
    """bars: list of {date, open, high, low, close, volume}."""
    with connect() as conn:
        conn.executemany(
            "INSERT INTO daily_bars (symbol, date, open, high, low, close, volume) "
            "VALUES (?,?,?,?,?,?,?) "
            "ON CONFLICT(symbol, date) DO UPDATE SET "
            "open=excluded.open, high=excluded.high, low=excluded.low, "
            "close=excluded.close, volume=excluded.volume",
            [
                (symbol, b["date"], b["open"], b["high"], b["low"], b["close"], b["volume"])
                for b in bars
            ],
        )


def count_daily_bars(symbol):
    with connect() as conn:
        row = conn.execute(
            "SELECT COUNT(*) AS n FROM daily_bars WHERE symbol = ?", (symbol,)
        ).fetchone()
        return row["n"] if row else 0


def get_daily_bars(symbol, limit_sessions=None):
    with connect() as conn:
        query = "SELECT * FROM daily_bars WHERE symbol = ? ORDER BY date"
        rows = [dict(r) for r in conn.execute(query, (symbol,)).fetchall()]
    if limit_sessions:
        rows = rows[-limit_sessions:]
    return rows


def upsert_index_bars(key, bars):
    """bars: list of {date, close}."""
    with connect() as conn:
        conn.executemany(
            "INSERT INTO index_bars (key, date, close) VALUES (?,?,?) "
            "ON CONFLICT(key, date) DO UPDATE SET close=excluded.close",
            [(key, b["date"], b["close"]) for b in bars],
        )


def get_index_bars(key, limit_sessions=None):
    with connect() as conn:
        rows = [
            dict(r)
            for r in conn.execute(
                "SELECT * FROM index_bars WHERE key = ? ORDER BY date", (key,)
            ).fetchall()
        ]
    if limit_sessions:
        rows = rows[-limit_sessions:]
    return rows


# ---- fii_dii ----

def upsert_fii_dii(date, fii_net, dii_net, fetched_at, stale=False):
    with connect() as conn:
        conn.execute(
            "INSERT INTO fii_dii (date, fii_net, dii_net, fetched_at, stale) VALUES (?,?,?,?,?) "
            "ON CONFLICT(date) DO UPDATE SET fii_net=excluded.fii_net, dii_net=excluded.dii_net, "
            "fetched_at=excluded.fetched_at, stale=excluded.stale",
            (date, fii_net, dii_net, fetched_at, int(stale)),
        )


def get_fii_dii(limit_sessions=None):
    with connect() as conn:
        rows = [dict(r) for r in conn.execute("SELECT * FROM fii_dii ORDER BY date").fetchall()]
    if limit_sessions:
        rows = rows[-limit_sessions:]
    return rows


def latest_fii_dii():
    with connect() as conn:
        row = conn.execute("SELECT * FROM fii_dii ORDER BY date DESC LIMIT 1").fetchone()
        return dict(row) if row else None


# ---- mood / mood_live ----

def save_mood(date, kind, score, zone, components, headline, computed_at):
    with connect() as conn:
        conn.execute(
            "INSERT INTO mood (date, kind, score, zone, components, headline, computed_at) "
            "VALUES (?,?,?,?,?,?,?) "
            "ON CONFLICT(date, kind) DO UPDATE SET score=excluded.score, zone=excluded.zone, "
            "components=excluded.components, headline=excluded.headline, computed_at=excluded.computed_at",
            (date, kind, score, zone, json.dumps(components), headline, computed_at),
        )


def get_mood(date, kind):
    with connect() as conn:
        row = conn.execute(
            "SELECT * FROM mood WHERE date = ? AND kind = ?", (date, kind)
        ).fetchone()
        return _mood_row_to_dict(row)


def get_mood_history(kind, days=None):
    with connect() as conn:
        rows = conn.execute(
            "SELECT * FROM mood WHERE kind = ? ORDER BY date", (kind,)
        ).fetchall()
    out = [_mood_row_to_dict(r) for r in rows]
    if days:
        out = out[-days:]
    return out


def latest_mood(kinds=("close", "backfill")):
    with connect() as conn:
        for kind in kinds:
            row = conn.execute(
                "SELECT * FROM mood WHERE kind = ? ORDER BY date DESC LIMIT 1", (kind,)
            ).fetchone()
            if row:
                return _mood_row_to_dict(row)
    return None


def _mood_row_to_dict(row):
    if not row:
        return None
    d = dict(row)
    d["components"] = json.loads(d["components"]) if d.get("components") else []
    return d


def save_mood_live(score, zone, components, computed_at):
    with connect() as conn:
        conn.execute(
            "INSERT INTO mood_live (id, score, zone, components, computed_at) VALUES (1,?,?,?,?) "
            "ON CONFLICT(id) DO UPDATE SET score=excluded.score, zone=excluded.zone, "
            "components=excluded.components, computed_at=excluded.computed_at",
            (score, zone, json.dumps(components), computed_at),
        )


def get_mood_live():
    with connect() as conn:
        row = conn.execute("SELECT * FROM mood_live WHERE id = 1").fetchone()
        return _mood_row_to_dict(row)


# ---- lists ----

def save_list(date, list_id, rows):
    with connect() as conn:
        conn.execute(
            "INSERT INTO lists (date, list_id, rows) VALUES (?,?,?) "
            "ON CONFLICT(date, list_id) DO UPDATE SET rows=excluded.rows",
            (date, list_id, json.dumps(rows)),
        )


def get_list(list_id, date=None):
    with connect() as conn:
        if date:
            row = conn.execute(
                "SELECT * FROM lists WHERE list_id = ? AND date = ?", (list_id, date)
            ).fetchone()
        else:
            row = conn.execute(
                "SELECT * FROM lists WHERE list_id = ? ORDER BY date DESC LIMIT 1", (list_id,)
            ).fetchone()
    if not row:
        return []
    return json.loads(row["rows"])


# ---- briefs ----

def save_brief(date, slug, title, summary, body_html, data, source, published_at):
    with connect() as conn:
        conn.execute(
            "INSERT INTO briefs (date, slug, title, summary, body_html, data, source, published_at) "
            "VALUES (?,?,?,?,?,?,?,?) "
            "ON CONFLICT(date) DO UPDATE SET slug=excluded.slug, title=excluded.title, "
            "summary=excluded.summary, body_html=excluded.body_html, data=excluded.data, "
            "source=excluded.source, published_at=excluded.published_at",
            (date, slug, title, summary, body_html, json.dumps(data), source, published_at),
        )


def get_brief(date):
    with connect() as conn:
        row = conn.execute("SELECT * FROM briefs WHERE date = ?", (date,)).fetchone()
    return _brief_row_to_dict(row)


def list_briefs(limit=30, offset=0):
    with connect() as conn:
        rows = conn.execute(
            "SELECT * FROM briefs ORDER BY date DESC LIMIT ? OFFSET ?", (limit, offset)
        ).fetchall()
    return [_brief_row_to_dict(r) for r in rows]


def _brief_row_to_dict(row):
    if not row:
        return None
    d = dict(row)
    d["data"] = json.loads(d["data"]) if d.get("data") else {}
    return d


# ---- poll ----

def record_vote(date, voter, choice, created_at):
    with connect() as conn:
        conn.execute(
            "INSERT OR IGNORE INTO poll_votes (date, voter, choice, created_at) VALUES (?,?,?,?)",
            (date, voter, choice, created_at),
        )


def has_voted(date, voter):
    with connect() as conn:
        row = conn.execute(
            "SELECT 1 FROM poll_votes WHERE date = ? AND voter = ?", (date, voter)
        ).fetchone()
        return row is not None


def vote_counts(date):
    with connect() as conn:
        rows = conn.execute(
            "SELECT choice, COUNT(*) AS n FROM poll_votes WHERE date = ? GROUP BY choice", (date,)
        ).fetchall()
    counts = {"up": 0, "flat": 0, "down": 0}
    for r in rows:
        counts[r["choice"]] = r["n"]
    return counts


def save_poll_result(date, up, flat, down, actual=None, crowd_correct=None):
    with connect() as conn:
        conn.execute(
            "INSERT INTO poll_results (date, up, flat, down, actual, crowd_correct) VALUES (?,?,?,?,?,?) "
            "ON CONFLICT(date) DO UPDATE SET up=excluded.up, flat=excluded.flat, down=excluded.down, "
            "actual=excluded.actual, crowd_correct=excluded.crowd_correct",
            (date, up, flat, down, actual, crowd_correct),
        )


def recent_poll_accuracy(days=30):
    with connect() as conn:
        rows = conn.execute(
            "SELECT crowd_correct FROM poll_results WHERE crowd_correct IS NOT NULL "
            "ORDER BY date DESC LIMIT ?",
            (days,),
        ).fetchall()
    if not rows:
        return None
    correct = sum(1 for r in rows if r["crowd_correct"])
    return round(100 * correct / len(rows))


# ---- meta ----

def set_meta(key, value):
    with connect() as conn:
        conn.execute(
            "INSERT INTO meta (key, value) VALUES (?,?) "
            "ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            (key, json.dumps(value)),
        )


def get_meta(key, default=None):
    with connect() as conn:
        row = conn.execute("SELECT value FROM meta WHERE key = ?", (key,)).fetchone()
    if not row:
        return default
    return json.loads(row["value"])
