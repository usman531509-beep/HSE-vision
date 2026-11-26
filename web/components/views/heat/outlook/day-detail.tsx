'use client';

import type { DayOutlook } from '@/lib/heat/outlook/predict';
import { fmtHour, fmtWbgt } from '@/lib/heat/wbgt';
import { Stat, TickBar } from '../../../figures';
import { Chip, cx, Dot, eyebrow, lvl, Table, TEXT, tile } from '../../../ui';

const HOURS = 24;

/** When heavy and hot work fits: outside the hours the hottest area needs heat controls. */
function planText(d: DayOutlook): string {
  if (d.hotFrom === undefined || d.hotTo === undefined) return 'Any time. No heat limits reached.';
  const before = d.hotFrom > 0 ? `before ${fmtHour(d.hotFrom)}` : null;
  const after = d.hotTo < HOURS - 1 ? `after ${fmtHour(d.hotTo + 1)}` : null;
  const window = [before, after].filter(Boolean).join(' or ');
  return window ? `Schedule it ${window}.` : 'Heat controls all day. Keep it to essential work.';
}

/** The picked day: every area's predicted peak and risk, and when to schedule heavy work. */
export function DayDetail({ d }: { d: DayOutlook }) {
  return (
    <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-6 max-nav:grid-cols-1">
      <div className="flex min-w-0 flex-col gap-2">
        <span className={eyebrow}>Predicted per area · {d.date}</span>
        <Table head={['Area', 'Peak WBGT', 'Work-rest', 'Risk']}>
          {d.areas.map((a) => (
            <tr key={a.area.zone}>
              <td>
                <span className="flex items-center gap-2.5">
                  <Dot tone={lvl(a.score)} />
                  {a.area.zone}
                  <span className="font-normal text-muted">{a.area.setting}</span>
                </span>
              </td>
              <td>{fmtWbgt(a.wbgt)} °C</td>
              <td><Chip tone={a.band.tone}>{a.band.short}</Chip></td>
              <td className={cx('font-medium', TEXT[lvl(a.score)])}>{a.score}</td>
            </tr>
          ))}
        </Table>
      </div>
      <div className="flex min-w-0 flex-col gap-4">
        <span className={eyebrow}>At {d.hottest.area.zone}, the hottest area</span>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Stat label="Needs heat controls" value={d.controlHours} unit="h" />
            <TickBar n={d.controlHours} total={HOURS} ticks={HOURS} tone="watch" className="h-7" />
          </div>
          <div className="flex flex-col gap-2">
            <Stat label="Stop non-essential work" value={d.stopHours} unit="h" />
            <TickBar n={d.stopHours} total={HOURS} ticks={HOURS} tone="act" className="h-7" />
          </div>
        </div>
        <div className={cx(tile, 'text-[13px]')}>
          <b className="block font-medium">Heavy and hot work</b>
          <span className="text-ink-2">{planText(d)} Peak around {fmtHour(d.peakHour)}.</span>
        </div>
      </div>
    </div>
  );
}
