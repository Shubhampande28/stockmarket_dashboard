"""In-process APScheduler, guarded by a file lock so only one gunicorn worker
runs the jobs. Jobs themselves live in jobs.py (lazy-imported there to avoid
a circular import with app.py); this module only wires up timing.
"""
import logging
from contextlib import contextmanager

try:
    import fcntl  # Linux/macOS -- the deployment target (DEPLOY_HOSTINGER.md)
except ImportError:
    fcntl = None  # Windows dev box: fall back to an in-process lock below

import threading

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

import config
from config import SCHEDULER_LOCK_PATH

IST = "Asia/Kolkata"

config.setup_logging()
logger = logging.getLogger("equilytics.scheduler")
_scheduler = None
_dev_lock = threading.Lock()


@contextmanager
def _worker_lock():
    if fcntl is None:
        # No cross-process guarantee on Windows, but gunicorn (multi-worker)
        # only runs on the Linux deploy target anyway -- this just keeps
        # local `python app.py` dev runs on Windows from double-firing jobs
        # within the same process.
        acquired = _dev_lock.acquire(blocking=False)
        try:
            yield acquired
        finally:
            if acquired:
                _dev_lock.release()
        return

    SCHEDULER_LOCK_PATH.parent.mkdir(parents=True, exist_ok=True)
    fh = open(SCHEDULER_LOCK_PATH, "w")
    try:
        fcntl.flock(fh, fcntl.LOCK_EX | fcntl.LOCK_NB)
        yield True
    except BlockingIOError:
        yield False
    finally:
        fh.close()


def _run_locked(job_name, fn):
    with _worker_lock() as acquired:
        if not acquired:
            return  # another gunicorn worker already owns the lock/job
        try:
            fn()
        except Exception:
            logger.exception("Scheduled job %s failed", job_name)
            _record_failure(job_name)


def _record_failure(job_name):
    try:
        import store
        store.set_meta(f"job_failed:{job_name}", {"failed": True})
    except Exception:
        logger.exception("Could not record job failure for %s", job_name)


def start_scheduler():
    """Idempotent: safe to call from every gunicorn worker at startup."""
    global _scheduler
    if _scheduler is not None:
        return _scheduler

    import jobs  # deferred import: jobs.py imports app.py lazily inside each fn

    sched = BackgroundScheduler(timezone=IST)
    weekday = "mon-fri"

    # CronTrigger does NOT inherit the scheduler's default timezone -- it
    # defaults to UTC unless given its own `timezone=` explicitly. Without
    # this, every job below silently runs ~5h30m off from IST market hours
    # (caught live: nothing fired for 25+ minutes during market hours on the
    # production server -- see docs/REVAMP_NOTES.md).
    sched.add_job(
        lambda: _run_locked("snapshot", jobs.run_snapshot),
        CronTrigger(day_of_week=weekday, hour="9-15", minute="*/2", timezone=IST),
        id="snapshot",
    )
    sched.add_job(
        lambda: _run_locked("eod", jobs.run_eod),
        CronTrigger(day_of_week=weekday, hour=15, minute=45, timezone=IST),
        id="eod",
    )
    for hour, minute in ((18, 30), (19, 30), (21, 0)):
        sched.add_job(
            lambda: _run_locked("fii", jobs.run_fii),
            CronTrigger(day_of_week=weekday, hour=hour, minute=minute, timezone=IST),
            id=f"fii_{hour}{minute}",
        )
    sched.add_job(
        lambda: _run_locked("brief", jobs.run_brief),
        CronTrigger(day_of_week=weekday, hour=21, minute=15, timezone=IST),
        id="brief",
    )
    sched.add_job(
        lambda: _run_locked("premarket", jobs.run_premarket),
        CronTrigger(day_of_week=weekday, hour=8, minute=45, timezone=IST),
        id="premarket",
    )

    sched.start()
    _scheduler = sched
    return sched
