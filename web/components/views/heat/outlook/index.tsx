'use client';

import { useState } from 'react';
import { WEIGHTS } from '@/lib/heat/engine';
import { CONFIDENT_DAYS, SITE_LOCATION } from '@/lib/heat/outlook/config';
import { summarise, type DayOutlook } from '@/lib/heat/outlook/predict';
import { fmtWbgt } from '@/lib/heat/wbgt';
import { Stat } from '../../../figures';
import { btn, Card, Chip, Dot, lvl, meta, TEXT } from '../../../ui';
import { DayDetail } from './day-detail';
import { DayStrip } from './day-strip';
import { useOutlook, type LiveState } from './use-outlook';

const pct = (w: number): string => `${Math.round(w * 100)}%`;
const METHOD = `WBGT from forecast air temperature and humidity (BoM method) plus each area's measured offset. Risk = heat ${pct(WEIGHTS.heat)}, routine work ${pct(WEIGHTS.work)}, incident history ${pct(WEIGHTS.history)}. Days after the first ${CONFIDENT_DAYS} are less certain.`;

/** Fetch time in the site's own clock, since that is when the crews read it. */
const siteTime = (iso: string): string =>
  new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: SITE_LOCATION.timeZone });

function subtitle(live: LiveState): string {
  const updated = live.state === 'ready' ? ` · updated ${siteTime(live.series.issued)}` : '';
  return `Open-Meteo forecast for ${SITE_LOCATION.place}${updated}`;
}

function Summary({ days }: { days: DayOutlook[] }) {
  const s = summarise(days);
  return (
    <div className="grid grid-cols-4 gap-4 max-compact:grid-cols-2">
      <Stat label={`Hottest · ${s.hottest.date}`} value={fmtWbgt(s.hottest.hottest.wbgt)} unit="°C WBGT" />
      <Stat label="Days needing heat controls" value={s.controlDays} unit={`of ${days.length}`} />
      <Stat label="Stop-work hours" value={s.stopHours} unit="h" />
      <Stat label="Highest risk score" value={s.topScore} className={TEXT[lvl(s.topScore)]} />
    </div>
  );
}

/** Loading and failure for the live forecast, in the space the outlook will fill. */
function LiveStatus({ live, retry }: { live: LiveState; retry: () => void }) {
  const failed = live.state === 'error';
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-md bg-sunk px-6 text-center" role="status">
      <span className="flex items-center gap-2 text-[13.5px]">
        <Dot tone={failed ? 'act' : 'watch'} className={failed ? '' : 'animate-pulse'} />
        {failed ? live.message : `Fetching the 7-day forecast for ${SITE_LOCATION.place}…`}
      </span>
      {failed ? (
        <button type="button" className={btn('light', 'sm')} onClick={retry}>Try again</button>
      ) : null}
    </div>
  );
}

/** 7-day heat outlook: each day's predicted peak and risk per area, from the site's live weather forecast. */
export function HeatOutlook() {
  const o = useOutlook();
  // Until a day is picked, the hottest one is shown.
  const [picked, setPicked] = useState<number | null>(null);
  const days = o.days;
  const selected = days ? (picked ?? summarise(days).hottest.index) : 0;

  return (
    <Card
      id="outlook"
      tour="heat-outlook"
      title="7-day heat outlook"
      sub={subtitle(o.live)}
      extra={o.live.state === 'ready' ? <Chip tone="low">Live</Chip> : null}
    >
      {days ? (
        <>
          <Summary days={days} />
          <DayStrip days={days} selected={selected} onSelect={setPicked} />
          <DayDetail d={days[selected]} />
          <p className={meta}>{METHOD}</p>
        </>
      ) : (
        <LiveStatus live={o.live} retry={o.retry} />
      )}
    </Card>
  );
}
