# HSE vision service

Runs person detection and tracking on videos uploaded in **Camera analysis**. The web app saves the upload,
sends it here, and polls the job until it finishes. This service does pipeline steps 1–4:

1. **Video**: converts the clip to 1280×720, 25 fps, H.264, and makes a poster and an evidence-thumbnail sheet
2. **Frames**: counts the frames to check
3. **Detect**: finds people in each frame (YOLO)
4. **Track**: gives each person a temporary number across frames (ByteTrack)

The web app then runs the rules (restricted areas, safety gear) and lists the events for review.
Safety-gear detection is not part of this service yet; it needs a PPE model (see `HSE_Camera_Module_Docs/02_MODELS_AND_DATASETS.md`).

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

The model weights (`yolo11s.pt`, about 20 MB) download on the first job. Check it is up with
`http://127.0.0.1:8001/health`.

## Settings

| Variable | Default | Where |
|---|---|---|
| `VISION_MODEL` | `yolo11s.pt` | this service. `yolo11m.pt` is more accurate and about 2× slower on CPU |
| `VISION_SERVICE_URL` | `http://127.0.0.1:8001` | the web app, if the service runs elsewhere |
| `CAMERA_DATA_DIR` | `web/data` | the web app: database and uploads. Both processes must see the same paths |

## Limits

- Clips up to 2 minutes and 300 MB (set in `web/lib/camera/constants.ts`).
- One job at a time; further uploads wait in a queue.
- Jobs are kept in memory. If the service restarts, a video that was processing is marked failed and can be uploaded again.

## Licence

Ultralytics YOLO is AGPL-3.0. Check the licence terms with the company before using it in a commercial product.
