"""Safety-gear step: finds gear in sampled frames, gives each find to the tracked person it sits on,
and votes per person whether each item is worn.

Model: safetyvision-yolov8 v2 (YOLOv8s, AGPL-3.0), ONNX export. ONNX is used rather than the .pt file because
a .pt file is a Python pickle and can run code when loaded; ONNX is data only.
"""
from __future__ import annotations

import hashlib
import logging
import os
import urllib.request
from collections import defaultdict
from pathlib import Path

log = logging.getLogger("vision")

# Pinned to one revision and checked by hash, so a changed upload on the model page cannot slip in.
MODEL_URL = ("https://huggingface.co/ayushgupta7777/safetyvision-yolov8/resolve/"
             "56a71758b55f0e9f2b4b2d6b51a779a1f882da10/v2/best_640.onnx")
MODEL_SHA256 = "ea18ae903a566e8fa76f3ee1c503075522dca269269315e9c862efa170430b35"
MODEL_PATH = Path(os.environ.get("VISION_PPE_MODEL", Path(__file__).parent / "models" / "ppe.onnx"))

# Model class -> (gear name used by the web app, worn?). Classes not listed (goggles, harness, falls) are ignored.
CLASSES = {
    "Hardhat": ("helmet", True), "NO-Hardhat": ("helmet", False),
    "Safety Vest": ("vest", True), "NO-Safety Vest": ("vest", False),
    "Gloves": ("gloves", True), "NO-Gloves": ("gloves", False),
    "Mask": ("mask", True), "NO-Mask": ("mask", False),
}
CHECKED = sorted({gear for gear, _ in CLASSES.values()})

EVERY = 10          # check gear on every 10th frame (2.5 times a second at 25 fps)
CONF = 0.35
MIN_VOTES = 3       # fewer finds than this is too little to say anything about a person
PAD = 0.1           # widen person boxes a little: a helmet often sticks out above the box


def _download() -> None:
    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    tmp = MODEL_PATH.with_suffix(".part")
    log.info("downloading safety-gear model to %s", MODEL_PATH)
    urllib.request.urlretrieve(MODEL_URL, tmp)
    digest = hashlib.sha256(tmp.read_bytes()).hexdigest()
    if digest != MODEL_SHA256:
        tmp.unlink(missing_ok=True)
        raise RuntimeError(f"safety-gear model hash mismatch ({digest})")
    tmp.replace(MODEL_PATH)


def load():
    """The gear detector, downloaded on first use. None when it cannot be had, so analysis goes on without gear."""
    try:
        if not MODEL_PATH.is_file():
            _download()
        from ultralytics import YOLO

        return YOLO(str(MODEL_PATH), task="detect")
    except Exception:
        log.exception("safety-gear model unavailable; videos will be analysed without gear checks")
        return None


def _owner(cx: float, cy: float, people: list) -> int | None:
    """Tracker id of the smallest person box containing the point, or None."""
    best, best_area = None, float("inf")
    for tid, x, y, w, h, _ in people:
        px, py = w * PAD, h * PAD
        if x - px <= cx <= x + w + px and y - py <= cy <= y + h + py and w * h < best_area:
            best, best_area = tid, w * h
    return best


class GearVotes:
    """Collects worn / not-worn finds per tracked person and gear item."""

    def __init__(self, model) -> None:
        self.model = model
        self.votes: dict[tuple[int, str], list[tuple[bool, float]]] = defaultdict(list)

    def observe(self, frame, people: list) -> None:
        if not people:
            return
        r = self.model.predict(frame, conf=CONF, verbose=False)[0]
        for (x1, y1, x2, y2), cls, conf in zip(r.boxes.xyxy.tolist(), r.boxes.cls.int().tolist(), r.boxes.conf.tolist()):
            mapped = CLASSES.get(self.model.names[cls])
            if not mapped:
                continue
            tid = _owner((x1 + x2) / 2, (y1 + y2) / 2, people)
            if tid is not None:
                self.votes[(tid, mapped[0])].append((mapped[1], conf))

    def results(self, renumber: dict[int, int]) -> list[dict]:
        """One verdict per person and gear item with enough finds, using the web app's person numbers."""
        out = []
        for (tid, gear), finds in self.votes.items():
            if tid not in renumber or len(finds) < MIN_VOTES:
                continue
            worn = [c for seen, c in finds if seen]
            missing = [c for seen, c in finds if not seen]
            # Weighted by confidence, so a few strong finds outvote many faint ones.
            seen = sum(worn) >= sum(missing)
            side = worn if seen else missing
            out.append({"trackId": renumber[tid], "gear": gear, "seen": seen, "confidence": round(sum(side) / len(side), 2)})
        return sorted(out, key=lambda s: (s["trackId"], s["gear"]))
