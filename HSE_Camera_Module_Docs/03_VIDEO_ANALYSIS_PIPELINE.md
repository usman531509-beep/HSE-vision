# 03 — Video Analysis Pipeline

## Goal
Create a Python service that takes a recorded video and produces annotated video frames plus structured detection events.

## Processing stages

### 1. Load video
- Accept a supported video file such as MP4.
- Open it with OpenCV (`cv2.VideoCapture`).
- Read frame rate, width, height and total frame count where available.
- Handle invalid or unreadable files with a clear error.

### 2. Extract frames
- Read frames sequentially.
- Optionally process every Nth frame during early experiments to reduce processing time.
- Preserve the original timestamp/frame number for every processed frame.

### 3. Run object detection
- Load the chosen pretrained model.
- Run inference on each selected frame.
- Keep the class label, confidence score and bounding-box coordinates.
- Initially focus on person and the PPE classes actually supported by the model.

### 4. Track people
- Use the model's supported tracking mode or a compatible tracker.
- Assign temporary tracking IDs across frames.
- Do not treat a tracking ID as a verified employee identity.

### 5. Apply camera rules
- Let an administrator configure a restricted zone by drawing a polygon over the camera image.
- Check whether a tracked person enters or remains inside the configured polygon.
- Use a minimum duration or multi-frame confirmation to reduce one-frame false alarms.
- Store the rule name and zone ID with the resulting event.

### 6. Create events
Possible event types:
- `person_detected`
- `ppe_detected`
- `possible_missing_ppe`
- `restricted_zone_entry`
- `potential_spill`

An event should include:
- Camera ID
- Video ID
- Event type and readable description
- Timestamp or frame number
- Confidence (where available)
- Bounding box or zone reference (where relevant)
- Evidence image path/reference
- Review status, such as `needs_review`

### 7. Produce output
- Save annotated evidence frames.
- Optionally produce an annotated output video for the prototype.
- Return a processing summary and event list to the API.

## PPE association caution
Detecting a person and detecting a helmet in the same frame does not automatically prove that the helmet belongs to that person. Association, distance, camera angle, occlusion and repeated-frame confirmation need testing. If the model cannot confidently establish the relationship, label the result for review rather than declaring a violation.

## Spill caution
Treat spill detection as a separate model/dataset experiment. Until validated on relevant footage, show it as **Potential spill — review required**.

## Suggested Python packages
- `opencv-python`
- The selected model package (for example, `ultralytics`, if that is the chosen model)
- `fastapi` and `uvicorn` for the API stage

Use a virtual environment and pin tested package versions for reproducibility.
