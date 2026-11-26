# HSE Camera Monitoring Module

## Purpose
This documentation breaks the camera-related work into practical development steps. The supplied `HSE.html` is a **project proposal/reference document**, not the actual website or a working camera system.

## Current scope
Build a prototype that analyzes **recorded factory videos** and displays the results in a Next.js website.

In scope:
- Detect people and visible PPE such as helmets, gloves and safety vests.
- Track people across video frames.
- Detect entry into manually configured restricted/danger zones.
- Explore potential spill detection.
- Store detection events and evidence frames.
- Display video, detections, events and basic analytics on the website.

Not in the first version:
- Connecting to live CCTV streams.
- Reliable employee identity recognition.
- Verifying permits, training records or machine lock-off from video alone.
- Automatically stopping machinery.
- Full activity/procedure recognition, such as proving that a mould-change procedure was followed.

## End-to-end workflow
1. Select a sample factory video.
2. Read the video frame-by-frame with OpenCV.
3. Run a pretrained object-detection model.
4. Track detected people across frames.
5. Apply configured camera rules, such as restricted-zone boundaries.
6. Create event records with timestamps, labels, confidence and evidence images.
7. Send results to the Next.js application through a Python API.
8. Show the annotated video and event information in the website.

## Suggested technology
- **Python:** model inference and video-processing pipeline.
- **OpenCV:** reading videos, extracting frames and drawing overlays.
- **YOLO / Ultralytics:** object detection and tracking experiments.
- **Roboflow:** finding PPE datasets/models and testing or preparing custom datasets.
- **FastAPI:** API between the Python service and Next.js.
- **Next.js:** camera monitoring interface, event list, configuration and analytics.
- **Database:** persist cameras, zones and detection events. The exact database can be selected to match the main project.

## Development order
Follow the numbered documents in this folder:
1. `01_PROJECT_SCOPE_AND_WORKFLOW.md`
2. `02_MODELS_AND_DATASETS.md`
3. `03_VIDEO_ANALYSIS_PIPELINE.md`
4. `04_API_AND_DATA_STRUCTURE.md`
5. `05_WEBSITE_SCREENS.md`
6. `06_TESTING_AND_DELIVERY_PLAN.md`

## Important limitations
A model's detection is an indication, not proof of a safety violation. For example, a helmet may be hidden by camera angle or occlusion. A missing helmet detection must be checked across frames and validated before being presented as a confirmed violation. Spill detections should initially be labelled **Potential spill — review required**.

A camera can observe visible activity, people, PPE and configured areas. It cannot independently establish a worker's identity, permit approval, training status or machine isolation/lock-off. Those require separate trusted records or equipment integrations and are outside this camera prototype.

Any safety-critical decision must remain subject to review and approval by a qualified person. Do not use an unverified prototype detection to stop machinery or take disciplinary action.

## Proposal reference
The proposal describes a wider HSE Copilot with four broad layers: Collect, Understand, Decide and Act. This documentation covers only the camera-analysis part of **Collect** and the camera-related evidence/events it can provide to later parts of the platform.
