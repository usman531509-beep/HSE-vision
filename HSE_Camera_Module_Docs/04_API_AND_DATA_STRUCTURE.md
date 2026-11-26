# 04 — API and Data Structure

## Goal
Connect the Python video-analysis service to the Next.js website without putting model inference code inside the frontend.

## Suggested architecture
`Next.js frontend ↔ FastAPI backend ↔ Python/OpenCV/model pipeline`

The Next.js app handles user interaction and visualization. The Python service handles video processing and model inference. The database stores camera configuration and event metadata; video and evidence files can be stored in an agreed file/object-storage location.

## Suggested API endpoints
These are proposed endpoint names, not existing endpoints.

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/videos` | Upload/register a sample video |
| POST | `/api/videos/{video_id}/analyze` | Start analysis |
| GET | `/api/videos/{video_id}/status` | Check processing status |
| GET | `/api/videos/{video_id}/events` | Get events for a video |
| GET | `/api/cameras` | List configured cameras |
| POST | `/api/cameras` | Add a camera configuration |
| GET | `/api/cameras/{camera_id}/zones` | Get camera zones |
| POST | `/api/cameras/{camera_id}/zones` | Save a zone polygon |

## Suggested data objects

### Camera
- `id`
- `name`
- `location`
- `video_source_type` — for the prototype, e.g. `uploaded_video`
- `status`

### Video
- `id`
- `camera_id`
- `file_reference`
- `duration_seconds`
- `processing_status`
- `created_at`

### Detection event
- `id`
- `camera_id`
- `video_id`
- `event_type`
- `description`
- `timestamp_seconds`
- `frame_number`
- `confidence`
- `tracking_id` (temporary tracker ID, if available)
- `evidence_reference`
- `review_status`

### Zone
- `id`
- `camera_id`
- `name`
- `polygon_points`
- `zone_type` (for example, restricted)

## Example event payload
```json
{
  "camera_id": "cam-01",
  "video_id": "video-001",
  "event_type": "restricted_zone_entry",
  "description": "Tracked person entered the configured restricted zone",
  "timestamp_seconds": 42.6,
  "frame_number": 1278,
  "confidence": 0.91,
  "tracking_id": "person-3",
  "evidence_reference": "evidence/video-001/frame-1278.jpg",
  "review_status": "needs_review"
}
```

The values above are illustrative only.

## Integration sequence
1. Make the Python script work locally on one video.
2. Refactor the processing code into reusable functions.
3. Add FastAPI endpoints to start processing and retrieve status/events.
4. Connect Next.js to those endpoints.
5. Test upload, processing, event retrieval and evidence display end-to-end.
