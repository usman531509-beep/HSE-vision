/* The "Rules" step of the pipeline: turns person tracks, PPE sightings and the camera's set-up into events.
   It mirrors what the Python service will do, so the screens stay right when a user edits a zone or a gear rule. */
import { GEAR_LABEL } from './labels';
import { footPoint, insidePolygon } from './geometry';
import type { Camera, CameraEvent, GearSighting, Review, Video, Zone } from './types';

interface Run { start: number; confs: number[]; lastSeen: number }

/** Stretches where a track's feet are inside the zone for at least `minSamples` samples.
    Gaps up to `minSamples` long are bridged, so feet jittering on the edge count as one entry, not several. */
function zoneRuns(video: Video, zone: Zone, minSamples: number): Map<number, Run[]> {
  const out = new Map<number, Run[]>();
  const open = new Map<number, Run>();
  const close = (id: number) => {
    const run = open.get(id);
    open.delete(id);
    if (!run || run.confs.length < minSamples) return;
    out.set(id, [...(out.get(id) ?? []), run]);
  };
  (video.tracks?.frames ?? []).forEach(([t, boxes], i) => {
    for (const b of boxes) {
      if (!insidePolygon(footPoint(b), zone.points)) continue;
      const run = open.get(b[0]) ?? { start: t, confs: [], lastSeen: i };
      run.confs.push(b[5]);
      run.lastSeen = i;
      open.set(b[0], run);
    }
    for (const [id, run] of [...open]) if (i - run.lastSeen > minSamples) close(id);
  });
  for (const id of [...open.keys()]) close(id);
  return out;
}

/** First time a track has been visible for `minSamples` samples in a row. */
function confirmedAt(video: Video, trackId: number, minSamples: number): number | undefined {
  let streak = 0;
  for (const [t, boxes] of video.tracks?.frames ?? []) {
    streak = boxes.some((b) => b[0] === trackId) ? streak + 1 : 0;
    if (streak >= minSamples) return t;
  }
  return undefined;
}

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const round2 = (n: number) => Math.round(n * 100) / 100;

export function buildEvents(video: Video, camera: Camera, zones: Zone[], sightings: GearSighting[], reviews: Record<string, Review>): CameraEvent[] {
  if (!video.tracks) return [];
  const minSamples = Math.max(1, Math.round((camera.confirmFrames / video.fps) * video.tracks.fps));
  const frameOf = (t: number) => Math.round(t * video.fps);
  const events: CameraEvent[] = [];

  for (const zone of zones.filter((z) => z.cameraId === camera.id && z.points.length >= 3)) {
    for (const [trackId, runs] of zoneRuns(video, zone, minSamples)) {
      runs.forEach((run, n) => {
        const id = `${video.id}:zone:${zone.id}:${trackId}:${n}`;
        events.push({
          id, cameraId: camera.id, videoId: video.id, type: 'restricted_zone_entry',
          description: `person-${trackId} entered ${zone.name}`,
          t: run.start, frame: frameOf(run.start), confidence: round2(avg(run.confs)), trackId, zoneId: zone.id,
          review: reviews[id] ?? 'needs_review',
        });
      });
    }
  }

  for (const s of sightings.filter((g) => g.videoId === video.id && !g.seen && camera.requiredGear.includes(g.gear))) {
    const t = confirmedAt(video, s.trackId, minSamples);
    if (t === undefined) continue;
    const id = `${video.id}:gear:${s.gear}:${s.trackId}`;
    events.push({
      id, cameraId: camera.id, videoId: video.id, type: 'possible_missing_ppe',
      description: `${GEAR_LABEL[s.gear]} not seen on person-${s.trackId}`,
      t, frame: frameOf(t), confidence: s.confidence, trackId: s.trackId, gear: s.gear,
      review: reviews[id] ?? 'needs_review',
    });
  }

  return events.sort((a, b) => a.t - b.t);
}
