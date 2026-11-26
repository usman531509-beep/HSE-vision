/* Talks to the Python vision service (vision-service/) and keeps the video rows in step with its jobs.
   The service runs pipeline steps 1–4 (video, frames, detect people and gear, track); rules and events run in the app. */
import path from 'node:path';
import { SERVICE_STEPS, SPRITE, UPLOAD } from '../camera/constants';
import type { GearCheck, Tracks, Video } from '../camera/types';
import { getVideo, updateVideo, UPLOAD_DIR } from './camera-db';
import { appUrl, service, SERVICE_DOWN } from './vision';
const JOB_LOST = 'Analysis stopped because the analysis service restarted. Upload the video again.';

interface JobStatus {
  state: 'queued' | 'running' | 'done' | 'failed';
  /** Pipeline steps finished (0–4). */
  step: number;
  error?: string;
  result?: { duration_s: number; fps: number; tracks: Tracks; gear: GearCheck };
}

export const uploadDir = (videoId: string) => path.join(UPLOAD_DIR, videoId);
/** URL the browser uses for one of an upload's files. */
export const assetUrl = (videoId: string, kind: 'video' | 'poster' | 'sprite') => `/api/videos/${encodeURIComponent(videoId)}/file?kind=${kind}`;

/** Hands a stored upload to the vision service. The video is marked failed when the service cannot be reached.
    The service calls back when the job ends, so events are created even if nobody has the page open. */
export async function startAnalysis(video: Video, sourcePath: string, origin: string): Promise<Video | undefined> {
  const callback = `${appUrl(origin)}/api/videos/${encodeURIComponent(video.id)}/analysed`;
  try {
    const res = await service('/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ video_id: video.id, source: sourcePath, out_dir: uploadDir(video.id), sprite: SPRITE, max_seconds: UPLOAD.maxSeconds, callback_url: callback }),
    });
    if (!res.ok) throw new Error(`vision service answered ${res.status}: ${await res.text()}`);
    return updateVideo(video.id, { status: 'processing', progress: 0 });
  } catch (err) {
    console.error('[camera] could not start analysis:', err);
    return updateVideo(video.id, { status: 'failed', error: SERVICE_DOWN });
  }
}

/** Pulls the job's latest state into the database and returns the updated video. */
export async function syncAnalysis(videoId: string): Promise<Video | undefined> {
  const video = getVideo(videoId);
  if (!video || (video.status !== 'processing' && video.status !== 'uploaded')) return video;

  let job: JobStatus;
  try {
    const res = await service(`/jobs/${encodeURIComponent(videoId)}`);
    if (res.status === 404) return updateVideo(videoId, { status: 'failed', error: JOB_LOST });
    if (!res.ok) throw new Error(`vision service answered ${res.status}`);
    job = (await res.json()) as JobStatus;
  } catch (err) {
    console.error('[camera] could not read analysis status:', err);
    return updateVideo(videoId, { status: 'failed', error: SERVICE_DOWN });
  }

  if (job.state === 'failed') return updateVideo(videoId, { status: 'failed', error: job.error ?? 'Analysis failed.' });
  if (job.state !== 'done' || !job.result) return updateVideo(videoId, { status: 'processing', progress: Math.min(job.step, SERVICE_STEPS) });
  return updateVideo(videoId, {
    status: 'completed',
    progress: SERVICE_STEPS,
    durationS: job.result.duration_s,
    fps: job.result.fps,
    tracks: job.result.tracks,
    gear: job.result.gear,
    src: assetUrl(videoId, 'video'),
    poster: assetUrl(videoId, 'poster'),
    sprite: assetUrl(videoId, 'sprite'),
  });
}
