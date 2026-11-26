'use client';

import type { DayOutlook } from '@/lib/heat/outlook/predict';
import { fmtHour, fmtWbgt, WORK_REST, type WorkRest } from '@/lib/heat/wbgt';
import { Chip, cx, FILL, lift, Num, tile } from '../../../ui';

/** 24 hours as thin cells: only hours that need heat controls take a colour, so the hot part of the day stands out. */
function HourBar({ hours }: { hours: WorkRest[] }) {
  return (
    <span className="grid h-2 grid-cols-24 gap-px" aria-hidden="true">
      {hours.map((b, h) => <span key={h} className={cx('rounded-[1px]', b === WORK_REST[0] ? 'bg-line-2' : FILL[b.tone])} />)}
    </span>
  );
}

function DayTile({ d, selected, onSelect }: { d: DayOutlook; selected: boolean; onSelect: () => void }) {
  const { hottest } = d;
  const note = d.relative ?? (d.confident ? null : 'Less certain');
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      aria-label={`${d.date}: ${hottest.area.zone} peaks at ${fmtWbgt(hottest.wbgt)} °C WBGT around ${fmtHour(d.peakHour)}, ${hottest.band.label}. ${d.controlHours} hours need heat controls.`}
      className={cx(
        tile,
        'flex min-w-[124px] flex-1 flex-col gap-2.5 text-left transition-[background-color,box-shadow] duration-150 ease-out hover:bg-line',
        'focus-visible:ring-2 focus-visible:ring-ink/30 focus-visible:outline-none',
        // `!` beats the tile's own background, the same override Card uses for notes.
        selected && cx('bg-paper!', lift),
        // Days past the forecast's reliable range read a touch lighter, so nobody plans on them as firmly.
        !d.confident && !selected && 'opacity-75',
      )}
    >
      <span className="flex flex-col">
        <b className="text-[13px] font-medium">{d.date}</b>
        <span className="h-4 text-[11.5px] text-muted">{note}</span>
      </span>
      <Num value={fmtWbgt(hottest.wbgt)} unit="°C" className="text-[28px] font-light" />
      <Chip tone={hottest.band.tone}>{hottest.band.short}</Chip>
      <HourBar hours={d.hours} />
    </button>
  );
}

/** One tile per day: the hottest area's peak WBGT, its work-rest band and the day's hours that need controls. */
export function DayStrip({ days, selected, onSelect }: { days: DayOutlook[]; selected: number; onSelect: (i: number) => void }) {
  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]" role="group" aria-label="Days in the outlook">
      {days.map((d) => <DayTile key={d.index} d={d} selected={d.index === selected} onSelect={() => onSelect(d.index)} />)}
    </div>
  );
}
