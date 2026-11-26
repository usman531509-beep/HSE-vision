/* Live cameras: starts and stops analysis of a camera's stream on the vision service, reports its status, and
   imports the clips the service sends back. Server-only. */
import { readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { SPRITE } from '../camera/constants';
import type { Camera, GearCheck, LiveStatus, Tracks } from '../camera/types';
import { assetUrl, uploadDir } from './analysis';
import { countEvents, deleteVideo, getVideo, insertVideo, updateVideo, UPLOAD_DIR } from './camera-db';
import { appUrl, service, SERVICE_DOWN, SERVICE_URL, serviceError } from './vision';

const OFF: LiveStatus = { state: 'off', error: null, people: 0, fps: 0, clipsSent: 0, lastClipAt: null };
/** Clips the vision service writes are named like this; anything else is refused. */
export const CLIP_ID = /^live-[0-9a-f]{8}$/;
const streamPath = (cameraId: string) => `/streams/${encodeURIComponent(cameraId)}`;

/** Starts (or restarts) live analysis for a camera with a stream address, or stops it when the address is empty.
    Returns a message when the service could not be told, so the caller can say why live view is not running. */
export async function syncStream(camera: Camera, origin: string): Promise<string | null> {
  try {
    const res = camera.streamUrl
      ? await service(streamPath(camera.id), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: camera.streamUrl, out_root: UPLOAD_DIR, sprite: SPRITE,
          callback_url: `${appUrl(origin)}/api/cameras/${encodeURIComponent(camera.id)}/live`,
        }),
      })
      : await service(streamPath(camera.id), { method: 'DELETE' });
    return res.ok ? null : await serviceError(res, 'The analysis service did not accept this camera.');
  } catch (err) {
    console.error(`[camera] could not update live analysis for ${camera.id}:`, err);
    return SERVICE_DOWN;
  }
}

/** Connects to an address once and reads one picture, without saving anything. */
export async function testStream(url: string): Promise<{ ok: true; width: number; height: number } | { ok: false; error: string }> {
  try {
    const res = await service('/streams/test', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }), timeoutMs: 30_000,
    });
    if (!res.ok) return { ok: false, error: await serviceError(res, 'The camera could not be reached.') };
    const { width, height } = (await res.json()) as { width: number; height: number };
    return { ok: true, width, height };
  } catch {
    return { ok: false, error: SERVICE_DOWN };
  }
}

export async function streamStatus(cameraId: string): Promise<LiveStatus> {
  try {
    const res = await service(streamPath(cameraId));
    if (res.status === 404) return OFF;
    if (!res.ok) return { ...OFF, state: 'error', error: await serviceError(res, 'Could not read the live status.') };
    const s = (await res.json()) as { state: LiveStatus['state']; error: string | null; people: number; fps: number; clips_sent: number; last_clip_at: string | null };
    return { state: s.state, error: s.error, people: s.people, fps: s.fps, clipsSent: s.clips_sent, lastClipAt: s.last_clip_at };
  } catch {
    return { ...OFF, state: 'error', error: SERVICE_DOWN };
  }
}

/** The annotated live picture (MJPEG), passed straight through. No timeout: it runs until the viewer leaves. */
export async function liveFeed(cameraId: string, signal: AbortSignal): Promise<Response | null> {
  try {
    const res = await fetch(`${SERVICE_URL}${streamPath(cameraId)}/live.mjpg`, { signal });
    return res.ok && res.body ? res : null;
  } catch {
    return null;
  }
}

interface ClipResult { duration_s: number; fps: number; recorded_at: string; tracks: Tracks; gear: GearCheck }

const clipLabel = (iso: string) => {
  const d = new Date(iso);
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
  return { recordedAt: `${d.getDate()} ${d.toLocaleString('en-GB', { month: 'short' })}, ${time} · live`, stamp: time.replaceAll(':', '-') };
};

/** Imports a clip the vision service finished. Only clips that produce events are kept: they are the evidence.
    Reads the result from our own upload folder, so a forged call can only import a clip that is really there. */
export async function importClip(cameraId: string, clipId: string): Promise<'kept' | 'dropped' | 'missing'> {
  if (!CLIP_ID.test(clipId) || getVideo(clipId)) return 'missing';
  const dir = uploadDir(clipId);
  let result: ClipResult;
  try {
    result = JSON.parse(await readFile(path.join(/*turbopackIgnore: true*/ dir, 'result.json'), 'utf8')) as ClipResult;
  } catch {
    return 'missing';
  }
  const { recordedAt, stamp } = clipLabel(result.recorded_at);
  insertVideo({
    id: clipId, cameraId, fileName: `${cameraId.replace(/\s+/g, '').toLowerCase()}_live_${stamp}.mp4`, src: '',
    recordedAt, durationS: result.duration_s, fps: result.fps, status: 'uploaded',
  });
  // Marking it completed runs the rules and stores its events.
  updateVideo(clipId, {
    status: 'completed', durationS: result.duration_s, fps: result.fps, tracks: result.tracks, gear: result.gear,
    src: assetUrl(clipId, 'video'), poster: assetUrl(clipId, 'poster'), sprite: assetUrl(clipId, 'sprite'),
  });
  if (countEvents(clipId) > 0) return 'kept';
  deleteVideo(clipId);
  await rm(dir, { recursive: true, force: true });
  return 'dropped';
}
