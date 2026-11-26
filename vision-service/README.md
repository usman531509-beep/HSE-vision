# HSE vision service

Runs person and safety-gear detection and tracking on videos uploaded in **Camera analysis**. The web app saves the upload,
sends it here, and polls the job until it finishes. This service does pipeline steps 1–4:

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
| `VISION_SERVICE_URL` | `http://127.0.0.1:8001` | the web app, if the service runs elsewhere |
| `CAMERA_APP_URL` | the address the upload came in on | the web app: where this service can reach it for the callback, if different |
| `CAMERA_DATA_DIR` | `web/data` | the web app: database and uploads. Both processes must see the same paths |

## Limits

- Clips up to 2 minutes and 300 MB (set in `web/lib/camera/constants.ts`).
- One job at a time; further uploads wait in a queue.
- Jobs are kept in memory. If the service restarts, a video that was processing is marked failed and can be uploaded again.

## Licence

Ultralytics YOLO and the safetyvision gear model are both AGPL-3.0. Check the licence terms with the company before using it in a commercial product.
