/* Sample data seeded into the database on first run (lib/server/camera-db.ts).
   - Videos: stock footage from Pexels (free licence), re-encoded to 1280×720.
   - Person boxes and tracking IDs: real output of a pretrained person detector (YOLO11m + ByteTrack),
     run once on these clips. Two tracker ID switches were merged by hand.
   - Safety-gear sightings: demo values written by looking at the footage, until a PPE model is connected. */
import aisle from './tracks/aisle-b.json';
import assembly from './tracks/assembly-2.json';
import stitching from './tracks/stitching-1.json';
import type { Camera, Tracks, Video, Zone } from './types';

const cameras: Camera[] = [
  { id: 'CAM 09', name: 'Dock 1 aisle', area: 'Dock 1 · storage', requiredGear: ['helmet'], confirmFrames: 12 },
  { id: 'CAM 18', name: 'Assembly bench', area: 'Line 2 · assembly', requiredGear: ['gloves', 'mask'], confirmFrames: 12 },
  { id: 'CAM 05', name: 'Stitching line', area: 'Zone 4 · stitching', requiredGear: ['hairnet'], confirmFrames: 12 },
  { id: 'CAM 16', name: 'Compressor room', area: 'Utilities', requiredGear: ['helmet', 'gloves'], confirmFrames: 12 },
];

const zones: Zone[] = [
  {
    id: 'z-forklift', cameraId: 'CAM 09', name: 'Forklift lane',
    points: [{ x: 880, y: 330 }, { x: 1280, y: 250 }, { x: 1280, y: 420 }, { x: 1050, y: 720 }, { x: 930, y: 720 }],
  },
];

const clip = (name: string) => ({ src: `/camera/${name}.mp4`, poster: `/camera/${name}.jpg`, sprite: `/camera/${name}-sprite.jpg` });

const videos: Video[] = [
  { id: 'v-aisle', cameraId: 'CAM 09', fileName: 'cam09_2026-11-26_14-06.mp4', ...clip('aisle-b'), recordedAt: '26 Nov, 14:06',
    durationS: 12.2, fps: 25, status: 'completed', tracks: aisle as unknown as Tracks, credit: 'Tiger Lily · Pexels' },
  { id: 'v-assembly', cameraId: 'CAM 18', fileName: 'cam18_2026-11-26_15-20.mp4', ...clip('assembly-2'), recordedAt: '26 Nov, 15:20',
    durationS: 20, fps: 25, status: 'completed', tracks: assembly as unknown as Tracks, credit: 'Pexels' },
  { id: 'v-stitching', cameraId: 'CAM 05', fileName: 'cam05_2026-11-26_16-02.mp4', ...clip('stitching-1'), recordedAt: '26 Nov, 16:02',
    durationS: 20, fps: 25, status: 'completed', tracks: stitching as unknown as Tracks, credit: 'Pexels' },
];

export const DEMO = { cameras, zones, videos };
