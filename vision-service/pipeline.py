"""Pipeline steps 1-4 for one uploaded video: normalise the clip, count frames, detect people and their
safety gear, track them.

Writes into out_dir:  video.mp4 (1280x720, H.264, 25 fps)  poster.jpg  sprite.jpg
Returns the tracks and gear verdicts the web app's rules engine turns into events.
"""
from __future__ import annotations

import json
import math
import os
import shutil
import subprocess
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path
from threading import Lock
from typing import Callable

import cv2

import ppe

FRAME_W, FRAME_H, FPS = 1280, 720, 25
KEEP_EVERY = 2          # store every 2nd frame; the web player blends between samples
MIN_SAMPLES = 8         # a track seen in fewer samples is flicker, not a person
MIN_TRACK_CONF = 0.5    # weaker tracks are dropped
MODEL = os.environ.get("VISION_MODEL", "yolo11s.pt")


class JobError(Exception):
    """A failure the user should read, e.g. an unreadable file or a clip that is too long."""


@dataclass
class Sprite:
    step: float
    cols: int
    w: int
    h: int


@dataclass
class Progress:
    step: int = 0
    percent: float = 0.0
    on_change: Callable[["Progress"], None] = field(default=lambda p: None, repr=False)

    def done(self, step: int) -> None:
        self.step, self.percent = step, 0.0
        self.on_change(self)


_models: dict = {}
_model_lock = Lock()


def _yolo():
    """Load the person detector once; it is reused for every job."""
    with _model_lock:
        if "person" not in _models:
            from ultralytics import YOLO  # imported late so the API starts fast

            _models["person"] = YOLO(MODEL)
        return _models["person"]


def _gear_model():
    """The safety-gear detector, or None when it is unavailable. A failed load is retried on the next job."""
    with _model_lock:
        if _models.get("gear") is None:
            _models["gear"] = ppe.load()
        return _models["gear"]


def _ffmpeg(*args: str) -> None:
    if not shutil.which("ffmpeg"):
        raise JobError("ffmpeg is not installed on the analysis server.")
    res = subprocess.run(["ffmpeg", "-v", "error", "-y", *args], capture_output=True, text=True)
    if res.returncode != 0:
        raise JobError(f"The video could not be converted: {res.stderr.strip()[:300] or 'ffmpeg failed'}")


def _probe_seconds(path: Path) -> float:
    cap = cv2.VideoCapture(str(path))
    if not cap.isOpened():
        raise JobError("This file could not be opened as a video.")
    fps = cap.get(cv2.CAP_PROP_FPS) or 0
    frames = cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0
    cap.release()
    if fps <= 0 or frames <= 0:
        raise JobError("This video has no readable frames.")
    return frames / fps


def normalise(source: Path, out: Path, sprite: Sprite, max_seconds: float) -> float:
    """Step 1: one size, one frame rate, browser-friendly codec, plus poster and evidence sprite."""
    seconds = _probe_seconds(source)
    if seconds > max_seconds:
        raise JobError(f"This video is {seconds:.0f} s long. The limit is {max_seconds:.0f} s.")
    video = out / "video.mp4"
    # Letterbox into 1280x720 so boxes and drawn areas share one coordinate space with every other clip.
    fit = f"scale={FRAME_W}:{FRAME_H}:force_original_aspect_ratio=decrease,pad={FRAME_W}:{FRAME_H}:(ow-iw)/2:(oh-ih)/2,fps={FPS}"
    _ffmpeg("-i", str(source), "-an", "-vf", fit, "-c:v", "libx264", "-preset", "veryfast", "-crf", "26",
            "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(video))
    seconds = _probe_seconds(video)
    _ffmpeg("-ss", f"{min(1.0, seconds / 2):.2f}", "-i", str(video), "-frames:v", "1", "-q:v", "4", str(out / "poster.jpg"))
    rows = max(1, math.ceil(math.ceil(seconds / sprite.step) / sprite.cols))
    _ffmpeg("-i", str(video), "-vf", f"fps=1/{sprite.step},scale={sprite.w}:{sprite.h},tile={sprite.cols}x{rows}",
            "-frames:v", "1", "-q:v", "5", str(out / "sprite.jpg"))
    return seconds


def count_frames(video: Path) -> int:
    """Step 2: how many frames the detector will see."""
    cap = cv2.VideoCapture(str(video))
    n = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    cap.release()
    if n <= 0:
        raise JobError("The converted video has no frames.")
    return n


def detect_and_track(video: Path, total_frames: int, progress: Progress, gear: ppe.GearVotes | None) -> list:
    """Steps 3-4: person boxes per frame with ByteTrack IDs, plus gear finds on those people.
    Returns [[seconds, [[id, x, y, w, h, conf], ...]], ...]."""
    # Gear is checked on kept frames only, so the boxes it is matched against are the stored ones.
    assert ppe.EVERY % KEEP_EVERY == 0
    results = _yolo().track(source=str(video), classes=[0], conf=0.35, iou=0.5, tracker="bytetrack.yaml",
                            stream=True, verbose=False, persist=False)
    raw = []
    for i, r in enumerate(results):
        if i % 25 == 0:
            progress.percent = min(99.0, 100.0 * i / total_frames)
            progress.on_change(progress)
        if i % KEEP_EVERY:
            continue
        boxes = []
        if r.boxes is not None and r.boxes.id is not None:
            for (x1, y1, x2, y2), tid, c in zip(r.boxes.xyxy.tolist(), r.boxes.id.int().tolist(), r.boxes.conf.tolist()):
                boxes.append([tid, round(x1), round(y1), round(x2 - x1), round(y2 - y1), round(c, 2)])
        if gear and i % ppe.EVERY == 0:
            gear.observe(r.orig_img, boxes)
        raw.append([round(i / FPS, 2), boxes])
    return raw


def clean_tracks(raw: list) -> tuple[list, dict[int, int]]:
    """Drop flicker and weak tracks, then number people 1, 2, 3… in order of first appearance.
    Returns the cleaned frames and the tracker-id -> person-number map."""
    confs: dict[int, list[float]] = defaultdict(list)
    for _, boxes in raw:
        for b in boxes:
            confs[b[0]].append(b[5])
    keep = {tid for tid, c in confs.items() if len(c) >= MIN_SAMPLES and sum(c) / len(c) >= MIN_TRACK_CONF}
    order: list[int] = []
    for _, boxes in raw:
        for b in boxes:
            if b[0] in keep and b[0] not in order:
                order.append(b[0])
    renumber = {old: n + 1 for n, old in enumerate(order)}
    return [[t, sorted([renumber[b[0]], *b[1:]] for b in boxes if b[0] in renumber)] for t, boxes in raw], renumber


def run(source: Path, out: Path, sprite: Sprite, max_seconds: float, progress: Progress) -> dict:
    out.mkdir(parents=True, exist_ok=True)
    seconds = normalise(source, out, sprite, max_seconds)
    progress.done(1)
    total = count_frames(out / "video.mp4")
    progress.done(2)
    gear_model = _gear_model()
    votes = ppe.GearVotes(gear_model) if gear_model else None
    raw = detect_and_track(out / "video.mp4", total, progress, votes)
    progress.done(3)
    frames, renumber = clean_tracks(raw)
    tracks = {"fps": FPS / KEEP_EVERY, "w": FRAME_W, "h": FRAME_H, "frames": frames}
    gear = {"checked": ppe.CHECKED, "sightings": votes.results(renumber)} if votes else {"checked": [], "sightings": []}
    result = {"duration_s": round(seconds, 2), "fps": FPS, "tracks": tracks, "gear": gear}
    (out / "result.json").write_text(json.dumps(result, separators=(",", ":")), encoding="utf-8")
    progress.done(4)
    return result
