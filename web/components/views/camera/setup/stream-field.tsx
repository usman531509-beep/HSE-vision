'use client';

/* The camera's live stream address, with a button that tries it before it is saved. */
import { useState } from 'react';
import { cameraApi } from '@/lib/camera/api';
import { STREAM } from '@/lib/camera/constants';
import { useCamera } from '../../../camera/state';
import { btn, cx, Icon, meta } from '../../../ui';
import { field, fieldLabel } from './fields';

type Check = { state: 'idle' } | { state: 'testing' } | { state: 'ok'; text: string } | { state: 'failed'; text: string };

export function StreamField({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const { readOnly } = useCamera();
  const [check, setCheck] = useState<Check>({ state: 'idle' });
  const url = value.trim();
  const wellFormed = !url || STREAM.pattern.test(url);

  const test = async (): Promise<void> => {
    setCheck({ state: 'testing' });
    try {
      const { width, height } = await cameraApi.testStream(url);
      setCheck({ state: 'ok', text: `Connected. The camera sends ${width}×${height} pictures.` });
    } catch (err) {
      setCheck({ state: 'failed', text: (err as Error).message });
    }
  };

  const message = !wellFormed ? STREAM.problem
    : check.state === 'ok' || check.state === 'failed' ? check.text
      : check.state === 'testing' ? 'Connecting… this can take up to 10 seconds.'
        : 'Leave empty for a camera you only upload recordings from. Saving an address starts live analysis.';

  return (
    <div className="flex flex-col gap-1.5">
      <label className={fieldLabel} htmlFor="stream-url">Live stream address</label>
      <div className="flex gap-2 max-compact:flex-col">
        <input
          id="stream-url" className={cx(field, 'font-mono')} value={value} maxLength={STREAM.maxLength} spellCheck={false} autoComplete="off"
          placeholder="rtsp://user:password@192.168.1.20:554/stream1"
          onChange={(e) => { onChange(e.target.value); setCheck({ state: 'idle' }); }}
          aria-describedby="stream-help" aria-invalid={!wellFormed}
        />
        <button type="button" className={cx(btn('light'), 'flex-none')} disabled={!url || !wellFormed || readOnly || check.state === 'testing'} onClick={() => void test()}>
          <Icon name="refresh" />Test connection
        </button>
      </div>
      <p id="stream-help" role="status" className={cx(meta, 'flex items-start gap-1.5', check.state === 'failed' || !wellFormed ? 'text-act' : check.state === 'ok' ? 'text-low' : '')}>
        {check.state === 'ok' ? <Icon name="check" className="mt-px size-3.5 flex-none" /> : check.state === 'failed' || !wellFormed ? <Icon name="alert" className="mt-px size-3.5 flex-none" /> : null}
        <span>{message}</span>
      </p>
    </div>
  );
}
