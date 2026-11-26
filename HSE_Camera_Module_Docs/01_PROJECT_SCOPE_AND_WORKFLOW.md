# 01 — Project Scope and Workflow

## What we are building
A camera-analysis prototype for the HSE project. The first version processes saved factory videos rather than live camera feeds.

## Main use cases
1. **Person detection:** identify people visible in the video.
2. **PPE detection:** detect visible helmets, gloves and safety vests where the selected model supports them.
3. **Person tracking:** keep a temporary tracking ID for a person as they move through the video.
4. **Restricted-zone monitoring:** check whether a tracked person enters a zone drawn/configured for that camera.
5. **Potential spill detection:** investigate whether a suitable model or custom dataset can identify spills in the target environment.

## Workflow
`Recorded video → OpenCV frames → AI detection → Person tracking → Camera rules → Event records → API → Next.js UI`

### Step-by-step
- Choose a short representative factory video.
- Confirm that the video can be opened and played by OpenCV.
- Run the selected detection model on individual frames.
- Draw bounding boxes and class labels on the frames.
- Add tracking IDs for people.
- Define restricted zones as polygons on the camera view.
- Check whether a person's tracked bounding box/foot point intersects a configured zone.
- Convert sustained detections into events rather than creating an alert for every frame.
- Save an evidence frame and the video timestamp for each event.
- Display the output in the website.

## What the camera can and cannot establish
| Camera can help observe | Requires another source or human verification |
|---|---|
| A person is visible | The person's verified employee identity |
| A helmet/vest/glove appears visible | Whether the PPE is compliant in every respect |
| A person enters a configured image zone | Whether that person has an approved permit |
| A possible spill-like visual pattern | Whether the substance is hazardous |
| Visible actions in a video | Whether a complete work procedure was followed |

## First-version priority
Start with person detection, supported PPE classes and basic person tracking. Add restricted-zone logic after the detections are stable. Treat spill detection as an experiment until it has been tested on relevant factory footage.
