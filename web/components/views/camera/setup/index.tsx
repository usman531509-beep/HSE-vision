'use client';

import Link from 'next/link';
import { useState } from 'react';
import { GEAR_LABEL, PROCESSING } from '@/lib/camera/labels';
import { useCamera } from '../../../camera/state';
import { BigStat } from '../../../figures';
import { btn, Card, Chip, Foot, Icon, link, PageHead, Panel, Table } from '../../../ui';
import { UploadButton } from '../upload-button';
import { CameraForm } from './camera-form';
import { VideosCard } from './videos-card';
import { ZoneEditor } from './zone-editor';

const twoCols = 'grid grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] gap-4 max-nav:grid-cols-1';

export function CameraSetupView() {
  const { cameras, zones, videos, camera, addCamera } = useCamera();
  const [adding, setAdding] = useState(false);
  const ready = cameras.filter((c) => videos.some((v) => v.cameraId === c.id && v.status === 'completed')).length;

  return (
    <>
      <PageHead
        title="Camera setup"
        desc="Add a camera, attach a recorded video, draw the areas people must not enter and choose which safety gear to check."
        tools={
          <>
            <Link href="/camera" className={link}>← Back to camera analysis</Link>
            <button type="button" className={btn('dark')} disabled={adding} onClick={() => { setAdding(true); void addCamera().finally(() => setAdding(false)); }} data-tour="setup-add"><Icon name="plus" />Add camera</button>
          </>
        }
        aside={
          <div className="flex flex-wrap gap-x-10 gap-y-4" data-tour="setup-stats">
            <BigStat value={cameras.length} label="Cameras" badge={<Chip tone="low">{ready} ready</Chip>} />
            <BigStat value={zones.length} label="Restricted areas" badge={<Chip tone="off">Drawn</Chip>} />
          </div>
        }
      />
      <Panel>
        <div className={twoCols}>
          {/* Keys reset each draft when the camera changes; siblings need distinct keys. */}
          <ZoneEditor key={`zones-${camera.id}`} />
          <CameraForm key={`form-${camera.id}`} camera={camera} />
        </div>
        <VideosCard />
        <CamerasCard />
        <Foot left="Changes are saved in the camera database on this server." right="Areas are drawn on the camera picture, not on a site map." />
      </Panel>
    </>
  );
}

function CamerasCard() {
  const { cameras, zones, videos, camId, selectCamera } = useCamera();
  return (
    <Card tour="setup-cameras" title="Cameras" sub="Pick a camera to edit it. For now each camera uses recorded videos, not a live stream.">
      <Table head={['Camera', 'Area', 'Video', 'Restricted areas', 'Gear checked', 'Status', '']}>
        {cameras.map((c) => {
          const vids = videos.filter((v) => v.cameraId === c.id);
          const latest = vids[vids.length - 1];
          return (
            <tr key={c.id} className={c.id === camId ? '[&_td]:bg-sunk' : undefined}>
              <td>
                <button type="button" className="text-left font-medium hover:underline aria-pressed:underline" aria-pressed={c.id === camId} onClick={() => selectCamera(c.id)}>
                  {c.id} · {c.name}
                </button>
              </td>
              <td>{c.area || '–'}</td>
              <td className="max-w-[220px] truncate">{latest?.fileName ?? '–'}</td>
              <td>{zones.filter((z) => z.cameraId === c.id).length}</td>
              <td>{c.requiredGear.length ? c.requiredGear.map((g) => GEAR_LABEL[g]).join(', ') : '–'}</td>
              <td>{latest ? <Chip tone={PROCESSING[latest.status].tone}>{PROCESSING[latest.status].label}</Chip> : <Chip tone="off">No video</Chip>}</td>
              <td className="text-right"><UploadButton cameraId={c.id} kind="light" size="sm" label={latest ? 'Add video' : 'Upload video'} /></td>
            </tr>
          );
        })}
      </Table>
    </Card>
  );
}
