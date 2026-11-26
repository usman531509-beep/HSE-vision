'use client';

/* Cameras connected by a stream address: their live picture with person boxes, and whether analysis is running.
   Clips with events are saved as videos, so their events show under Recorded analysis like any upload. */
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { cameraApi } from '@/lib/camera/api';
import { STREAM } from '@/lib/camera/constants';
import type { Camera, LiveStatus } from '@/lib/camera/types';
import type { Tone } from '@/lib/data';
import { useCamera } from '../../camera/state';
import { btn, Card, Chip, cx, Icon, meta } from '../../ui';

const STATE: Record<LiveStatus['state'], { label: string; tone: Tone }> = {
  live: { label: 'Live', tone: 'low' },
  connecting: { label: 'Connecting', tone: 'watch' },
  error: { label: 'Problem', tone: 'act' },
  off: { label: 'Not running', tone: 'off' },
  stopped: { label: 'Stopped', tone: 'off' },
};

/** Polls one camera's live status; calls onClip when the service has sent a new clip. */
function useLiveStatus(cameraId: string, onClip: () => void): LiveStatus | null {
  const [status, setStatus] = useState<LiveStatus | null>(null);
  const lastClip = useRef<string | null>(null);
  const clipRef = useRef(onClip);
  useEffect(() => { clipRef.current = onClip; });

  useEffect(() => {
    let stopped = false;
    const poll = () => cameraApi.liveStatus(cameraId)
      .then((s) => {
        if (stopped) return;
        setStatus(s);
        if (s.lastClipAt && lastClip.current && s.lastClipAt !== lastClip.current) clipRef.current();
        lastClip.current = s.lastClipAt;
      })
      .catch((err: Error) => { if (!stopped) setStatus({ state: 'error', error: err.message, people: 0, fps: 0, clipsSent: 0, lastClipAt: null }); });
    void poll();
    const timer = setInterval(poll, STREAM.pollMs);
    return () => { stopped = true; clearInterval(timer); };
  }, [cameraId]);
  return status;
}

function LiveTile({ camera, onOpen }: { camera: Camera; onOpen: (cameraId: string) => void }) {
  const { reload, events } = useCamera();
  const status = useLiveStatus(camera.id, reload);
  const [broken, setBroken] = useState(false);
  const live = status?.state === 'live';
  // A fresh <img> once the stream is up again, so the browser reconnects to the feed.
  const feedKey = `${status?.state}-${broken}`;
  useEffect(() => { if (live) setBroken(false); }, [live]);
  const liveEvents = events.filter((e) => e.cameraId === camera.id && e.videoId.startsWith('live-'));
  const open = liveEvents.filter((e) => e.review === 'needs_review').length;
  const st = STATE[status?.state ?? 'connecting'];

  return (
    <figure className="flex flex-col gap-2">
      <div className="relative aspect-video overflow-hidden rounded-[12px] bg-cam text-cam-ink">
        {live && !broken ? (
          // An MJPEG stream: next/image cannot show it, a plain img can.
          <img key={feedKey} src={cameraApi.liveFeedUrl(camera.id)} alt={`Live view from ${camera.name}, with a box around each person`} className="absolute inset-0 size-full object-contain" onError={() => setBroken(true)} />
        ) : (
          <div className="absolute inset-0 grid place-items-center p-4 text-center text-[12.5px] text-cam-ink/80">
            <span className="inline-flex items-center gap-1.5"><Icon name="camera" className="size-4" />{status?.state === 'error' ? 'No picture' : status?.state === 'off' ? 'Live analysis is not running' : 'Connecting…'}</span>
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between bg-black/45 px-2.5 py-1.5 text-[10.5px] font-medium tabular-nums">
          <span>{camera.id}</span>
          {live ? <span>{status.people} {status.people === 1 ? 'person' : 'people'} in view</span> : null}
        </div>
      </div>
      <figcaption className="flex flex-col gap-1">
        <span className="flex items-center justify-between gap-2">
          <b className="truncate text-[13px] font-semibold">{camera.name}</b>
          <Chip tone={st.tone}>{st.label}</Chip>
        </span>
        {status?.error ? <span className={cx(meta, 'text-act')} role="alert">{status.error}</span> : null}
        {live ? (
          <span className={meta}>
            Checking {status.fps ? `${status.fps}` : '…'} frames a second · {liveEvents.length} {liveEvents.length === 1 ? 'event' : 'events'} saved{open ? `, ${open} to review` : ''}
          </span>
        ) : null}
        {liveEvents.length ? (
          <button type="button" className={cx(btn('light', 'sm'), 'self-start')} onClick={() => onOpen(camera.id)}>Review live events</button>
        ) : null}
      </figcaption>
    </figure>
  );
}

/** The connected cameras, or how to connect one. `onOpen` switches to Recorded analysis for that camera. */
export function LiveFeedsCard({ onOpen }: { onOpen: (cameraId: string) => void }) {
  const { cameras } = useCamera();
  const connected = cameras.filter((c) => c.streamUrl);
  return (
    <Card
      tour="live-feeds"
      title="Connected cameras"
      sub={connected.length ? 'Real live analysis. Every few seconds of footage with an event is saved as evidence.' : 'No camera is connected to a live stream yet.'}
      extra={<Link href="/camera/setup" className={btn('light', 'sm')}>Camera setup</Link>}
    >
      {connected.length ? (
        <div className="grid grid-cols-3 gap-3.5 max-nav:grid-cols-2 max-compact:grid-cols-1">
          {connected.map((c) => <LiveTile key={`${c.id}:${c.streamUrl}`} camera={c} onOpen={onOpen} />)}
        </div>
      ) : (
        <p className={meta}>Open Camera setup, pick a camera and enter its stream address (rtsp://…, a phone camera app&apos;s http://… address, or 0 for this computer&apos;s webcam). The camera wall below shows sample footage.</p>
      )}
    </Card>
  );
}
