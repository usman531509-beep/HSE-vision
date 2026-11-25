'use client';

import { Minus, Plus, RotateCcw, type LucideIcon } from 'lucide-react';
import { cx } from '../../ui';

/* lucide glyphs used directly: the shared Icon set has no minus or reset, and these stay local to this card. */
const BUTTONS: [string, LucideIcon, 'zoomIn' | 'zoomOut' | 'reset'][] = [
  ['Zoom in', Plus, 'zoomIn'],
  ['Zoom out', Minus, 'zoomOut'],
  ['Reset view', RotateCcw, 'reset'],
];
const btnClass = 'grid size-8 place-items-center rounded-[8px] bg-paper/90 text-ink shadow-[0_1px_2px_rgb(0_0_0/0.08)] ring-1 ring-line backdrop-blur hover:bg-paper';

export type ViewAction = (typeof BUTTONS)[number][2];

/** Zoom and reset buttons over the 3D view, plus the hint shown when someone scrolls without Ctrl. */
export function SceneControls({ onAction, hint }: { onAction: (a: ViewAction) => void; hint: boolean }) {
  return (
    <>
      <div className="absolute right-3 bottom-3 z-20 flex flex-col gap-1.5" role="group" aria-label="3D view">
        {BUTTONS.map(([label, Glyph, action]) => (
          <button key={action} type="button" aria-label={label} title={label} className={btnClass} onClick={() => onAction(action)}>
            <Glyph className="size-4" strokeWidth={1.75} />
          </button>
        ))}
      </div>
      <div
        aria-live="polite"
        className={cx(
          'pointer-events-none absolute inset-x-0 top-3 z-20 mx-auto w-fit rounded-[8px] bg-ink/85 px-3 py-1.5 text-[12.5px] text-paper transition-opacity duration-300',
          hint ? 'opacity-100' : 'opacity-0',
        )}
      >
        Hold Ctrl to zoom · double-click to focus
      </div>
    </>
  );
}
