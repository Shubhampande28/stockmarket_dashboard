"""Regression test for a real bug caught live in production: APScheduler's
CronTrigger does not inherit the scheduler's default timezone, so every job
must pass timezone= explicitly or it silently runs against UTC instead of
IST. See docs/REVAMP_NOTES.md ("Post-deploy -- scheduler silently running
on UTC, not IST")."""
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

import scheduler


def test_every_scheduled_job_trigger_is_ist(monkeypatch):
    monkeypatch.setenv("EQUILYTICS_SAMPLE_DATA", "1")
    monkeypatch.setitem(sys.modules, "jobs", type(sys)("jobs"))
    for name in ("run_snapshot", "run_eod", "run_fii", "run_brief", "run_premarket"):
        setattr(sys.modules["jobs"], name, lambda: None)

    scheduler._scheduler = None  # force a fresh build even if a prior test started one
    sched = scheduler.start_scheduler()
    try:
        jobs = sched.get_jobs()
        assert jobs, "expected at least one scheduled job"
        for job in jobs:
            assert str(job.trigger.timezone) == scheduler.IST, (
                f"job {job.id!r} trigger timezone is {job.trigger.timezone}, expected {scheduler.IST}"
            )
    finally:
        sched.shutdown(wait=False)
        scheduler._scheduler = None
