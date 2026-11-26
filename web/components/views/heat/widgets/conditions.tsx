'use client';

import { CloudSun, Droplets, Sun, ThermometerSun, type LucideIcon } from 'lucide-react';
import { forecast, FORECAST_ISSUED, NOW } from '@/lib/heat/data';
import { fmtHour, fmtWbgt, forecastWbgt, NOW_HOUR, peakHour } from '@/lib/heat/wbgt';
import { Card, Num } from '../../../ui';

const TOMORROW = 1;

/** `title` is the full name, for the tooltip and screen readers; `label` is the short caption. */
function Reading({ icon: I, value, label, title }: { icon: LucideIcon; value: string; label: string; title: string }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5" title={title} aria-label={`${title}: ${value}`}>
      <I aria-hidden="true" strokeWidth={1.75} className="size-[18px] flex-none text-muted" />
      <span className="flex min-w-0 flex-col">
        <b className="text-[13.5px] leading-tight font-medium tabular-nums">{value}</b>
        <span className="truncate text-[11.5px] text-muted">{label}</span>
      </span>
    </span>
  );
}

/** Site weather now from the forecast feed, with the WBGT it implies and tomorrow's peak. */
export function SiteNow() {
  const h = Math.floor(NOW_HOUR);
  const peak = peakHour(TOMORROW);
  return (
    <Card title="Site now" sub={`${String(NOW.hour).padStart(2, '0')}:${String(NOW.minute).padStart(2, '0')} · forecast issued ${FORECAST_ISSUED}`}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <Num value={forecast.temp[h]} unit="°C" className="text-[44px]" />
          <span className="mt-1.5 block text-[12.5px] text-muted">Air temperature</span>
        </div>
        <CloudSun aria-hidden="true" strokeWidth={1.25} className="size-16 text-watch" />
      </div>
      <div className="mt-auto grid grid-cols-3 gap-3 rounded-md bg-sunk px-4 py-3">
        <Reading icon={Droplets} value={`${forecast.rh[h]}%`} label="Humidity" title="Relative humidity" />
        <Reading icon={ThermometerSun} value={`${fmtWbgt(forecastWbgt(NOW_HOUR))}°`} label="WBGT now" title="Outdoor WBGT now" />
        <Reading icon={Sun} value={`${fmtWbgt(forecastWbgt(peak))}°`} label={`Tmrw ${fmtHour(peak)}`} title="Tomorrow's peak WBGT" />
      </div>
    </Card>
  );
}
