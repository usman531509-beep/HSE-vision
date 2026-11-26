'use client';

import { fmtHour, fmtWbgt, forecastWbgt, WORK_REST } from '@/lib/heat/wbgt';
import { DotColumns } from '../../figures';
import { useHse } from '../../state';
import { Card, Legend, Sq } from '../../ui';

const RANGE = { min: 18, max: 34, rows: 8 } as const;
/** Work-rest starts at the first band above "continuous"; "stop" is the last band. */
const REST_FROM = WORK_REST[1].min;
const STOP_AT = WORK_REST[WORK_REST.length - 1].min;
const TICK_EVERY = 3;

export function HeatForecast() {
  const { s } = useHse();
  const hours = Array.from({ length: 24 }, (_, h) => s.heatDay * 24 + h);
  const peak = hours.reduce((m, h) => (forecastWbgt(h) > forecastWbgt(m) ? h : m));
  const cols = hours.map((h) => ({
    key: String(h),
    value: Math.round(forecastWbgt(h) * 10) / 10,
    tick: h % TICK_EVERY === 0 ? fmtHour(h).slice(0, 2) : undefined,
    strong: h === peak,
  }));

  return (
    <Card tour="heat-forecast" title="Heat through the day" sub={`Outdoor WBGT · peak ${fmtWbgt(forecastWbgt(peak))} °C at ${fmtHour(peak)}`}>
      <DotColumns
        cols={cols}
        min={RANGE.min}
        max={RANGE.max}
        rows={RANGE.rows}
        rowClass={(level) => (level > STOP_AT ? 'bg-act' : level > REST_FROM ? 'bg-watch' : 'bg-teal')}
        lines={[{ value: REST_FROM, className: 'border-watch' }, { value: STOP_AT, className: 'border-act' }]}
        label={'Hourly WBGT forecast: ' + cols.map((c) => `${fmtHour(Number(c.key))} ${c.value}`).join(', ')}
      />
      <Legend>
        <span><Sq tone="act" />Stop work {STOP_AT}+</span>
        <span><Sq tone="watch" />Work-rest {REST_FROM}+</span>
        <span><i className="inline-block size-2.5 rounded-[2px] bg-teal" />Continuous</span>
      </Legend>
    </Card>
  );
}
