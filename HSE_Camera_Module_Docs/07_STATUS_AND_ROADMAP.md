# 07 — Status and Roadmap

Where the camera module stands and what can be worked on next. Update this file in the same PR as the work.
Last updated: 2026-11-26.

## Done

| Area | What works | Where |
|---|---|---|
| Website | Camera analysis (`/camera`) and Camera setup (`/camera/setup`): video with person boxes and IDs, events, evidence frames, Confirm / False alarm review, analytics | `web/app/camera`, `web/components/views/camera` |
| Setup | Add, edit and delete cameras, restricted areas and videos, with confirmations and delete guards | same |
| Storage | SQLite through `/api/*` routes; read-only preview on Vercel | `web/lib/server` |
| Upload and analysis | Upload → convert → detect people → track (YOLO11 + ByteTrack) → rules → events | `vision-service/` |
| Safety gear | Helmet, vest, gloves and mask checked on uploads (safetyvision-yolov8 v2, ONNX). Hairnet cannot be checked | `vision-service/ppe.py` |
| Server-side rules | Events are created and stored on the server when analysis ends (the vision service calls the app back) and rebuilt when a camera, area or gear rule changes. Review decisions are kept across rebuilds | `web/lib/server/camera-db.ts`, `/api/events` |
| Live cameras (prototype) | Stream address and Test connection in Camera setup; live picture with person boxes on Cameras → Live; 30-second clips with events kept as evidence and reviewed like uploads; streams resume after a restart. Tested with a simulated camera, not yet with real CCTV | `vision-service/live.py`, `web/lib/server/live.ts` |
| Spill (explored) | Zero-shot test with YOLO-World: no false alarms, but missed clear water and only weakly found a wet floor. Not usable | see Spill detection below |

## Known limits of the gear model (tested on the sample clips)
- Masks: found reliably.
- Wool caps and hairnets: often called helmets.
- Thin white work gloves: not found.
- Hairnet: no class in any public model.
- No-vest and mask: the model card's weakest classes.

## Roadmap (not started)

### 1. Real site footage — waiting for clips
Collect short clips from the actual site cameras (different angles, lighting, distances), run them through the app,
review false and missed detections, and decide whether the gear model needs fine-tuning on labelled site footage.

### 2. Spill detection — needs a dataset
- Public spill models found online were not trustworthy (unknown uploader, pickle weights only).
- Open-vocabulary detection (YOLO-World, prompts "liquid spill on floor", "puddle", "wet floor") is not good enough.
- Plan: download a labelled floor-spill dataset from Roboflow Universe (for example "Oil Spillage on Floor",
  about 5,000 images, CC BY 4.0; needs a free Roboflow account and API key), train a small YOLO model from the
  official base weights, test it on spill and no-spill clips, then on site footage.
- Events are labelled **Potential spill — review required** (see README).

### 3. Licence decision — business decision, needed before selling
Ultralytics YOLO and the gear model are AGPL-3.0: free for internal use and demos, but offering the product to
customers would require publishing its full source code. Options:

| Option | Cost | Work |
|---|---|---|
| A. Ultralytics Enterprise licence | Paid (quote from Ultralytics) | None |
| B. Switch to Apache/MIT models (RF-DETR or YOLOX, ByteTrack) and retrain the gear model | Free | About 1–2 weeks |
| C. Open-source the product under AGPL | Free | Only if the company agrees |

### 4. Live cameras on site — prototype built, needs the site
The prototype works end to end with a simulated camera (see vision-service/README.md, "Live cameras"). Still needed:
- From the site: camera stream addresses and passwords, and a PC on the camera network to run the vision service.
- A test with a real CCTV camera or a phone camera app (only a simulated camera has been tested).
- An NVIDIA GPU for more than one or two cameras: a laptop CPU manages about 2–3 frames a second for one camera.
- A retention rule for evidence clips (how long to keep them) and a disk-space limit.
- Camera passwords are stored in the database and the service's streams.json in plain text; protect both, or move
  them to a secrets store before going live.

### 5. Alerts
Events now exist on the server, so an alert (email, SMS, WhatsApp) can be sent when one is created. Not started.

### 6. Going live (hosting)
- Shared database (Postgres or Supabase) instead of the local SQLite file.
- Object storage for videos (S3, R2 or Supabase Storage); also avoids Vercel's 4.5 MB request limit.
- Host the vision service (Railway, Render, AWS…) with an API key between it and the website.

### 7. Logins and roles
Anyone can edit or delete today. Add sign-in and roles (for example viewer, reviewer, admin).

### 8. Housekeeping
- Reorder docs 01–06 for the frontend-first plan.
- Click through both camera pages in a browser before each release.
