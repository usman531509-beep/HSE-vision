/* How each tracked person is drawn at one moment: colour and label follow the same rules that create events. */
import { footPoint, insidePolygon } from './geometry';
import type { Camera, CameraEvent, GearSighting, TrackBox, Zone } from './types';

export interface BoxView { id: number; x: number; y: number; w: number; h: number; conf: number; tone: 'act' | 'watch' | 'low'; status: string }

export function describeBoxes(boxes: TrackBox[], camera: Camera, zones: Zone[], sightings: GearSighting[], events: CameraEvent[], videoId: string): BoxView[] {
  const camZones = zones.filter((z) => z.cameraId === camera.id && z.points.length >= 3);
  return boxes.map((b) => {
    const [id, x, y, w, h, conf] = b;
    const base = { id, x, y, w, h, conf };
    const zone = camZones.find((z) => insidePolygon(footPoint(b), z.points));
    if (zone) return { ...base, tone: 'act', status: `in ${zone.name}` };
    const missing = events.find((e) => e.videoId === videoId && e.trackId === id && e.type === 'possible_missing_ppe' && e.review !== 'false_alarm');
    if (missing?.gear) return { ...base, tone: 'watch', status: `no ${missing.gear}?` };
    const ok = sightings.filter((s) => s.videoId === videoId && s.trackId === id && s.seen && camera.requiredGear.includes(s.gear)).map((s) => s.gear);
    return { ...base, tone: 'low', status: ok.length ? `${ok.join(', ')} ok` : conf.toFixed(2) };
  });
}
