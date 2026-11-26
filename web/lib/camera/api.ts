/* Browser-side client for the camera API (app/api). Every call throws an Error with a readable message on failure. */
import type { Camera, Point, Review, Video, Zone } from './types';

export interface CameraData {
  cameras: Camera[]; zones: Zone[]; videos: Video[]; reviews: Record<string, Review>;
  /** Online preview: nothing is saved and uploads are off (see lib/server/camera-db.ts). */
  readOnly: boolean;
}

/** Words for failures that come back without our JSON message, e.g. from a proxy or the hosting platform. */
function statusMessage(status: number): string {
  if (status === 413) return 'This file is too large to upload.';
  if (status === 404) return 'That item no longer exists. Refresh the page and try again.';
  if (status === 408 || status === 504) return 'The server took too long to answer. Try again.';
  if (status >= 500) return 'Something went wrong on the server. Try again in a moment.';
  return 'The request could not be completed. Refresh the page and try again.';
}

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { cache: 'no-store', ...init });
  } catch {
    throw new Error('Could not reach the server. Check that the app is running and try again.');
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? statusMessage(res.status));
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

const json = (method: string, body: unknown): RequestInit => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const at = (s: string) => encodeURIComponent(s);

export const cameraApi = {
  load: () => call<CameraData>('/api/camera'),
  addCamera: () => call<Camera>('/api/cameras', { method: 'POST' }),
  saveCamera: (c: Camera) => call<Camera>(`/api/cameras/${at(c.id)}`, json('PUT', c)),
  addZone: (cameraId: string, name: string, points: Point[]) => call<Zone>(`/api/cameras/${at(cameraId)}/zones`, json('POST', { name, points })),
  deleteCamera: (id: string) => call<void>(`/api/cameras/${at(id)}`, { method: 'DELETE' }),
  renameZone: (id: string, name: string) => call<Zone>(`/api/zones/${at(id)}`, json('PUT', { name })),
  deleteZone: (id: string) => call<void>(`/api/zones/${at(id)}`, { method: 'DELETE' }),
  deleteVideo: (id: string) => call<void>(`/api/videos/${at(id)}`, { method: 'DELETE' }),
  review: (eventId: string, review: Review) => call<{ eventId: string; review: Review }>(`/api/reviews/${at(eventId)}`, json('PUT', { review })),
  upload: (cameraId: string, file: File) => {
    const form = new FormData();
    form.set('cameraId', cameraId);
    form.set('file', file);
    return call<Video>('/api/videos', { method: 'POST', body: form });
  },
  status: (id: string) => call<Video>(`/api/videos/${at(id)}/status`),
};
