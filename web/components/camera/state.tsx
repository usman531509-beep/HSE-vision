'use client';

/* Camera module state, shared by Camera analysis and Camera setup (mounted by app/camera/layout.tsx).
   Loads from the camera API, saves every change through it, and polls uploads until analysis finishes.
   Events come from the server, which runs the rules; this only adds the review decisions. */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { cameraApi, type CameraData } from '@/lib/camera/api';
import { PREVIEW_MESSAGE, uploadProblem } from '@/lib/camera/constants';
import { sightingsOf } from '@/lib/camera/rules';
import type { Camera, CameraEvent, GearSighting, Point, Review, Video } from '@/lib/camera/types';
import { LoadPanel, Notice, PreviewBanner } from './status-panel';

const POLL_MS = 1500;

interface Selection { camId: string; videoId: string | null; eventId: string | null }

interface CameraApi extends CameraData, Selection {
  /** Events of every analysed video, as stored by the server, with review decisions applied. */
  events: CameraEvent[];
  sightings: GearSighting[];
  camera: Camera;
  video: Video | null;
  selectCamera: (id: string) => void;
  selectVideo: (id: string) => void;
  selectEvent: (id: string | null) => void;
  review: (eventId: string, r: Review) => void;
  /** Resolves true when saved; on failure the reason is shown in the notice bar. */
  saveCamera: (c: Camera) => Promise<boolean>;
  addCamera: () => Promise<void>;
  deleteCamera: (id: string) => Promise<boolean>;
  saveZone: (cameraId: string, name: string, points: Point[]) => Promise<boolean>;
  renameZone: (id: string, name: string) => Promise<boolean>;
  deleteZone: (id: string) => Promise<boolean>;
  deleteVideo: (id: string) => Promise<boolean>;
  upload: (cameraId: string, file: File) => Promise<void>;
  /** Re-reads everything from the server, e.g. after a live clip arrived. Keeps the current selection. */
  reload: () => void;
}

const Ctx = createContext<CameraApi | null>(null);
const firstVideoOf = (videos: Video[], camId: string) => videos.filter((v) => v.cameraId === camId).at(-1)?.id ?? null;
/** Review decisions minus those whose event id matches. */
const dropReviews = (reviews: Record<string, Review>, match: (eventId: string) => boolean) =>
  Object.fromEntries(Object.entries(reviews).filter(([id]) => !match(id)));
const isBusy = (v: Video) => (v.status === 'uploaded' || v.status === 'processing') && !v.id.startsWith('local-');

export function CameraProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<CameraData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sel, setSel] = useState<Selection>({ camId: '', videoId: null, eventId: null });
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoadError(null);
    cameraApi.load()
      .then((d) => {
        setData(d);
        setSel((s) => (s.camId ? s : { camId: d.cameras[0]?.id ?? '', videoId: firstVideoOf(d.videos, d.cameras[0]?.id ?? ''), eventId: null }));
      })
      .catch((err: Error) => setLoadError(err.message));
  }, []);
  useEffect(load, [load]);

  const patchData = useCallback((u: (d: CameraData) => Partial<CameraData>) => setData((d) => (d ? { ...d, ...u(d) } : d)), []);
  const putVideo = useCallback((v: Video, replaceId = v.id) => patchData((d) => ({ videos: d.videos.map((x) => (x.id === replaceId ? v : x)) })), [patchData]);
  const fail = useCallback((what: string) => (err: Error) => setNotice(`${what}: ${err.message}`), []);

  /** Re-reads the events after a change that made the server re-run the rules. */
  const reloadEvents = useCallback(
    () => cameraApi.events().then((ev) => patchData(() => ({ events: ev }))).catch(fail('Events not updated')),
    [patchData, fail],
  );

  // Poll every video the vision service is still working on.
  const busyIds = (data?.videos ?? []).filter(isBusy).map((v) => v.id).join(',');
  const inFlight = useRef(false);
  useEffect(() => {
    if (!busyIds) return;
    const timer = setInterval(() => {
      if (inFlight.current) return;
      inFlight.current = true;
      Promise.all(busyIds.split(',').map((id) => cameraApi.status(id)
        .then((v) => { putVideo(v); if (v.status === 'completed') return reloadEvents(); })
        .catch(fail('Could not check analysis'))))
        .finally(() => { inFlight.current = false; });
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [busyIds, putVideo, reloadEvents, fail]);

  const sightings = useMemo<GearSighting[]>(() => (data?.videos ?? []).flatMap(sightingsOf), [data?.videos]);

  const events = useMemo<CameraEvent[]>(
    () => (data?.events ?? []).map((e) => ({ ...e, review: data?.reviews[e.id] ?? 'needs_review' })),
    [data?.events, data?.reviews],
  );

  const api = useMemo<CameraApi | null>(() => {
    if (!data || !data.cameras.length) return null;
    const camera = data.cameras.find((c) => c.id === sel.camId) ?? data.cameras[0];
    /** In the read-only preview, explain instead of calling a server that will refuse. */
    const previewOnly = (): boolean => {
      if (data.readOnly) setNotice(PREVIEW_MESSAGE);
      return data.readOnly;
    };
    return {
      ...data, ...sel, events, sightings, camera, reload: load,
      video: data.videos.find((v) => v.id === sel.videoId) ?? null,
      selectCamera: (id) => setSel({ camId: id, videoId: firstVideoOf(data.videos, id), eventId: null }),
      selectVideo: (id) => setSel((s) => ({ ...s, videoId: id, eventId: null })),
      selectEvent: (id) => setSel((s) => ({ ...s, eventId: id })),
      review: (eventId, r) => {
        // Show the decision at once; put it back if the server refuses it.
        const before = data.reviews[eventId];
        const set = (value: Review | undefined) => patchData((d) => {
          const reviews = { ...d.reviews };
          if (value && value !== 'needs_review') reviews[eventId] = value; else delete reviews[eventId];
          return { reviews };
        });
        set(r);
        // The preview keeps decisions for this visit only, so reviewing can still be tried out.
        if (data.readOnly) return;
        cameraApi.review(eventId, r).catch((err: Error) => { set(before); fail('Review not saved')(err); });
      },
      saveCamera: async (c) => !previewOnly() && cameraApi.saveCamera(c)
        .then((saved) => { patchData((d) => ({ cameras: d.cameras.map((x) => (x.id === saved.id ? saved : x)) })); void reloadEvents(); return true; })
        .catch((err: Error) => { fail('Camera not saved')(err); return false; }),
      addCamera: async () => { if (!previewOnly()) await cameraApi.addCamera()
        .then((cam) => { patchData((d) => ({ cameras: [...d.cameras, cam] })); setSel({ camId: cam.id, videoId: null, eventId: null }); })
        .catch(fail('Camera not added')); },
      saveZone: async (cameraId, name, points) => !previewOnly() && cameraApi.addZone(cameraId, name, points)
        .then((z) => { patchData((d) => ({ zones: [...d.zones, z] })); void reloadEvents(); return true; })
        .catch((err: Error) => { fail('Area not saved')(err); return false; }),
      deleteCamera: async (id) => !previewOnly() && cameraApi.deleteCamera(id)
        .then(() => {
          const rest = data.cameras.filter((c) => c.id !== id);
          patchData(() => ({ cameras: rest }));
          setSel({ camId: rest[0].id, videoId: firstVideoOf(data.videos, rest[0].id), eventId: null });
          return true;
        })
        .catch((err: Error) => { fail('Camera not deleted')(err); return false; }),
      renameZone: async (id, name) => !previewOnly() && cameraApi.renameZone(id, name)
        .then((z) => { patchData((d) => ({ zones: d.zones.map((x) => (x.id === z.id ? z : x)) })); void reloadEvents(); return true; })
        .catch((err: Error) => { fail('Area not renamed')(err); return false; }),
      deleteZone: async (id) => !previewOnly() && cameraApi.deleteZone(id)
        .then(() => {
          patchData((d) => ({ zones: d.zones.filter((z) => z.id !== id), reviews: dropReviews(d.reviews, (e) => e.includes(`:zone:${id}:`)) }));
          void reloadEvents();
          return true;
        })
        .catch((err: Error) => { fail('Area not deleted')(err); return false; }),
      deleteVideo: async (id) => !previewOnly() && cameraApi.deleteVideo(id)
        .then(() => {
          const rest = data.videos.filter((v) => v.id !== id);
          patchData((d) => ({
            videos: d.videos.filter((v) => v.id !== id),
            events: d.events.filter((e) => e.videoId !== id),
            reviews: dropReviews(d.reviews, (e) => e.startsWith(`${id}:`)),
          }));
          setSel((s) => (s.videoId === id ? { ...s, videoId: firstVideoOf(rest, s.camId), eventId: null } : s));
          return true;
        })
        .catch((err: Error) => { fail('Video not deleted')(err); return false; }),
      upload: async (cameraId, file) => {
        if (previewOnly()) return;
        // A placeholder row shows "Uploading" straight away; the server's row replaces it.
        const localId = `local-${Date.now()}`;
        // Check size and type here first, so a wrong file fails at once instead of after a long upload.
        const rejected = uploadProblem(file.name, file.type, file.size);
        patchData((d) => ({ videos: [...d.videos, {
          id: localId, cameraId, fileName: file.name, src: '', recordedAt: rejected ? 'Not uploaded' : 'Uploading…', durationS: 0, fps: 25,
          status: rejected ? 'failed' : 'uploaded', progress: 0, error: rejected ?? undefined,
        }] }));
        setSel({ camId: cameraId, videoId: localId, eventId: null });
        if (rejected) return;
        try {
          const saved = await cameraApi.upload(cameraId, file);
          putVideo(saved, localId);
          setSel((s) => (s.videoId === localId ? { ...s, videoId: saved.id } : s));
        } catch (err) {
          patchData((d) => ({ videos: d.videos.map((v) => (v.id === localId ? { ...v, status: 'failed', error: (err as Error).message } : v)) }));
        }
      },
    };
  }, [data, sel, events, sightings, load, patchData, putVideo, reloadEvents, fail]);

  if (!api) return <LoadPanel error={loadError ?? (data && !data.cameras.length ? 'No cameras are set up yet.' : null)} onRetry={load} />;
  return (
    <Ctx.Provider value={api}>
      {api.readOnly ? <PreviewBanner /> : null}
      {notice ? <Notice text={notice} onClose={() => setNotice(null)} /> : null}
      {children}
    </Ctx.Provider>
  );
}

export function useCamera(): CameraApi {
  const v = useContext(Ctx);
  if (!v) throw new Error('useCamera must be used inside <CameraProvider>');
  return v;
}
