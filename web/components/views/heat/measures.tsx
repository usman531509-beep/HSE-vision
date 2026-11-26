'use client';

import type { Tone } from '@/lib/data';
import { backtest } from '@/lib/heat/data';
import { TickBar } from '../../figures';
import { useHse } from '../../state';
import { Card, cx, Num } from '../../ui';

/** Months from the pilot (November) to the start of the heat season (May). */
const MONTHS_TO_SEASON = 6;

interface Measure { label: string; value: string; n: number; total: number; tone: Tone | 'ink'; rule: string }

/** The proposal's three success measures, each a number over a row of ticks you can count. */
export function PilotMeasures({ jobs, className }: { jobs: number; className?: string }) {
  const { s } = useHse();
  const adopted = Object.values(s.heatDecisions).filter((d) => d === 'yes').length;
  const items: Measure[] = [
    { label: 'Accuracy', value: `${Math.round((backtest.flagged / backtest.total) * 100)}%`, n: backtest.flagged, total: backtest.total, tone: 'low', rule: 'border-low' },
    { label: 'Adoption', value: `${adopted}/${jobs}`, n: adopted, total: Math.max(jobs, 1), tone: 'ink', rule: 'border-ink' },
    { label: 'Season in', value: `${MONTHS_TO_SEASON} mo`, n: 0, total: MONTHS_TO_SEASON, tone: 'watch', rule: 'border-watch' },
  ];

  return (
    <Card tour="heat-measures" className={className} title="Pilot measures" sub={`Back-test ${backtest.season}`}>
      <div className="grid flex-1 grid-cols-3 gap-4">
        {items.map((m) => (
          <div key={m.label} className={cx('flex flex-col justify-between gap-4 border-l pl-3', m.rule)}>
            <div className="flex flex-col gap-1.5">
              <span className="text-[12.5px] text-muted">{m.label}</span>
              <Num value={m.value} className="text-[28px]" />
            </div>
            <TickBar n={m.n} total={m.total} tone={m.tone} />
          </div>
        ))}
      </div>
    </Card>
  );
}
