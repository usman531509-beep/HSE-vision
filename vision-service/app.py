"""HSE vision service: runs person and safety-gear detection and tracking for the web app, on uploaded videos
(/jobs) and on live camera streams (/streams).

Run:  uvicorn app:app --host 127.0.0.1 --port 8001
The web app (web/lib/server/analysis.ts and live.ts) starts jobs and streams here and reads their progress.
"""
from __future__ import annotations

import logging
import os
import queue
import re
import threading
import time
import urllib.request
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

import live
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
    # The web app's "job ended" address. The call carries no data; the app reads the result from /jobs itself.
    callback_url: str | None = Field(default=None, pattern=r"^https?://")


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
            _notify(job)
            work.task_done()


def _notify(job: JobIn) -> None:
    """Tells the web app the job ended, so it creates the events without waiting for someone to open the page.
    A failed call is only logged: the page still picks the result up when it next checks the status."""
    if not job.callback_url:
        return
    try:
        urllib.request.urlopen(urllib.request.Request(job.callback_url, data=b"", method="POST"), timeout=10).close()
    except Exception as err:
        log.warning("job %s: could not notify the web app at %s: %s", job.video_id, job.callback_url, err)


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


# ---------- live streams ----------
CAMERA_ID = r"^[A-Za-z0-9 _-]{1,40}$"
streams = live.Streams(Path(os.environ.get("VISION_STREAMS_FILE", Path(__file__).parent / "streams.json")))
streams.resume()


class StreamIn(BaseModel):
    url: str = Field(pattern=live.URL_PATTERN.pattern, max_length=500)
    out_root: str
    callback_url: str = Field(pattern=r"^https?://")
    sprite: SpriteIn


class TestIn(BaseModel):
    url: str = Field(max_length=500)


@app.post("/streams/test")
def test_stream(body: TestIn) -> dict:
    try:
        return live.test(body.url)
    except live.StreamError as err:
        raise HTTPException(400, str(err)) from None


@app.put("/streams/{camera_id}")
def put_stream(camera_id: str, body: StreamIn) -> dict:
    if not re.match(CAMERA_ID, camera_id):
        raise HTTPException(400, "Unsupported camera id.")
    streams.put(live.StreamConfig(camera_id=camera_id, url=body.url, out_root=body.out_root,
                                  callback_url=body.callback_url, sprite=body.sprite.model_dump()))
    return {"ok": True}


@app.delete("/streams/{camera_id}", status_code=204)
def delete_stream(camera_id: str) -> None:
    streams.delete(camera_id)


@app.get("/streams/{camera_id}")
def stream_status(camera_id: str) -> dict:
    stream = streams.get(camera_id)
    if stream is None:
        raise HTTPException(404, "Live analysis is not running for this camera.")
    return stream.status.__dict__


@app.get("/streams/{camera_id}/live.mjpg")
def live_view(camera_id: str) -> StreamingResponse:
    stream = streams.get(camera_id)
    if stream is None:
        raise HTTPException(404, "Live analysis is not running for this camera.")

    def frames():
        last = None
        while streams.get(camera_id) is stream and stream.status.state != "stopped":
            jpg = stream.latest_jpeg
            if jpg is not None and jpg is not last:
                last = jpg
                yield b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + jpg + b"\r\n"
            time.sleep(1 / live.LIVE_FPS)

    return StreamingResponse(frames(), media_type="multipart/x-mixed-replace; boundary=frame")
