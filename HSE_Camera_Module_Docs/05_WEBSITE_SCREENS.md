# 05 — Website Screens for the Camera Module

## Goal
Build the camera-related pages in the actual Next.js application. The supplied HTML proposal is a reference for the product concept; it is not the website implementation.

## Screen 1 — Camera Monitoring
Show:
- Selected sample video and playback controls.
- Camera name and area.
- Bounding boxes around detected people and PPE.
- Temporary tracking IDs.
- Labels and confidence scores.
- Configured restricted-zone outline.
- Processing state: `Uploaded`, `Processing`, `Completed` or `Failed`.

For the first prototype, label the source clearly as **Recorded video** or **Demo video**. Do not call it Live CCTV.

## Screen 2 — Detection Events
Show a table or timeline containing:
- Time in video
- Camera/area
- Event type
- Short description
- Confidence, if available
- Review status
- Evidence-frame preview

Selecting an event should seek the video to the relevant timestamp.

## Screen 3 — Camera Configuration
Allow a user to:
- Add a demo camera.
- Enter a camera name and location/area.
- Upload or assign a sample video.
- Draw and save a restricted-zone polygon on a frame.
- Select which PPE classes/rules are relevant to that camera.

For the prototype, camera configuration can point to uploaded videos rather than physical CCTV hardware.

## Screen 4 — Camera Analytics
Show basic counts and trends:
- Videos analyzed
- People detections
- PPE detections
- Possible missing-PPE events requiring review
- Restricted-zone events
- Potential spill events requiring review
- Events by camera/area and by time

Make it clear that analytics are based on the videos processed by the prototype.

## UI states
Design for:
- No video uploaded
- Video ready for analysis
- Analysis in progress
- Analysis completed with events
- Analysis completed with no events
- Processing failed

## Data honesty
Do not fill the interface with fake AI detections and present them as real. If sample/demo data is used to demonstrate layout, label it as **Demo data**. Replace it with model-generated results when the pipeline is connected.
