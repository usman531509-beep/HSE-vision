# 06 — Testing and Delivery Plan

## Goal
Deliver a working recorded-video proof of concept before attempting live CCTV.

## Phase 1 — Prepare sample footage
- Collect a small set of representative, approved factory videos.
- Include different camera angles, distances and lighting conditions.
- Confirm that use of the footage is authorized.
- Note which PPE items and restricted areas should be visible.

**Deliverable:** a small, organized sample-video set.

## Phase 2 — Prove basic model inference
- Install Python dependencies in a virtual environment.
- Run a candidate model on a short video.
- Save a few annotated frames and/or an annotated output video.
- Check whether the required object classes are actually supported.

**Deliverable:** working person/PPE detection demo with saved output.

## Phase 3 — Add tracking and zone logic
- Add temporary person tracking IDs.
- Configure a polygon for one restricted zone.
- Test entry detection and multi-frame confirmation.
- Record timestamps and evidence frames.

**Deliverable:** basic restricted-zone event generation.

## Phase 4 — Add event API
- Create FastAPI endpoints.
- Return processing status and event records.
- Make evidence frames accessible to the frontend.

**Deliverable:** Python analysis service that the website can call.

## Phase 5 — Build website screens
- Implement Camera Monitoring.
- Implement Detection Events.
- Implement Camera Configuration.
- Implement basic Camera Analytics.
- Clearly distinguish demo data from actual model results.

**Deliverable:** connected Next.js camera-module prototype.

## Phase 6 — Validate
Test:
- Clear and blurry footage.
- Day/night or different lighting where relevant.
- Occlusion and people partially outside the frame.
- PPE visible, not visible and difficult-to-see cases.
- False detections and missed detections.
- Zone boundaries and people close to the boundary.
- Video upload failures and interrupted processing.

Record examples of false positives and false negatives. Do not report only an overall accuracy number; review performance by class and scenario.

## Out of scope for this first delivery
- Live RTSP/CCTV streaming.
- Multi-camera real-time deployment.
- Verified employee identity.
- Permit, shift, training or LOTO verification.
- Automatic machine shutdown.
- Full action recognition for complex tasks such as mould changing.

## Acceptance checklist
- [ ] A sample video can be uploaded or selected.
- [ ] Python can read and process the video.
- [ ] Person detections are visible on annotated frames.
- [ ] Supported PPE detections are visible and labelled.
- [ ] People can be tracked with temporary IDs.
- [ ] A configured restricted zone can produce a reviewable event.
- [ ] Events include timestamps and evidence references.
- [ ] Next.js can retrieve and display the events.
- [ ] Demo/simulated information is clearly labelled.
- [ ] Limitations and test results are documented.

## Safety note
This is a prototype decision-support tool. A qualified safety person must review safety events and approve any action. Do not connect prototype detections directly to machine-stop controls.
