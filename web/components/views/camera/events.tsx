'use client';

import { useState } from 'react';
import { EVENT, GEAR_LABEL, REVIEW } from '@/lib/camera/labels';
import { fmtTime } from '@/lib/camera/geometry';
import type { CameraEvent, EventType, Review, Video } from '@/lib/camera/types';
import { useCamera } from '../../camera/state';
import { btn, Card, Chip, cx, Filters, KV, link, meta, rowBase, rowBtn } from '../../ui';
import { Evidence } from './evidence';

type Filter = 'all' | 'review' | EventType;
const FILTERS: [Filter, string][] = [
  ['all', 'All'], ['review', 'Needs review'],
  ['restricted_zone_entry', EVENT.restricted_zone_entry.short], ['possible_missing_ppe', EVENT.possible_missing_ppe.short],
];

const matches = (e: CameraEvent, f: Filter): boolean => f === 'all' || (f === 'review' ? e.review === 'needs_review' : e.type === f);

export function EventsCard() {
  const { video, camera, events, sightings, eventId, selectEvent } = useCamera();
  const [filter, setFilter] = useState<Filter>('all');
  const vEvents = video ? events.filter((e) => e.videoId === video.id) : [];
  const shown = vEvents.filter((e) => matches(e, filter));
  const open = vEvents.filter((e) => e.review === 'needs_review').length;
  // Gear results exist only for the sample clips until a PPE model is connected.
  const gearPending = !!video && video.status === 'completed' && camera.requiredGear.length > 0 && !sightings.some((s) => s.videoId === video.id);

  return (
    <Card
      tour="cam-events"
      title="Events in this video"
      sub={video?.status === 'completed' ? `${vEvents.length} ${vEvents.length === 1 ? 'event' : 'events'} · ${open} to review` : 'Waiting for analysis'}
    >
      {vEvents.length ? <Filters label="Show events" options={FILTERS} value={filter} onChange={setFilter} /> : null}
      {gearPending ? <p className={meta}>Safety-gear checks for uploaded videos start once the PPE model is connected. People and restricted areas are checked now.</p> : null}
      <Body video={video} total={vEvents.length} shown={shown} eventId={eventId} onPick={(id) => selectEvent(id === eventId ? null : id)} />
    </Card>
  );
}

function Body({ video, total, shown, eventId, onPick }: { video: Video | null; total: number; shown: CameraEvent[]; eventId: string | null; onPick: (id: string) => void }) {
  if (!video) return <p className={meta}>Upload a video for this camera to see its events here.</p>;
  if (video.status === 'failed') return <p className={meta}>Analysis did not run because the file could not be read.</p>;
  if (video.status !== 'completed') return <p className={meta}>Events appear here when analysis finishes.</p>;
  if (!total) {
    return (
      <p className="text-[13.5px]">
        {video.tracks?.frames.some(([, b]) => b.length) ? 'No events. Everyone seen in this video met the rules set for this camera.' : 'No people were detected in this video.'}
      </p>
    );
  }
  if (!shown.length) return <p className={meta}>No events match this filter.</p>;
  return (
    <ul className="flex flex-col">
      {shown.map((e) => (
        <li key={e.id} className="border-t border-line first:border-t-0">
          <button type="button" aria-pressed={e.id === eventId} aria-expanded={e.id === eventId} onClick={() => onPick(e.id)} className={cx('grid grid-cols-[44px_minmax(0,1fr)_auto]', rowBase, rowBtn, 'border-t-0')}>
            <span className="text-[12.5px] text-muted tabular-nums">{fmtTime(e.t)}</span>
            <span className="min-w-0">
              <b className="block truncate text-[13.5px] font-medium">{EVENT[e.type].label}</b>
              <span className={cx(meta, 'block truncate')}>{e.description} · {e.confidence.toFixed(2)}</span>
            </span>
            <Chip tone={REVIEW[e.review].tone}>{REVIEW[e.review].label}</Chip>
          </button>
          {e.id === eventId ? <Detail event={e} video={video} /> : null}
        </li>
      ))}
    </ul>
  );
}

function Detail({ event, video }: { event: CameraEvent; video: Video }) {
  const { review, zones } = useCamera();
  const decide = (r: Review) => review(event.id, r);
  const rule = event.zoneId ? `Stay out of ${zones.find((z) => z.id === event.zoneId)?.name ?? 'restricted area'}` : event.gear ? `${GEAR_LABEL[event.gear]} required` : '–';
  return (
    <div className="mb-2 grid grid-cols-[minmax(0,150px)_minmax(0,1fr)] gap-4 rounded-md bg-sunk px-3 pt-1 pb-3.5 max-compact:grid-cols-1">
      <Evidence event={event} video={video} />
      <div>
        <KV k="Evidence frame" v={`#${event.frame} · ${fmtTime(event.t)}`} />
        <KV k="Rule" v={rule} />
        <KV k="Confidence" v={event.confidence.toFixed(2)} />
        <p className={cx(meta, 'mt-2')}>person-{event.trackId} is a tracking number for this video only, not a name.</p>
        {event.review === 'needs_review' ? (
          <div className="mt-3 flex gap-2">
            <button type="button" className={btn('light', 'sm')} onClick={() => decide('false_alarm')}>False alarm</button>
            <button type="button" className={btn('dark', 'sm')} onClick={() => decide('confirmed')}>Confirm</button>
          </div>
        ) : (
          <div className="mt-3 flex items-center gap-3">
            <Chip tone={REVIEW[event.review].tone}>{REVIEW[event.review].label}</Chip>
            <button type="button" className={link} onClick={() => decide('needs_review')}>Undo</button>
          </div>
        )}
      </div>
    </div>
  );
}
