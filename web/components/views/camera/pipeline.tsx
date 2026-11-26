'use client';

import { PROCESSING } from '@/lib/camera/labels';
import { fmtTime, FRAME } from '@/lib/camera/geometry';
import { PIPELINE } from '@/lib/camera/constants';
import type { CameraEvent, Video } from '@/lib/camera/types';
import { useCamera } from '../../camera/state';
import { Card, Chip, cx, FILL } from '../../ui';

type StepState = 'done' | 'now' | 'todo' | 'failed';
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

function stepStates(video: Video | null, pending: number): StepState[] {
  const last = PIPELINE.length - 1;
  return PIPELINE.map((_, i) => {
    if (!video) return 'todo';
    if (video.status === 'failed') return i === 0 ? 'failed' : 'todo';
    if (video.status === 'completed') return i < last || pending === 0 ? 'done' : 'now';
    const done = video.progress ?? 0;
    return i < done ? 'done' : i === done ? 'now' : 'todo';
  });
}

/** One line per step, worked out from the video, its tracks and the camera's rules. */
function stepDetails(video: Video | null, gearRules: number, zoneCount: number, events: CameraEvent[], pending: number): string[] {
  if (!video) return PIPELINE.map((_, i) => (i === 0 ? 'No video yet' : '–'));
  const ready = video.status === 'completed';
  const tracks = video.tracks;
  const people = tracks ? new Set(tracks.frames.flatMap(([, b]) => b.map((x) => x[0]))).size : 0;
  const boxes = tracks ? tracks.frames.reduce((n, [, b]) => n + b.length, 0) : 0;
  return [
    video.status === 'failed' ? 'File could not be read' : video.durationS ? `${fmtTime(video.durationS)} · ${FRAME.w}×${FRAME.h} · ${video.fps} fps` : 'Reading file…',
    video.durationS ? `${Math.round(video.durationS * video.fps).toLocaleString()} frames · ${tracks ? tracks.fps : '–'} checked per second` : '–',
    ready ? (tracks ? `${boxes.toLocaleString()} person boxes · ${plural(video.gear?.sightings.length ?? 0, 'gear result')}` : 'No people found') : '–',
    ready ? (tracks ? `${people} ${people === 1 ? 'person' : 'people'} tracked` : '–') : '–',
    `${plural(zoneCount, 'restricted area')} · ${plural(gearRules, 'gear rule')}`,
    ready ? plural(events.length, 'event') : '–',
    ready ? (events.length ? (pending ? `${pending} waiting for a person` : 'All reviewed') : 'Nothing to review') : '–',
  ];
}

export function PipelineCard() {
  const { camera, video, zones, events } = useCamera();
  const vEvents = video ? events.filter((e) => e.videoId === video.id) : [];
  const pending = vEvents.filter((e) => e.review === 'needs_review').length;
  const zoneCount = zones.filter((z) => z.cameraId === camera.id).length;
  const states = stepStates(video, pending);
  const details = stepDetails(video, camera.requiredGear.length, zoneCount, vEvents, pending);
  const status = video ? PROCESSING[video.status] : null;

  return (
    <Card
      tour="cam-pipeline"
      title="How the analysis runs"
      sub={video ? `${video.fileName} · what each step found` : `${camera.id} has no video yet`}
      extra={status ? <Chip tone={status.tone}>{status.label}</Chip> : <Chip tone="off">No video</Chip>}
    >
      <ol className="grid grid-cols-7 gap-1.5 max-nav:grid-cols-4 max-compact:grid-cols-2">
        {PIPELINE.map((step, i) => {
          const st = states[i];
          return (
            <li key={step} className={cx('flex flex-col gap-1 rounded-md px-3.5 py-3', st === 'now' ? 'bg-sage' : 'bg-sunk')}>
              <span className="text-[11.5px] text-soft tabular-nums">{i + 1}</span>
              <b className="text-[13.5px] font-medium">{step}</b>
              <span className="min-h-[2.6em] text-[12px] leading-snug text-muted">{details[i]}</span>
              <span className={cx('mt-1.5 h-1.5 rounded-[2px]', st === 'done' ? FILL.low : st === 'now' ? FILL.watch : st === 'failed' ? FILL.act : 'bg-track')} aria-hidden="true" />
              <span className="sr-only">{st === 'done' ? 'Done' : st === 'now' ? 'In progress' : st === 'failed' ? 'Failed' : 'Not started'}</span>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
