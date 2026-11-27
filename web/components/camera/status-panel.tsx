/* What the camera pages show before their data arrives, and the bar that reports a failed save. */
import { PREVIEW_MESSAGE } from '@/lib/camera/constants';
import { btn, card, cx, Icon, meta } from '../ui';

/** On desktop the shell's top bar (Guide, search, bell) floats over the top-right of the page, so notes at the very top leave room for it. */
const clearTopBar = 'nav:mr-56';

export function LoadPanel({ error, onRetry }: { error: string | null; onRetry: () => void }) {
  return (
    <div className={cx(card, 'mt-16 items-start')} role={error ? 'alert' : 'status'}>
      <h1 className="text-[15px] font-medium">{error ? 'Camera data could not be loaded' : 'Loading camera data…'}</h1>
      {error ? (
        <>
          <p className={meta}>{error}</p>
          <button type="button" className={btn('dark', 'sm')} onClick={onRetry}><Icon name="refresh" />Try again</button>
        </>
      ) : null}
    </div>
  );
}

export function Notice({ text, onClose }: { text: string; onClose: () => void }) {
  return (
    <div role="alert" className={cx('sticky top-3 z-30 mt-4 flex items-center gap-2.5 rounded-md bg-act-bg px-4 py-2.5 text-[13.5px] text-act-ink shadow-[0_10px_30px_-14px_rgb(0_0_0/0.25)]', clearTopBar)}>
      <Icon name="alert" className="size-[18px]" />
      <span className="min-w-0 flex-1">{text}</span>
      <button type="button" onClick={onClose} aria-label="Dismiss message" className="grid size-8 place-items-center rounded-[8px] hover:bg-act/10">
        <Icon name="x" className="size-4" />
      </button>
    </div>
  );
}

/** Calm note at the top of the camera pages when the app runs as a read-only online preview. */
export function PreviewBanner() {
  return (
    <div role="note" className={cx('mt-4 flex items-start gap-2.5 rounded-md bg-sage px-4 py-2.5 text-[13.5px] text-ink', clearTopBar)}>
      <Icon name="eye" className="mt-px size-[18px]" />
      <span>{PREVIEW_MESSAGE} You can still play the sample videos and try reviewing events.</span>
    </div>
  );
}
