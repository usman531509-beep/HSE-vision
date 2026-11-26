'use client';

import { useState, type FormEvent } from 'react';
import { CONFIRM_OPTIONS } from '@/lib/camera/constants';
import { GEAR_LABEL, GEARS, MODEL_GEAR } from '@/lib/camera/labels';
import type { Camera, Gear } from '@/lib/camera/types';
import { useCamera } from '../../../camera/state';
import { useConfirm } from '../../../confirm';
import { btn, Card, cx, Icon, meta, segBtn, segWrap } from '../../../ui';
import { field, fieldLabel } from './fields';


/** Name, area and rules for the selected camera. Keyed by camera id, so the draft resets when the camera changes. */
export function CameraForm({ camera }: { camera: Camera }) {
  const { saveCamera } = useCamera();
  const [draft, setDraft] = useState(camera);
  const [saved, setSaved] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(camera);
  const edit = (u: Partial<Camera>): void => { setDraft((d) => ({ ...d, ...u })); setSaved(false); };
  const toggleGear = (g: Gear): void => edit({ requiredGear: draft.requiredGear.includes(g) ? draft.requiredGear.filter((x) => x !== g) : [...draft.requiredGear, g] });

  const [saving, setSaving] = useState(false);
  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setSaving(true);
    const ok = await saveCamera({ ...draft, name: draft.name.trim() || camera.name, area: draft.area.trim() });
    setSaving(false);
    if (ok) setSaved(true);
  };

  return (
    <Card tour="setup-form" title="Camera details" sub={camera.id}>
      <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}>Camera name</span>
          <input className={field} value={draft.name} onChange={(e) => edit({ name: e.target.value })} required />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}>Area</span>
          <input className={field} value={draft.area} placeholder="For example Zone 4 · packing" onChange={(e) => edit({ area: e.target.value })} />
        </label>

        <fieldset className="flex flex-col gap-1.5">
          <legend className={cx(fieldLabel, 'mb-1.5')}>Safety gear everyone must wear</legend>
          <div className="grid grid-cols-2 gap-2 max-compact:grid-cols-1">
            {GEARS.map((g) => {
              const on = draft.requiredGear.includes(g);
              return (
                <button key={g} type="button" aria-pressed={on} onClick={() => toggleGear(g)}
                  className="flex h-11 items-center gap-2.5 rounded-[8px] bg-sunk px-3.5 text-left text-[13px] hover:bg-line aria-pressed:bg-sage">
                  <span className={cx('grid size-[18px] flex-none place-items-center rounded-[5px]', on ? 'bg-ink text-lime' : 'bg-paper ring-1 ring-line-2')} aria-hidden="true">
                    {on ? <Icon name="check" className="size-3" stroke={3} /> : null}
                  </span>
                  {GEAR_LABEL[g]}
                  {MODEL_GEAR.includes(g) ? null : <span className={cx(meta, 'ml-auto')}>not checked by AI yet</span>}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="flex flex-col gap-1.5">
          <span className={fieldLabel} id="confirm-label">Raise an event after the finding lasts</span>
          <div className={cx(segWrap, 'self-start')} role="group" aria-labelledby="confirm-label">
            {CONFIRM_OPTIONS.map(([frames, text]) => (
              <button key={frames} type="button" className={segBtn} aria-pressed={draft.confirmFrames === frames} onClick={() => edit({ confirmFrames: frames })}>{text}</button>
            ))}
          </div>
          <p className={meta}>Longer means fewer false alarms from one blurry frame, but brief entries can be missed.</p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className={cx(meta, 'mr-auto')} role="status">{saved && !dirty ? 'Saved. Camera analysis now uses these rules.' : dirty ? 'Unsaved changes' : ''}</span>
          <button type="button" className={btn('light')} disabled={!dirty} onClick={() => { setDraft(camera); setSaved(false); }}>Reset</button>
          <button type="submit" className={btn('dark')} disabled={!dirty || saving}>{saving ? 'Saving…' : 'Save camera'}</button>
        </div>
      </form>
      <DeleteCamera camera={camera} />
    </Card>
  );
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Deleting is allowed only for an empty camera that is not the last one; otherwise the dialog says what to remove. */
function DeleteCamera({ camera }: { camera: Camera }) {
  const { cameras, videos, zones, deleteCamera } = useCamera();
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);
  const nVideos = videos.filter((v) => v.cameraId === camera.id).length;
  const nZones = zones.filter((z) => z.cameraId === camera.id).length;

  const onDelete = async (): Promise<void> => {
    if (cameras.length <= 1) {
      await confirm({ notice: true, title: 'This is the only camera', body: 'Keep at least one camera. Add another camera before deleting this one.' });
      return;
    }
    if (nVideos || nZones) {
      await confirm({
        notice: true,
        title: `${camera.name} still has data`,
        body: (
          <>
            <p>Delete these first, then delete the camera:</p>
            <ul className="mt-2 list-disc pl-5">
              {nVideos ? <li>{plural(nVideos, 'video', 'videos')}: in the Videos list below</li> : null}
              {nZones ? <li>{plural(nZones, 'restricted area', 'restricted areas')}: in Restricted areas</li> : null}
            </ul>
          </>
        ),
      });
      return;
    }
    const ok = await confirm({ danger: true, confirmLabel: 'Delete camera', title: `Delete ${camera.id} · ${camera.name}?`, body: 'The camera and its settings are removed. This cannot be undone.' });
    if (!ok) return;
    setBusy(true);
    await deleteCamera(camera.id);
    setBusy(false);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
      <span className={meta}>{nVideos || nZones ? `Has ${[nVideos && plural(nVideos, 'video', 'videos'), nZones && plural(nZones, 'area', 'areas')].filter(Boolean).join(' and ')}` : 'No videos or areas'}</span>
      <button type="button" className={cx(btn('light', 'sm'), 'text-act-ink')} disabled={busy} onClick={() => void onDelete()}>
        {busy ? 'Deleting…' : 'Delete camera'}
      </button>
    </div>
  );
}
