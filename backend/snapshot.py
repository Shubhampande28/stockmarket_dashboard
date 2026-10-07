"""The cached /stocks payload: an in-memory copy plus a JSON file on disk so a
restart doesn't lose the last good snapshot. Built by the `snapshot`/`eod`
jobs (backend/jobs.py) via app.build_snapshot_payload -- never computed inside
a request.

Resilience rule (brief): the site always serves the last good snapshot. A
snapshot more than STALE_AFTER_SECONDS old gets a "last updated" note instead
of being thrown away.
"""
import json
import time

from config import SNAPSHOT_JSON_PATH

STALE_AFTER_SECONDS = 20 * 60  # ~20 min with no fresh snapshot counts as stale

_memory_cache = None


def save_snapshot(payload):
    global _memory_cache
    wrapped = {"payload": payload, "computed_at": time.time()}
    _memory_cache = wrapped
    SNAPSHOT_JSON_PATH.parent.mkdir(parents=True, exist_ok=True)
    SNAPSHOT_JSON_PATH.write_text(json.dumps(wrapped))
    return wrapped


def _load_from_disk():
    if not SNAPSHOT_JSON_PATH.exists():
        return None
    try:
        return json.loads(SNAPSHOT_JSON_PATH.read_text())
    except (json.JSONDecodeError, OSError):
        return None


def get_cached_snapshot():
    """Returns the payload dict (with a `_meta` staleness note added), or None
    if no snapshot has ever been computed."""
    global _memory_cache
    wrapped = _memory_cache or _load_from_disk()
    if wrapped is None:
        return None
    _memory_cache = wrapped

    age_seconds = time.time() - wrapped["computed_at"]
    payload = dict(wrapped["payload"])
    payload["_meta"] = {
        "computedAt": wrapped["computed_at"],
        "stale": age_seconds > STALE_AFTER_SECONDS,
        "ageSeconds": round(age_seconds),
    }
    return payload


def computed_at():
    wrapped = _memory_cache or _load_from_disk()
    return wrapped["computed_at"] if wrapped else None
