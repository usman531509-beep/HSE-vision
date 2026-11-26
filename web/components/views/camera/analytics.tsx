'use client';

import { EVENT, PROCESSING, REVIEW } from '@/lib/camera/labels';
import type { CameraEvent } from '@/lib/camera/types';
import { useCamera } from '../../camera/state';
import { Card, Cells, Chip, Legend, meta, Num, Sq, Table } from '../../ui';

const count = (events: CameraEvent[], f: (e: CameraEvent) => boolean) => events.filter(f).length;

/** Totals per camera over every video analysed in this preview. */
export function ByCameraCard() {
  const { cameras, videos, events, camId, selectCamera } = useCamera();
  return (
    <Card tour="cam-analytics" title="By camera" sub="Every video analysed in this preview">
      <Table head={['Camera', 'Videos', 'People tracked', EVENT.restricted_zone_entry.short, EVENT.possible_missing_ppe.short, 'To review']}>
        {cameras.map((c) => {
          const vids = videos.filter((v) => v.cameraId === c.id);
          const done = vids.filter((v) => v.status === 'completed');
          const ev = events.filter((e) => e.cameraId === c.id);
          const people = done.reduce((n, v) => n + (v.tracks ? new Set(v.tracks.frames.flatMap(([, b]) => b.map((x) => x[0]))).size : 0), 0);
          const open = count(ev, (e) => e.review === 'needs_review');
          const busy = vids.find((v) => v.status === 'processing' || v.status === 'uploaded');
          return (
            <tr key={c.id}>
              <td>
                <button type="button" className="text-left font-medium hover:underline aria-pressed:underline" aria-pressed={c.id === camId} onClick={() => selectCamera(c.id)}>
                  {c.id} · {c.name}
                </button>
              </td>
              <td>{vids.length}</td>
              <td>{done.length ? people : '–'}</td>
              <td>{done.length ? count(ev, (e) => e.type === 'restricted_zone_entry' && e.review !== 'false_alarm') : '–'}</td>
              <td>{done.length ? count(ev, (e) => e.type === 'possible_missing_ppe' && e.review !== 'false_alarm') : '–'}</td>
              <td>
                {!vids.length ? <Chip tone="off">No video</Chip>
                  : busy ? <Chip tone={PROCESSING[busy.status].tone}>{PROCESSING[busy.status].label}</Chip>
                  : open ? <Chip tone="watch">{open}</Chip>
                  : <Chip tone="low">Done</Chip>}
              </td>
            </tr>
          );
        })}
      </Table>
    </Card>
  );
}

/** How far the safety officer has got with reviewing, across all cameras. */
export function ReviewCard() {
  const { events } = useCamera();
  const total = events.length;
  const by = (r: keyof typeof REVIEW) => count(events, (e) => e.review === r);
  const reviewed = total - by('needs_review');
  return (
    <Card tour="cam-review" note title="Review progress" sub="A person checks every event before anyone acts on it">
      <div className="flex items-end justify-between gap-3">
        <Num value={reviewed} unit={`of ${total}`} className="text-[44px]" />
        <span className={meta}>events reviewed</span>
      </div>
      <Cells n={reviewed} total={Math.max(total, 1)} tone="low" />
      <Legend>
        {(['needs_review', 'confirmed', 'false_alarm'] as const).map((r) => (
          <span key={r}><Sq tone={REVIEW[r].tone} />{REVIEW[r].label} · {by(r)}</span>
        ))}
      </Legend>
    </Card>
  );
}
