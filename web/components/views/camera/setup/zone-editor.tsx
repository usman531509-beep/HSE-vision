'use client';

import { useState, type MouseEvent } from 'react';
import { ZONE_LIMITS } from '@/lib/camera/constants';
import { FRAME } from '@/lib/camera/geometry';
import type { Point, Zone } from '@/lib/camera/types';
import { useCamera } from '../../../camera/state';
import { useConfirm } from '../../../confirm';
import { btn, Card, cx, Icon, meta } from '../../../ui';
import { DraftShape, FrameLayer, ZoneShape } from '../overlay';
import { field, fieldLabel } from './fields';

const MIN_POINTS = ZONE_LIMITS.minPoints;

/** Draw restricted areas on a still from the camera. Areas are polygons in video pixels. */
export function ZoneEditor() {
  const { camera, videos, zones, events, saveZone } = useCamera();
  const still = videos.find((v) => v.cameraId === camera.id && v.poster)?.poster;
  const camZones = zones.filter((z) => z.cameraId === camera.id);
  const [draft, setDraft] = useState<Point[]>([]);
  const [name, setName] = useState('');

  const addPoint = (e: MouseEvent<SVGSVGElement>): void => {
    const r = e.currentTarget.getBoundingClientRect();
    setDraft((d) => [...d, { x: Math.round(((e.clientX - r.left) / r.width) * FRAME.w), y: Math.round(((e.clientY - r.top) / r.height) * FRAME.h) }]);
  };
  const [saving, setSaving] = useState(false);
  const save = async (): Promise<void> => {
    setSaving(true);
    const ok = await saveZone(camera.id, name.trim() || `Restricted area ${camZones.length + 1}`, draft);
    setSaving(false);
    // Keep the drawing when saving fails, so the user can try again.
    if (!ok) return;
    setDraft([]);
    setName('');
  };

  return (
    <Card tour="setup-zones" title="Restricted areas" sub="Click the picture to place corners, then name and save the area">
      <div className="relative aspect-video overflow-hidden rounded-[18px] bg-cam text-cam-ink">
        {still ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- a fixed still under an SVG layer; no resizing needed */}
            <img src={still} alt="" className="absolute inset-0 size-full object-contain brightness-[.85]" />
            <FrameLayer label={`${camera.name} still with ${camZones.length} restricted ${camZones.length === 1 ? 'area' : 'areas'}`}>
              {camZones.map((z) => <ZoneShape key={z.id} zone={z} />)}
              <DraftShape points={draft} />
            </FrameLayer>
            {/* Click target on top; the transparent rect makes the whole picture clickable. */}
            <svg viewBox={`0 0 ${FRAME.w} ${FRAME.h}`} className="absolute inset-0 size-full cursor-crosshair" onClick={addPoint} aria-hidden="true">
              <rect width={FRAME.w} height={FRAME.h} fill="transparent" />
            </svg>
          </>
        ) : (
          <div className="absolute inset-0 grid place-items-center p-6 text-center text-[13.5px] text-cam-ink/80">
            No picture from this camera yet. Areas are drawn on a still taken from an analysed video.
          </div>
        )}
      </div>

      {still ? (
        <>
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex min-w-[200px] flex-1 flex-col gap-1.5">
              <span className={fieldLabel}>Area name</span>
              <input className={field} value={name} placeholder={`Restricted area ${camZones.length + 1}`} onChange={(e) => setName(e.target.value)} />
            </label>
            <button type="button" className={btn('light')} disabled={!draft.length} onClick={() => setDraft((d) => d.slice(0, -1))}><Icon name="undo" />Undo corner</button>
            <button type="button" className={btn('light')} disabled={!draft.length} onClick={() => setDraft([])}>Clear</button>
            <button type="button" className={btn('dark')} disabled={draft.length < MIN_POINTS || saving} onClick={() => void save()}>{saving ? 'Saving…' : 'Save area'}</button>
          </div>
          <p className={meta} role="status">
            {draft.length
              ? `${draft.length} ${draft.length === 1 ? 'corner' : 'corners'} placed${draft.length < MIN_POINTS ? `. Place at least ${MIN_POINTS}.` : '. Ready to save.'}`
              : 'A person counts as inside when their feet are inside the area.'}
          </p>
        </>
      ) : null}

      <ul className="flex flex-col">
        {camZones.map((z) => {
          const hits = events.filter((e) => e.zoneId === z.id);
          return <ZoneRow key={z.id} zone={z} hits={hits.length} reviewed={hits.filter((e) => e.review !== 'needs_review').length} />;
        })}
        {!camZones.length ? <li className={meta}>No restricted areas for this camera yet.</li> : null}
      </ul>
    </Card>
  );
}

/** One saved area: rename in place, or delete after confirming what goes with it. */
function ZoneRow({ zone, hits, reviewed }: { zone: Zone; hits: number; reviewed: number }) {
  const { renameZone, deleteZone } = useCamera();
  const confirm = useConfirm();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(zone.name);
  const [busy, setBusy] = useState(false);

  const rename = async (): Promise<void> => {
    const next = name.trim();
    if (!next || next === zone.name) { setEditing(false); setName(zone.name); return; }
    setBusy(true);
    if (await renameZone(zone.id, next)) setEditing(false);
    setBusy(false);
  };
  const remove = async (): Promise<void> => {
    const ok = await confirm({
      danger: true,
      confirmLabel: 'Delete area',
      title: `Delete ${zone.name}?`,
      body: hits
        ? `People will no longer be checked against this area. Its ${hits} ${hits === 1 ? 'entry' : 'entries'}${reviewed ? `, including ${reviewed} already reviewed,` : ''} will be removed from the events.`
        : 'People will no longer be checked against this area.',
    });
    if (!ok) return;
    setBusy(true);
    await deleteZone(zone.id);
    setBusy(false);
  };

  return (
    <li className="flex min-h-[56px] flex-wrap items-center gap-3 border-t border-line px-1 py-2.5 first:border-t-0">
      <span className="size-2.5 flex-none rounded-[2px] bg-act" aria-hidden="true" />
      {editing ? (
        <form className="flex min-w-0 flex-1 gap-2" onSubmit={(e) => { e.preventDefault(); void rename(); }}>
          <input
            className={cx(field, 'h-9')}
            value={name}
            maxLength={ZONE_LIMITS.maxName}
            autoFocus
            aria-label="Area name"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape') { setEditing(false); setName(zone.name); } }}
          />
          <button type="submit" className={btn('dark', 'sm')} disabled={busy}>Save</button>
          <button type="button" className={btn('light', 'sm')} onClick={() => { setEditing(false); setName(zone.name); }}>Cancel</button>
        </form>
      ) : (
        <>
          <span className="min-w-0 flex-1">
            <b className="block text-[13.5px] font-medium">{zone.name}</b>
            <span className={meta}>{zone.points.length} corners · {hits ? `${hits} ${hits === 1 ? 'entry' : 'entries'} found in this camera’s videos` : 'no entries found in this camera’s videos'}</span>
          </span>
          <button type="button" className={btn('light', 'sm')} onClick={() => setEditing(true)} aria-label={`Rename ${zone.name}`}>Rename</button>
          <button type="button" className={cx(btn('light', 'sm'), 'text-act-ink')} disabled={busy} onClick={() => void remove()} aria-label={`Delete ${zone.name}`}>{busy ? 'Deleting…' : 'Delete'}</button>
        </>
      )}
    </li>
  );
}
