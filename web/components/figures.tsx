/* Shared figures: headline stat, sensor spark and the dot-column chart. Cells and dots, one grammar. */
import type { ReactNode } from 'react';
import type { Tone } from '@/lib/data';
import { cx, FILL } from './ui';

/** Soft background for a level, used by floor-plan tiles and the heat map. */
export const TINT: Record<Tone, string> = { act: 'bg-act-bg', watch: 'bg-watch-bg', low: 'bg-lime/60', off: 'bg-sunk', info: 'bg-sunk' };

/** A headline number in the page head: huge, light, with its label and a small badge below. */
export function BigStat({ value, unit, label, badge, title }: { value: ReactNode; unit?: string; label: string; badge?: ReactNode; title?: string }) {
  return (
    <div title={title} className="flex min-w-[112px] flex-col">
      <span className="text-[56px] leading-none font-light tracking-[-0.035em] tabular-nums max-compact:text-[44px]">
        {value}
        {unit ? <span className="ml-1 text-[0.36em] tracking-normal text-soft">{unit}</span> : null}
      </span>
      <span className="mt-2 text-[13px] text-muted">{label}</span>
      <span className="mt-1 flex h-6 items-center">{badge}</span>
    </div>
  );
}

/** Last N readings as rounded bars; the newest takes the level colour. */
export function Spark({ values, tone, className }: { values: number[]; tone: Tone; className?: string }) {
  const max = Math.max(...values), min = Math.min(...values);
  return (
    <div className={cx('grid h-9 items-end gap-[3px]', className)} style={{ gridTemplateColumns: `repeat(${values.length},1fr)` }} aria-hidden="true">
      {values.map((v, i) => {
        const h = max === min ? 70 : 25 + ((v - min) / (max - min)) * 75;
        return <span key={i} className={cx('rounded-[2px]', i === values.length - 1 ? FILL[tone] : 'bg-line-2')} style={{ height: `${h.toFixed(0)}%` }} />;
      })}
    </div>
  );
}

export interface DotColumn { key: string; value: number; tick?: string; strong?: boolean }
export interface DotLine { value: number; className: string }

/** Columns of dots: each column fills up to its value; a row's colour comes from the level it stands for. */
export function DotColumns({ cols, min = 0, max = 100, rows = 10, rowClass, lines = [], label, height = 'h-32' }: {
  cols: DotColumn[]; min?: number; max?: number; rows?: number; rowClass: (level: number) => string; lines?: DotLine[]; label: string; height?: string;
}) {
  const span = max - min;
  const grid = { gridTemplateColumns: `repeat(${cols.length},minmax(0,1fr))` };
  return (
    <div>
      <div className="relative grid gap-[5px]" style={grid} role="img" aria-label={label}>
        {cols.map((c) => {
          const filled = Math.round(((c.value - min) / span) * rows);
          return (
            <div key={c.key} title={`${c.tick ?? c.key} · ${c.value}`} className={cx('grid gap-0.5', height)} style={{ gridTemplateRows: `repeat(${rows},minmax(0,1fr))` }}>
              {Array.from({ length: rows }, (_, k) => {
                const r = rows - 1 - k;
                return <span key={r} className={cx('mx-auto aspect-square h-full max-w-full rounded-[2px]', r < filled ? rowClass(min + ((r + 1) / rows) * span) : 'bg-track')} />;
              })}
            </div>
          );
        })}
        {lines.map((l) => (
          <i key={l.value} className={cx('pointer-events-none absolute -inset-x-1 border-t border-dashed', l.className)} style={{ top: `calc(${(1 - (l.value - min) / span) * 100}% - 1px)` }} />
        ))}
      </div>
      <div className="mt-1.5 grid gap-[5px] text-center text-[11.5px] text-muted tabular-nums" style={grid}>
        {cols.map((c) => <span key={c.key} className={c.strong ? 'font-semibold text-ink' : ''}>{c.tick ?? ''}</span>)}
      </div>
    </div>
  );
}
