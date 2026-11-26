'use client';

import { useState } from 'react';
import { PROCESSING } from '@/lib/camera/labels';
import { fmtTime } from '@/lib/camera/geometry';
import type { Video } from '@/lib/camera/types';
import { useCamera } from '../../../camera/state';
import { useConfirm } from '../../../confirm';
import { btn, Card, Chip, cx, meta, Table } from '../../../ui';
import { UploadButton } from '../upload-button';

const isBusy = (v: Video) => v.status === 'uploaded' || v.status === 'processing';

/** The selected camera's videos, with delete. */
export function VideosCard() {
  const { camera, videos, events } = useCamera();
  const camVideos = videos.filter((v) => v.cameraId === camera.id);

  return (
    <Card tour="setup-videos" title="Videos" sub={`Recorded videos for ${camera.id} · ${camera.name}`} extra={<UploadButton cameraId={camera.id} kind="light" size="sm" />}>
      {camVideos.length ? (
        <Table head={['File', 'Recorded', 'Length', 'Status', 'Events', '']}>
          {camVideos.map((v) => {
            const ev = events.filter((e) => e.videoId === v.id);
            const reviewed = ev.filter((e) => e.review !== 'needs_review').length;
            return (
              <tr key={v.id}>
                <td className="max-w-[260px] truncate" title={v.fileName}>{v.fileName}</td>
                <td>{v.recordedAt}</td>
                <td>{v.durationS ? fmtTime(v.durationS) : '–'}</td>
                <td><Chip tone={PROCESSING[v.status].tone}>{PROCESSING[v.status].label}</Chip></td>
                <td>{v.status === 'completed' ? `${ev.length}${ev.length ? ` · ${reviewed} reviewed` : ''}` : '–'}</td>
                <td className="text-right"><DeleteVideo video={v} events={ev.length} reviewed={reviewed} /></td>
              </tr>
            );
          })}
        </Table>
      ) : (
        <p className={meta}>No videos for this camera yet. Upload a recorded clip to analyse it.</p>
      )}
    </Card>
  );
}

function DeleteVideo({ video, events, reviewed }: { video: Video; events: number; reviewed: number }) {
  const { deleteVideo } = useCamera();
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);
  // Sample clips are served from public/camera; uploads are served by the API.
  const sample = video.src.startsWith('/camera/');

  const onDelete = async (): Promise<void> => {
    if (isBusy(video)) {
      await confirm({ notice: true, title: 'Still being analysed', body: 'Wait until the analysis finishes, then delete the video.' });
      return;
    }
    const ok = await confirm({
      danger: true,
      confirmLabel: 'Delete video',
      title: `Delete ${video.fileName}?`,
      body: (
        <>
          <p>{events ? `Its ${events} ${events === 1 ? 'event' : 'events'}${reviewed ? `, including ${reviewed} already reviewed,` : ''} will be removed too.` : 'It has no events.'}</p>
          <p className="mt-2">{sample ? 'This is a sample clip: it is removed from this camera, and the file stays in the app.' : 'The uploaded file is deleted from the server. This cannot be undone.'}</p>
        </>
      ),
    });
    if (!ok) return;
    setBusy(true);
    await deleteVideo(video.id);
    setBusy(false);
  };

  return (
    <button type="button" className={cx(btn('light', 'sm'), 'text-act-ink')} disabled={busy} onClick={() => void onDelete()} aria-label={`Delete ${video.fileName}`}>
      {busy ? 'Deleting…' : 'Delete'}
    </button>
  );
}
