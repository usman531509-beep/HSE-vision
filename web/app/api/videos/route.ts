import { randomUUID } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';
import { UPLOAD, uploadProblem } from '@/lib/camera/constants';
import { startAnalysis, uploadDir } from '@/lib/server/analysis';
import { getCamera, insertVideo } from '@/lib/server/camera-db';
import { problem } from '@/lib/server/validate';
import { handler } from '@/lib/server/route';

const VIDEO_EXT = new Set<string>(UPLOAD.extensions);

const recordedLabel = (d: Date) =>
  `${d.getDate()} ${d.toLocaleString('en-GB', { month: 'short' })}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

/** Upload a recorded video for a camera (multipart: `file`, `cameraId`), then start its analysis. */
export const POST = handler(async (request: Request) => {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return problem(400, 'Send the video as a multipart form with a file and a camera.');
  }
  const file = form.get('file');
  const cameraId = String(form.get('cameraId') ?? '');
  if (!(file instanceof File) || file.size === 0) return problem(400, 'Choose a video file to upload.');
  if (!getCamera(cameraId)) return problem(404, `Camera ${cameraId} does not exist.`);
  const rejected = uploadProblem(file.name, file.type, file.size);
  if (rejected) return problem(file.size > UPLOAD.maxBytes ? 413 : 415, rejected);
  const ext = path.extname(file.name).toLowerCase();

  const id = `vid-${randomUUID().slice(0, 8)}`;
  const dir = uploadDir(id);
  const source = path.join(dir, `source${VIDEO_EXT.has(ext) ? ext : '.mp4'}`);
  try {
    await mkdir(dir, { recursive: true });
    // Stream to disk so a large clip never sits in memory whole.
    await pipeline(Readable.fromWeb(file.stream() as unknown as WebReadableStream), createWriteStream(source));
  } catch (err) {
    console.error('[camera] could not store upload:', err);
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
    return problem(500, 'The video could not be saved on the server. Try again.');
  }

  const video = insertVideo({
    id, cameraId, fileName: file.name.slice(0, 120), src: '', recordedAt: recordedLabel(new Date()),
    durationS: 0, fps: 25, status: 'uploaded', progress: 0,
  });
  return Response.json(await startAnalysis(video, source), { status: 201 });
}, { write: true });
