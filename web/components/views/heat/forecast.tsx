'use client';

import { useState } from 'react';
import { DAYS } from '@/lib/heat/data';
import { fmtHour, fmtWbgt, forecastWbgt, peakHour, workRest } from '@/lib/heat/wbgt';
import { Lollipops } from '../../lollipops';
import { useHse } from '../../state';
import { Card, Chip, Num } from '../../ui';

/** One column per two hours keeps the chips readable; each shows the hotter hour of its pair. */
const STEP = 2;
const RANGE = { min: 18, max: 34 } as const;

/** The day's WBGT as lollipops. Pick a column to read it; the hottest is picked first. */
export function HeatForecast() {
  const { s } = useHse();
  const cols = Array.from({ length: 24 / STEP }, (_, i) => {
    const pair = [0, 1].map((k) => s.heatDay * 24 + i * STEP + k);
    const h = pair.reduce((m, x) => (forecastWbgt(x) > forecastWbgt(m) ? x : m));
    const value = Math.round(forecastWbgt(h) * 10) / 10;
    return { key: String(h), hour: h, label: fmtHour(i * STEP).slice(0, 2), value, title: `${fmtHour(h)} · ${fmtWbgt(value)} °C WBGT · ${workRest(value).short}` };
  });
  const peakCol = Math.floor((peakHour(s.heatDay) % 24) / STEP);
  // Picks are per day; null falls back to the peak.
  const [picked, setPicked] = useState<Record<number, number | null>>({});
  const at = picked[s.heatDay] ?? peakCol;
  const c = cols[at];
  const band = workRest(c.value);

  return (
    <Card id="forecast" tour="heat-forecast" title="Heat through the day" sub={`Outdoor WBGT · ${DAYS[s.heatDay].label.toLowerCase()}`}>
      <div className="grid grid-cols-[160px_minmax(0,1fr)] items-end gap-6 max-compact:grid-cols-1">
        <div className="flex flex-col gap-2 pb-2">
          <Num value={fmtWbgt(c.value)} unit="°C" className="text-[48px] font-light" />
          <span className="text-[13px] text-muted">{at === peakCol ? 'Peak' : 'Forecast'} at {fmtHour(c.hour)}</span>
          <span><Chip tone={band.tone}>{band.short}</Chip></span>
        </div>
        <Lollipops
          cols={cols}
          min={RANGE.min}
          max={RANGE.max}
          selected={at}
          onSelect={(i) => setPicked((p) => ({ ...p, [s.heatDay]: i }))}
          tone={(v) => workRest(v).tone}
          format={(v) => `${fmtWbgt(v)}°`}
          label={`Hourly WBGT forecast, ${DAYS[s.heatDay].label}`}
        />
      </div>
    </Card>
  );
}
