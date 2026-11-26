/** Evidence thumbnails: one frame every `step` seconds, tiled `cols` across, each tile w × h.
    The vision service builds sprites for uploads with these same values. */
export const SPRITE = { step: 0.5, cols: 10, w: 192, h: 108 } as const;

/** The analysis steps, in order. Docs: 01_PROJECT_SCOPE_AND_WORKFLOW.md.
    The vision service runs steps 1 to 4; the rules engine runs 5 and 6; a person does 7. */
export const PIPELINE = ['Video', 'Frames', 'Detect', 'Track', 'Rules', 'Events', 'Review'] as const;
/** Steps finished when the vision service hands back tracks. */
export const SERVICE_STEPS = 4;

/** Upload limits, checked in the browser and again by the API before anything is stored. */
export const UPLOAD = { maxBytes: 300 * 1024 * 1024, maxSeconds: 120, extensions: ['.mp4', '.mov', '.m4v', '.webm', '.mkv', '.avi'] } as const;

/** Shown when the app runs as a read-only online preview (see lib/server/camera-db.ts). */
export const PREVIEW_MESSAGE = 'This is an online preview, so changes are not saved and videos cannot be uploaded here.';

/** Why a file cannot be uploaded, or null when it can. */
export function uploadProblem(name: string, type: string, bytes: number): string | null {
  const ext = name.slice(name.lastIndexOf('.')).toLowerCase();
  if (!type.startsWith('video/') && !(UPLOAD.extensions as readonly string[]).includes(ext)) return 'This file is not a video. Use MP4, MOV or WebM.';
  const mb = 1024 * 1024;
  if (bytes > UPLOAD.maxBytes) return `This video is ${Math.round(bytes / mb)} MB. The limit is ${UPLOAD.maxBytes / mb} MB.`;
  return null;
}

/** How long a finding must last before it becomes an event: [source frames at 25 fps, label]. */
export const CONFIRM_OPTIONS: [number, string][] = [[6, '0.25 s'], [12, '0.5 s'], [25, '1 s']];

/** Limits on a drawn restricted area. */
export const ZONE_LIMITS = { minPoints: 3, maxPoints: 40, maxName: 60 } as const;

/** Live camera stream addresses: RTSP or HTTP, or a webcam number on the analysis machine.
    Keep in step with URL_PATTERN in vision-service/live.py. */
export const STREAM = {
  pattern: /^(rtsps?|https?):\/\/\S+$|^\d$/,
  maxLength: 500,
  problem: 'Use a stream address starting with rtsp:// or http://, or a webcam number such as 0.',
  /** How often the Live view checks each camera's status. */
  pollMs: 3000,
} as const;
