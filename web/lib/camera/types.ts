/* Camera module data shapes. They follow HSE_Camera_Module_Docs/04_API_AND_DATA_STRUCTURE.md,
   so the demo source can later be swapped for the FastAPI responses without touching the screens. */

export type Gear = 'helmet' | 'vest' | 'gloves' | 'hairnet' | 'mask';
export type EventType = 'restricted_zone_entry' | 'possible_missing_ppe';
export type Review = 'needs_review' | 'confirmed' | 'false_alarm';
export type Processing = 'uploaded' | 'processing' | 'completed' | 'failed';

/** A point in video pixels (the frame is FRAME.w × FRAME.h). */
export interface Point { x: number; y: number }

export interface Camera {
  id: string;
  name: string;
  area: string;
  /** Safety gear that must be visible on everyone this camera sees. */
  requiredGear: Gear[];
  /** Source frames a finding must last before it becomes an event (filters one-frame glitches). */
  confirmFrames: number;
}

export interface Zone { id: string; cameraId: string; name: string; points: Point[] }

/** [trackId, x, y, w, h, confidence] in video pixels. */
export type TrackBox = [number, number, number, number, number, number];
/** Person detections, sampled every few frames: [seconds, boxes]. */
export interface Tracks { fps: number; w: number; h: number; frames: [number, TrackBox[]][] }

export interface Video {
  id: string;
  cameraId: string;
  fileName: string;
  src: string;
  poster?: string;
  /** Contact sheet of frames every SPRITE.step seconds, for evidence thumbnails. */
  sprite?: string;
  recordedAt: string;
  durationS: number;
  fps: number;
  status: Processing;
  /** Pipeline steps finished so far, while processing. */
  progress?: number;
  /** Why processing failed, shown to the user. */
  error?: string;
  /** Present once analysis has run and found people. */
  tracks?: Tracks;
  credit?: string;
}

/** What the PPE model reports for one tracked person (demo values until that model is connected). */
export interface GearSighting { videoId: string; trackId: number; gear: Gear; seen: boolean; confidence: number }

export interface CameraEvent {
  id: string;
  cameraId: string;
  videoId: string;
  type: EventType;
  description: string;
  /** Seconds into the video where the finding was confirmed. */
  t: number;
  frame: number;
  confidence: number;
  trackId: number;
  zoneId?: string;
  gear?: Gear;
  review: Review;
}
