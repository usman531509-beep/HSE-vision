"""HSE vision service: runs person and safety-gear detection and tracking on uploaded videos for the web app.

Run:  uvicorn app:app --host 127.0.0.1 --port 8001
The web app (web/lib/server/analysis.ts) starts jobs here and polls their progress.
"""
from __future__ import annotations

import logging
import queue
import threading
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

import pipeline

log = logging.getLogger("vision")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")


class SpriteIn(BaseModel):
    step: float = Field(gt=0)
    cols: int = Field(gt=0)
    w: int = Field(gt=0)
    h: int = Field(gt=0)


class JobIn(BaseModel):
    video_id: str = Field(pattern=r"^[A-Za-z0-9_-]{1,64}$")
    source: str
    out_dir: str
    sprite: SpriteIn
    max_seconds: float = Field(gt=0)


class JobOut(BaseModel):
    state: Literal["queued", "running", "done", "failed"]
    step: int = 0
    percent: float = 0.0
    error: str | None = None
    result: dict | None = None


app = FastAPI(title="HSE vision service")
jobs: dict[str, JobOut] = {}
work: "queue.Queue[JobIn]" = queue.Queue()
lock = threading.Lock()


def _update(video_id: str, **changes) -> None:
    with lock:
        jobs[video_id] = jobs[video_id].model_copy(update=changes)


def _worker() -> None:
    # One job at a time: detection uses every CPU core, so parallel jobs would only slow each other down.
    while True:
        job = work.get()
        _update(job.video_id, state="running")
        progress = pipeline.Progress(on_change=lambda p, vid=job.video_id: _update(vid, step=p.step, percent=round(p.percent, 1)))
        try:
            result = pipeline.run(Path(job.source), Path(job.out_dir), pipeline.Sprite(**job.sprite.model_dump()), job.max_seconds, progress)
            _update(job.video_id, state="done", step=4, percent=100.0, result=result)
            log.info("job %s done", job.video_id)
        except pipeline.JobError as err:
            _update(job.video_id, state="failed", error=str(err))
            log.warning("job %s failed: %s", job.video_id, err)
        except Exception:
            log.exception("job %s crashed", job.video_id)
            _update(job.video_id, state="failed", error="Analysis failed on the server. Check the vision service log.")
        finally:
            work.task_done()


threading.Thread(target=_worker, daemon=True, name="vision-worker").start()


@app.get("/health")
def health() -> dict:
    return {"ok": True, "model": pipeline.MODEL, "gear_model": pipeline.ppe.MODEL_PATH.is_file(), "queued": work.qsize()}


@app.post("/jobs", status_code=202)
def start(job: JobIn) -> JobOut:
    if not Path(job.source).is_file():
        raise HTTPException(400, "Source file not found.")
    with lock:
        if job.video_id in jobs and jobs[job.video_id].state in ("queued", "running"):
            raise HTTPException(409, "This video is already being analysed.")
        jobs[job.video_id] = JobOut(state="queued")
    work.put(job)
    return jobs[job.video_id]


@app.get("/jobs/{video_id}")
def status(video_id: str) -> JobOut:
    with lock:
        job = jobs.get(video_id)
    if job is None:
        raise HTTPException(404, "No such job. The service may have restarted.")
    return job
