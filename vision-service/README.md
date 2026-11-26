# HSE vision service

Runs person and safety-gear detection and tracking for **Cameras**: on uploaded videos, and on live camera streams
(see [Live cameras](#live-cameras)). For an upload, the web app saves the file, sends it here, and polls the job until it
finishes. This service does pipeline steps 1–4:

1. **Video**: converts the clip to 1280×720, 25 fps, H.264, and makes a poster and an evidence-thumbnail sheet
2. **Frames**: counts the frames to check
3. **Detect**: finds people in each frame (YOLO), and helmets, vests, gloves and masks 2.5 times a second (PPE model)
4. **Track**: gives each person a temporary number across frames (ByteTrack)

When a job ends, the service calls the web app back (`callback_url`). The app then reads the result, runs the rules
(restricted areas, safety gear) and stores the events, even if nobody has the page open.

## Safety-gear model

[safetyvision-yolov8 v2](https://huggingface.co/ayushgupta7777/safetyvision-yolov8) (YOLOv8s, 13 classes, test mAP@0.5 0.75).
It downloads on the first job to `models/ppe.onnx` (45 MB) from a pinned revision and is checked against a fixed SHA-256.
The ONNX file is used, not `best.pt`: a .pt file is a Python pickle and can run code when loaded.

How a verdict is made: each gear box is given to the tracked person it sits on, and each person needs at least 3 finds
for an item before anything is said. Worn and not-worn finds are weighed by confidence. With too few finds there is no
verdict, so the web app raises no event rather than guessing. If the model cannot be downloaded, videos are still
analysed for people and restricted areas, and the web app says gear was not checked.

Tested on the three sample clips:
- **Masks**: found reliably.
- **Wool caps and hairnets**: often called helmets (false "helmet worn").
- **Thin white work gloves**: not found.
- **Hairnets**: no class at all.
- **No-vest and mask**: the model card lists these as its weakest classes.

Every gear result is a "possible missing gear" event for a person to review, but before relying on it, test on real
footage from the site and fine-tune on labelled site footage if needed (see `HSE_Camera_Module_Docs/02_MODELS_AND_DATASETS.md`).

## Live cameras

Give a camera a **Live stream address** in Camera setup and save. The web app asks this service to analyse that stream:

- A reader keeps only the newest frame, so analysis never falls behind the camera.
- About 3 frames a second are checked for people (tracked across frames) and gear once a second.
- The annotated picture is shown on the Cameras → Live tab.
- Every 30 s (`VISION_SEGMENT_SECONDS`) the footage so far becomes a clip. The web app imports it, runs the rules, and
  **keeps it only if it produced events**: those clips are the evidence. Quiet clips and clips with nobody in them are
  deleted, so disk use stays small.
- Clips are timed by the real clock, so they play at true speed however many frames a second the machine manages.
  The Live tab shows the rate actually reached.
- Running streams are saved to `streams.json` and restart with the service; a lost connection is retried every 5 s.
  The file can hold camera passwords, so it is git-ignored. Keep it on the analysis machine only.

Addresses it accepts:

| Source | Address |
|---|---|
| CCTV / IP camera or recorder | `rtsp://user:password@192.168.1.20:554/stream1` (exact path from the camera or the site's IT) |
| Phone running an IP camera app (e.g. "IP Webcam" on Android) | `http://192.168.1.5:8080/video` (phone on the same Wi-Fi) |
| Webcam on the analysis machine | `0` (first webcam), `1` (second) |

**Speed:** on a laptop CPU, one camera gets about 2–3 frames a second; two cameras share it (about 1.4 each). For more
than one or two cameras, use a machine with an NVIDIA GPU.

### Trying it without a camera

`fake_camera.py` plays a video in a loop as an MJPEG stream, like an IP camera:

```bash
python fake_camera.py ../web/public/camera/aisle-b.mp4      # serves http://127.0.0.1:8090/video
```

Then in Camera setup pick **Dock 1 aisle**, enter `http://127.0.0.1:8090/video`, select **Test connection**, then
**Save camera**. Open Cameras → Live: the picture appears with person boxes within a few seconds, and forklift-lane
entries are saved as events about every 30 s. Clear the address and save to stop.

To test real RTSP instead, run [MediaMTX](https://github.com/bluenviron/mediamtx) (an RTSP server) and publish a clip
to it with ffmpeg: `ffmpeg -re -stream_loop -1 -i clip.mp4 -c copy -f rtsp rtsp://127.0.0.1:8554/cam`.

## Requirements

- Python 3.12
- `ffmpeg` on the PATH
- About 2 GB of disk for PyTorch (CPU build)

## Set up and run

```bash
cd vision-service
python -m venv .venv
.venv\Scripts\activate            # macOS/Linux: source .venv/bin/activate
pip install torch==2.15.0 torchvision==0.29.2 --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt
uvicorn app:app --host 127.0.0.1 --port 8001
```

The model weights (`yolo11s.pt`, about 20 MB, and the gear model, 45 MB) download on the first job. Check it is up with
`http://127.0.0.1:8001/health`.

## Settings

| Variable | Default | Where |
|---|---|---|
| `VISION_MODEL` | `yolo11s.pt` | this service. `yolo11m.pt` is more accurate and about 2× slower on CPU |
| `VISION_PPE_MODEL` | `models/ppe.onnx` | this service: where the gear model is kept |
| `VISION_SEGMENT_SECONDS` | `30` | this service: length of each live clip |
| `VISION_STREAMS_FILE` | `streams.json` | this service: where running live streams are saved |
| `VISION_SERVICE_URL` | `http://127.0.0.1:8001` | the web app, if the service runs elsewhere |
| `CAMERA_APP_URL` | the address the upload came in on | the web app: where this service can reach it for the callback, if different |
| `CAMERA_DATA_DIR` | `web/data` | the web app: database and uploads. Both processes must see the same paths |

## Limits

- Clips up to 2 minutes and 300 MB (set in `web/lib/camera/constants.ts`).
- One job at a time; further uploads wait in a queue.
- Jobs are kept in memory. If the service restarts, a video that was processing is marked failed and can be uploaded again.

## Licence

Ultralytics YOLO and the safetyvision gear model are both AGPL-3.0. Check the licence terms with the company before using it in a commercial product.
