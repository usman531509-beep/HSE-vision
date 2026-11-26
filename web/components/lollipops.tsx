'use client';

import type { Tone } from '@/lib/data';
import { cx, FILL } from './ui';

export interface Lollipop { key: string; label: string; value: number; title: string }

/** Height of the stem area, px. Chips sit below it. */
const PLOT_H = 180;
/** Lowest a dot sits, as a share of the plot, so short stems stay visible. */
const FLOOR = 0.12;

/**
 * Lollipop columns: a thin stem and a dot per column, a round chip under each, and the selected column lifted
 * onto a soft pill with its value in a dark bubble. Each column is a button, so the chart is also the picker.
 */
export function Lollipops({ cols, min, max, selected, onSelect, tone, format, label }: {
  cols: Lollipop[]; min: number; max: number; selected: number; onSelect: (i: number) => void;
  tone: (value: number) => Tone; format: (value: number) => string; label: string;
}) {
  const share = (v: number): number => FLOOR + (1 - FLOOR) * Math.min(1, Math.max(0, (v - min) / (max - min)));
  return (
    <div role="group" aria-label={label} className="grid gap-1" style={{ gridTemplateColumns: `repeat(${cols.length},minmax(0,1fr))` }}>
      {cols.map((c, i) => {
        const on = i === selected;
        const top = PLOT_H * (1 - share(c.value));
        return (
          <button
            key={c.key}
            type="button"
            aria-pressed={on}
            aria-label={c.title}
            title={c.title}
            onClick={() => onSelect(i)}
            className={cx('group relative flex flex-col items-center rounded-full pt-9 pb-1.5 transition-colors duration-200 ease-out', on ? 'bg-sunk' : 'hover:bg-sunk/60')}
          >
            <span className="relative w-full" style={{ height: PLOT_H }}>
              {on ? (
                <span className="absolute left-1/2 -translate-x-1/2 -translate-y-full rounded-full bg-ink px-2 py-0.5 text-[11.5px] font-medium whitespace-nowrap text-paper tabular-nums" style={{ top: top - 8 }}>
                  {format(c.value)}
                </span>
              ) : null}
              <span className={cx('absolute left-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full', FILL[tone(c.value)])} style={{ top }} />
              <span className="absolute bottom-0 left-1/2 w-px -translate-x-1/2 bg-line-2" style={{ top: top + 8 }} />
            </span>
            <span className={cx('mt-2 grid size-8 place-items-center rounded-full text-[11.5px] tabular-nums transition-colors duration-200', on ? 'bg-ink text-paper' : 'bg-sunk text-ink-2 group-hover:bg-line')}>
              {c.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
