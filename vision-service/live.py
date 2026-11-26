"""Live analysis of camera streams.

For each camera: a reader thread keeps only the newest frame (so analysis never falls behind the camera), and an
analysis thread checks LIVE_FPS frames a second for people, tracks them, checks gear once a second and keeps an
annotated picture for the live view. Every SEGMENT_S seconds the frames so far become a clip in the same shape as
an analysed upload (video.mp4, poster, sprite, result.json), and the web app is called back to import it.
"""
from __future__ import annotations

import json
import logging
import os
import re
import shutil
import subprocess
import threading
import time
import urllib.request
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

import cv2

import pipeline
import ppe

log = logging.getLogger("vision")

LIVE_FPS = 3            # frames analysed per second; a laptop CPU keeps up with one camera at this rate
GEAR_EVERY = LIVE_FPS   # gear once a second
SEGMENT_S = float(os.environ.get("VISION_SEGMENT_SECONDS", "30"))
STALL_S = 10            # no new frame for this long means the camera stopped sending
RETRY_S = 5
OPEN_TIMEOUT_MS = 8000
URL_PATTERN = re.compile(r"^(rtsps?|https?)://\S+$|^\d$")


class StreamError(Exception):
    """A problem with the camera connection, worded for the person setting the camera up."""


def open_capture(url: str) -> cv2.VideoCapture:
    """Opens a stream address, or a webcam when the address is a single digit (0 = the first webcam)."""
    if not URL_PATTERN.match(url):
        raise StreamError("Use an address starting with rtsp:// or http://, or a webcam number such as 0.")
    if url.isdigit():
        cap = cv2.VideoCapture(int(url))
    else:
        cap = cv2.VideoCapture(url, cv2.CAP_FFMPEG,
                               [cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, OPEN_TIMEOUT_MS, cv2.CAP_PROP_READ_TIMEOUT_MSEC, OPEN_TIMEOUT_MS])
    if not cap.isOpened():
        cap.release()
        raise StreamError("Could not connect to the camera. Check the address, the user name and password in it, "
                          "and that the camera is on the same network as the analysis service.")
    return cap


def test(url: str) -> dict:
    """Connects once and reads one frame, for the "Test connection" button."""
    cap = open_capture(url)
    try:
        ok, frame = cap.read()
        if not ok:
            raise StreamError("Connected, but the camera sent no picture. Check the stream address.")
        h, w = frame.shape[:2]
        return {"ok": True, "width": w, "height": h}
    finally:
        cap.release()


def _annotate(frame, boxes: list) -> bytes:
    """The live-view picture: frame with person boxes, as JPEG."""
    view = frame.copy()
    for tid, x, y, w, h, _ in boxes:
        cv2.rectangle(view, (x, y), (x + w, y + h), (119, 200, 53), 2)
        cv2.putText(view, f"person {tid}", (x + 3, y + 16) if y < 20 else (x, y - 6), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (119, 200, 53), 1, cv2.LINE_AA)
    return cv2.imencode(".jpg", view, [cv2.IMWRITE_JPEG_QUALITY, 75])[1].tobytes()


class _Segment:
    """Frames and detections for one clip, written to disk as they arrive."""

    def __init__(self, out_root: Path, gear_model) -> None:
        self.video_id = f"live-{uuid.uuid4().hex[:8]}"
        self.dir = out_root / self.video_id
        self.dir.mkdir(parents=True, exist_ok=True)
        self.started = datetime.now(timezone.utc)
        self.wall_start = time.monotonic()
        self.raw: list = []
        self.votes = ppe.GearVotes(gear_model) if gear_model else None
        # The clip is stored at the usual 25 fps, timed by the real clock: each analysed frame is repeated until the
        # next one arrives. So it plays at true speed however many frames a second this machine manages.
        self.written = 0
        self.last: bytes | None = None
        self.encoder = subprocess.Popen(
            ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{pipeline.FRAME_W}x{pipeline.FRAME_H}",
             "-framerate", str(pipeline.FPS), "-i", "-", "-c:v", "libx264", "-preset", "veryfast",
             "-crf", "26", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(self.dir / "video.mp4")],
            stdin=subprocess.PIPE, stderr=subprocess.PIPE,
        )

    @property
    def seconds(self) -> float:
        return time.monotonic() - self.wall_start

    def _fill_to(self, t: float) -> None:
        """Repeats the last analysed frame up to clip time t (at least once, so no analysed frame is lost)."""
        if self.last is None:
            return
        due = max(round(t * pipeline.FPS), self.written + 1)
        while self.written < due:
            self.encoder.stdin.write(self.last)
            self.written += 1

    def add(self, frame, boxes: list) -> None:
        t = self.seconds
        if self.votes and len(self.raw) % GEAR_EVERY == 0:
            self.votes.observe(frame, boxes)
        self._fill_to(t)
        self.raw.append([round(t, 2), boxes])
        self.last = frame.tobytes()

    def finish(self, sprite: pipeline.Sprite) -> dict | None:
        """Closes the clip. Returns its result, or None (and removes it) when nobody was seen."""
        seconds = self.seconds
        self._fill_to(seconds)
        self.encoder.stdin.close()
        if self.encoder.wait() != 0:
            raise RuntimeError(f"clip encoding failed: {self.encoder.stderr.read().decode()[:300]}")
        frames, renumber = pipeline.clean_tracks(self.raw)
        if not renumber:
            shutil.rmtree(self.dir, ignore_errors=True)
            return None
        pipeline.thumbnails(self.dir / "video.mp4", self.dir, sprite, seconds)
        result = {
            "duration_s": round(seconds, 2), "fps": pipeline.FPS, "recorded_at": self.started.isoformat(),
            # Samples per second actually achieved; the rules use it to turn confirmation time into samples.
            "tracks": {"fps": round(len(self.raw) / seconds, 2), "w": pipeline.FRAME_W, "h": pipeline.FRAME_H, "frames": frames},
            "gear": {"checked": ppe.CHECKED, "sightings": self.votes.results(renumber)} if self.votes else {"checked": [], "sightings": []},
        }
        (self.dir / "result.json").write_text(json.dumps(result, separators=(",", ":")), encoding="utf-8")
        return result

    def discard(self) -> None:
        try:
            self.encoder.stdin.close()
            self.encoder.wait(timeout=10)
        except Exception:
            self.encoder.kill()
        shutil.rmtree(self.dir, ignore_errors=True)


@dataclass
class StreamConfig:
    camera_id: str
    url: str
    out_root: str
    callback_url: str
    sprite: dict


@dataclass
class Status:
    state: str = "connecting"           # connecting | live | error | stopped
    error: str | None = None
    people: int = 0
    fps: float = 0.0                    # frames actually analysed per second; below LIVE_FPS means the machine is too slow
    clips_sent: int = 0
    last_clip_at: str | None = None


class Stream:
    """Runs live analysis for one camera until stopped, reconnecting after failures."""

    def __init__(self, cfg: StreamConfig) -> None:
        self.cfg = cfg
        self.status = Status()
        self.latest_jpeg: bytes | None = None
        self._stop = threading.Event()
        self._frame = None
        self._frame_at = 0.0
        self._thread = threading.Thread(target=self._run, daemon=True, name=f"live-{cfg.camera_id}")

    def start(self) -> None:
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()
        self.status.state = "stopped"

    def _run(self) -> None:
        while not self._stop.is_set():
            try:
                self._session()
            except StreamError as err:
                self.status.state, self.status.error = "error", str(err)
                log.warning("stream %s: %s", self.cfg.camera_id, err)
            except Exception:
                log.exception("stream %s crashed", self.cfg.camera_id)
                self.status.state, self.status.error = "error", "Live analysis failed on the server. Check the vision service log."
            self.status.people = 0
            self._stop.wait(RETRY_S)

    def _read(self, cap: cv2.VideoCapture, done: threading.Event) -> None:
        """Keeps only the newest frame, so analysis always looks at "now"."""
        while not done.is_set():
            ok, frame = cap.read()
            if not ok:
                done.set()
                return
            self._frame, self._frame_at = frame, time.monotonic()

    def _session(self) -> None:
        self.status.state, self.status.error = "connecting", None
        self._frame = None
        cap = open_capture(self.cfg.url)
        done = threading.Event()
        threading.Thread(target=self._read, args=(cap, done), daemon=True).start()
        from ultralytics import YOLO

        person = YOLO(pipeline.MODEL)  # one per stream: the tracker keeps state inside the model
        gear = ppe.load()
        sprite = pipeline.Sprite(**self.cfg.sprite)
        segment = _Segment(Path(self.cfg.out_root), gear)
        self._frame_at = time.monotonic()
        try:
            while not self._stop.is_set():
                tick = time.monotonic()
                if done.is_set() or tick - self._frame_at > STALL_S:
                    raise StreamError("The camera stopped sending pictures. Reconnecting…")
                frame = self._frame
                if frame is None:
                    self._stop.wait(0.1)
                    continue
                frame = pipeline.letterbox(frame)
                r = person.track(frame, classes=[0], conf=0.35, iou=0.5, tracker="bytetrack.yaml", persist=True, verbose=False)[0]
                boxes = []
                if r.boxes is not None and r.boxes.id is not None:
                    for (x1, y1, x2, y2), tid, c in zip(r.boxes.xyxy.tolist(), r.boxes.id.int().tolist(), r.boxes.conf.tolist()):
                        boxes.append([tid, round(x1), round(y1), round(x2 - x1), round(y2 - y1), round(c, 2)])
                segment.add(frame, boxes)
                self.latest_jpeg = _annotate(frame, boxes)
                self.status.state, self.status.people = "live", len(boxes)
                if segment.seconds >= SEGMENT_S:
                    self.status.fps = round(len(segment.raw) / max(0.001, time.monotonic() - segment.wall_start), 1)
                    self._send(segment, sprite)
                    segment = _Segment(Path(self.cfg.out_root), gear)
                self._stop.wait(max(0.0, 1 / LIVE_FPS - (time.monotonic() - tick)))
        finally:
            done.set()
            cap.release()
            segment.discard()

    def _send(self, segment: _Segment, sprite: pipeline.Sprite) -> None:
        """Finishes a clip and tells the web app to import it. A clip with nobody in it is dropped."""
        if segment.finish(sprite) is None:
            return
        try:
            url = f"{self.cfg.callback_url}/{segment.video_id}"
            urllib.request.urlopen(urllib.request.Request(url, data=b"", method="POST"), timeout=30).close()
            self.status.clips_sent += 1
            self.status.last_clip_at = datetime.now(timezone.utc).isoformat()
        except Exception as err:
            log.warning("stream %s: web app did not take clip %s: %s", self.cfg.camera_id, segment.video_id, err)
            shutil.rmtree(segment.dir, ignore_errors=True)


class Streams:
    """All running streams, saved to a file so they come back after a service restart."""

    def __init__(self, state_file: Path) -> None:
        self.file = state_file
        self.lock = threading.Lock()
        self.running: dict[str, Stream] = {}

    def resume(self) -> None:
        if not self.file.is_file():
            return
        configs = [StreamConfig(**raw) for raw in json.loads(self.file.read_text(encoding="utf-8"))]
        # A clip cut short by a crash or restart has no result.json; nothing will ever import it.
        for root in {Path(c.out_root) for c in configs}:
            for unfinished in root.glob("live-*"):
                if not (unfinished / "result.json").is_file():
                    shutil.rmtree(unfinished, ignore_errors=True)
        for cfg in configs:
            self._start(cfg)

    def put(self, cfg: StreamConfig) -> None:
        with self.lock:
            self._remove(cfg.camera_id)
            self._start(cfg)
            self._save()

    def delete(self, camera_id: str) -> bool:
        with self.lock:
            found = self._remove(camera_id)
            self._save()
            return found

    def get(self, camera_id: str) -> Stream | None:
        return self.running.get(camera_id)

    def _start(self, cfg: StreamConfig) -> None:
        stream = Stream(cfg)
        self.running[cfg.camera_id] = stream
        stream.start()

    def _remove(self, camera_id: str) -> bool:
        stream = self.running.pop(camera_id, None)
        if stream:
            stream.stop()
        return stream is not None

    def _save(self) -> None:
        # Stream addresses can hold camera passwords; this file stays on the analysis server and out of git.
        self.file.write_text(json.dumps([s.cfg.__dict__ for s in self.running.values()], indent=1), encoding="utf-8")
