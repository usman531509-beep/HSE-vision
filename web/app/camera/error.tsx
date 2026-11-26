'use client';

import { useEffect } from 'react';
import { btn, card, cx, Icon, meta } from '@/components/ui';

/** Shown if the camera pages crash, instead of a blank screen. */
export default function CameraError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error('[camera] page crashed:', error);
  }, [error]);
  return (
    <div className={cx(card, 'mt-16 items-start')} role="alert">
      <h1 className="text-[15px] font-medium">The camera page ran into a problem</h1>
      <p className={meta}>Nothing you saved is lost. Try again, and if it keeps happening, refresh the page.</p>
      <button type="button" className={btn('dark', 'sm')} onClick={retry}><Icon name="refresh" />Try again</button>
    </div>
  );
}
