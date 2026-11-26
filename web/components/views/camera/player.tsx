'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { EVENT, PROCESSING } from '@/lib/camera/labels';
import { boxesAt, fmtTime } from '@/lib/camera/geometry';
import { PIPELINE } from '@/lib/camera/constants';
import { describeBoxes } from '@/lib/camera/status';
import type { Video } from '@/lib/camera/types';
import { useCamera } from '../../camera/state';
import { btn, Card, Cells, Chip, chipBtn, cx, FILL, Icon, meta, segBtn, segWrap, tile } from '../../ui';
import { Boxes, FrameLayer, ZoneShape } from './overlay';
import { UploadButton } from './upload-button';
import { useVideoTime } from './use-video-time';

const SKIP_S = 5;
const LAYERS = [['boxes', 'Boxes'], ['zones', 'Restricted areas'], ['ids', 'Labels']] as const;
type Layer = (typeof LAYERS)[number][0];

export const demoTag = 'inline-flex h-6 items-center rounded-[5px] bg-lime px-2.5 text-[10.5px] font-semibold tracking-wide text-lime-ink';

/** The dark 16:9 stage every state draws into. */
function Stage({ children, label }: { children: ReactNode; label?: string }) {
  return <div className="relative aspect-video overflow-hidden rounded-[18px] bg-cam text-cam-ink" aria-label={label}>{children}</div>;
}

function StageMessage({ children }: { children: ReactNode }) {
  return <div className="absolute inset-0 grid place-items-center p-6 text-center text-[13.5px] text-cam-ink/80">{children}</div>;
}

export function PlayerCard() {
  const { camera, videos, video, selectVideo } = useCamera();
  const camVideos = videos.filter((v) => v.cameraId === camera.id);

  return (
    <Card
      tour="cam-player"
      title={<>{camera.id} · {camera.name} <Chip tone="off">Recorded video</Chip></>}
      sub={video ? `${camera.area} · ${video.fileName} · ${video.recordedAt}` : camera.area || 'No area set'}
      extra={
        <div className="flex flex-wrap items-center gap-2">
          <span className={demoTag}>DEMO DATA</span>
          <Link href="/camera/setup" className={btn('light', 'sm')} data-tour="cam-setup-link">Camera setup</Link>
          <UploadButton cameraId={camera.id} size="sm" />
        </div>
      }
    >
      {camVideos.length > 1 ? (
        <div className={cx(segWrap, 'self-start overflow-x-auto')} role="group" aria-label="Video">
          {camVideos.map((v) => (
            <button key={v.id} type="button" className={segBtn} aria-pressed={v.id === video?.id} onClick={() => selectVideo(v.id)}>{v.fileName}</button>
          ))}
        </div>
      ) : null}
      {!video ? <NoVideo cameraId={camera.id} /> : video.status === 'completed' ? <Playback key={video.id} video={video} /> : <NotReady video={video} />}
    </Card>
  );
}

function NoVideo({ cameraId }: { cameraId: string }) {
  return (
    <Stage>
      <StageMessage>
        <span className="flex flex-col items-center gap-3">
          <Icon name="camera" className="size-6" />
          <span>No video for this camera yet.<br />Upload a recorded clip to analyse it.</span>
          <UploadButton cameraId={cameraId} kind="light" size="sm" />
        </span>
      </StageMessage>
    </Stage>
  );
}

function NotReady({ video }: { video: Video }) {
  const done = video.progress ?? 0;
  if (video.status === 'failed') {
    return (
      <Stage>
        <StageMessage>
          <span className="flex flex-col items-center gap-3">
            <Chip tone="act">{PROCESSING.failed.label}</Chip>
            <span>{video.error}</span>
            <UploadButton cameraId={video.cameraId} kind="light" size="sm" label="Try another file" />
          </span>
        </StageMessage>
      </Stage>
    );
  }
  return (
    <Stage>
      <StageMessage>
        <span className="flex w-full max-w-[360px] flex-col items-center gap-3" role="status">
          <Chip tone="watch">{PROCESSING[video.status].label}</Chip>
          <span>{video.status === 'uploaded' ? 'Uploading the file…' : `Step ${Math.min(done + 1, PIPELINE.length)} of ${PIPELINE.length} · ${PIPELINE[Math.min(done, PIPELINE.length - 1)]}`}</span>
          <Cells n={done} total={PIPELINE.length} tone="watch" className="w-full" />
        </span>
      </StageMessage>
    </Stage>
  );
}

function Playback({ video }: { video: Video }) {
  const { camera, zones, events, sightings, eventId, selectEvent } = useCamera();
  const ref = useRef<HTMLVideoElement>(null);
  const { t, playing } = useVideoTime(ref, video.src);
  const [layers, setLayers] = useState<Record<Layer, boolean>>({ boxes: true, zones: true, ids: true });
  const [unplayable, setUnplayable] = useState(false);
  const vEvents = events.filter((e) => e.videoId === video.id);
  const selected = vEvents.find((e) => e.id === eventId);
  const camZones = zones.filter((z) => z.cameraId === camera.id && z.points.length >= 3);
  const boxes = video.tracks ? describeBoxes(boxesAt(video.tracks, t), camera, zones, sightings, vEvents, video.id) : [];
  const duration = video.durationS;

  // Picking an event (here or in the list) pauses on its evidence frame.
  const seekTo = selected?.t;
  useEffect(() => {
    const v = ref.current;
    if (!v || seekTo === undefined) return;
    v.pause();
    v.currentTime = seekTo;
  }, [eventId, seekTo]);

  const seek = (s: number): void => { if (ref.current) ref.current.currentTime = Math.min(Math.max(0, s), duration); };
  const toggle = (): void => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) v.play().catch((err: unknown) => console.error('[camera] playback failed:', err)); else v.pause();
  };

  const flagged = boxes.filter((b) => b.tone !== 'low');
  const summary = !video.tracks
    ? 'No detection results for this video.'
    : `${boxes.length} ${boxes.length === 1 ? 'person' : 'people'} in view.${flagged.length ? ' ' + flagged.map((b) => `person-${b.id} ${b.status}`).join(', ') + '.' : boxes.length ? ' Nothing to flag at this moment.' : ''}`;

  return (
    <>
      <Stage label={`${camera.id} recording at ${fmtTime(t)}. ${summary}`}>
        <video
          ref={ref}
          src={video.src}
          poster={video.poster}
          muted
          playsInline
          preload="auto"
          onClick={toggle}
          onError={() => setUnplayable(true)}
          className="absolute inset-0 size-full cursor-pointer object-contain"
        >
          Your browser cannot play this video.
        </video>
        {unplayable ? (
          <StageMessage>This video could not be played. The file may have been moved or deleted. Refresh the page, or upload it again.</StageMessage>
        ) : null}
        <FrameLayer>
          {layers.zones ? camZones.map((z) => <ZoneShape key={z.id} zone={z} label={layers.ids} highlight={selected?.zoneId === z.id} />) : null}
          {layers.boxes ? <Boxes boxes={boxes} ids={layers.ids} focus={selected?.trackId} /> : null}
        </FrameLayer>
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between bg-black/45 px-3.5 py-2 text-xs font-medium tabular-nums">
          <span>{camera.id} · {camera.name}</span>
          <span>Recorded · {fmtTime(t)} / {fmtTime(duration)}</span>
        </div>
      </Stage>

      <div data-tour="cam-timeline">
        {/* Event markers sit on the same scale as the slider below. */}
        <div className="relative mx-2 h-4">
          {vEvents.map((e) => (
            <button
              key={e.id}
              type="button"
              aria-label={`${fmtTime(e.t)} ${EVENT[e.type].label}, person-${e.trackId}`}
              aria-pressed={e.id === eventId}
              onClick={() => selectEvent(e.id)}
              className={cx('absolute top-0 h-3.5 w-2.5 -translate-x-1/2 rounded-[2px] ring-offset-1 aria-pressed:ring-2 aria-pressed:ring-ink', FILL[e.review === 'false_alarm' ? 'off' : EVENT[e.type].tone])}
              style={{ left: `${(e.t / duration) * 100}%` }}
            />
          ))}
        </div>
        <input
          type="range"
          min={0}
          max={duration}
          step={0.04}
          value={Math.min(t, duration)}
          onChange={(e) => seek(Number(e.target.value))}
          aria-label="Position in video"
          aria-valuetext={`${fmtTime(t)} of ${fmtTime(duration)}`}
          className="h-6 w-full cursor-pointer accent-ink"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button type="button" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'} className="grid size-11 place-items-center rounded-[8px] bg-ink text-lime hover:bg-accent-2">
            <Icon name={playing ? 'pause' : 'play'} />
          </button>
          <button type="button" className={btn('light', 'sm')} onClick={() => seek(t - SKIP_S)} aria-label={`Back ${SKIP_S} seconds`}><Icon name="back" />{SKIP_S} s</button>
          <button type="button" className={btn('light', 'sm')} onClick={() => seek(t + SKIP_S)} aria-label={`Forward ${SKIP_S} seconds`}><Icon name="forward" />{SKIP_S} s</button>
          <span className="ml-1 text-[13px] text-ink-2 tabular-nums">{fmtTime(t)} / {fmtTime(duration)}</span>
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Show on video">
          {LAYERS.map(([key, text]) => (
            <button key={key} type="button" className={chipBtn} aria-pressed={layers[key]} onClick={() => setLayers((l) => ({ ...l, [key]: !l[key] }))}>{text}</button>
          ))}
        </div>
      </div>

      <div className={tile}>
        <span className={meta}>At {fmtTime(t)}</span>
        <p className="mt-1 text-[13.5px]">{summary}</p>
      </div>
    </>
  );
}
