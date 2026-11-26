'use client';

import { useId, type ChangeEvent } from 'react';
import { useCamera } from '../../camera/state';
import { btn, cx, Icon } from '../../ui';

/** A file picker styled as a button. The chosen video is added to the camera and run through the pipeline. */
export function UploadButton({ cameraId, kind = 'dark', size = 'md', label = 'Upload video' }: { cameraId: string; kind?: 'dark' | 'light'; size?: 'md' | 'sm'; label?: string }) {
  const { upload, readOnly } = useCamera();
  const id = useId();
  const onPick = (e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) void upload(cameraId, file);
  };
  return (
    <label
      htmlFor={id}
      title={readOnly ? 'Uploads are off in this online preview' : undefined}
      className={cx(btn(kind, size), 'focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent', readOnly ? 'cursor-not-allowed opacity-40' : 'cursor-pointer')}
    >
      <Icon name="upload" />{label}
      <input id={id} type="file" accept="video/*" className="sr-only" disabled={readOnly} onChange={onPick} />
    </label>
  );
}
