'use client';

import { wbgtSensors } from '@/lib/heat/data';
import { fmtWbgt, workRest } from '@/lib/heat/wbgt';
import type { SensorFeed } from '../../../heat/use-sensor-feed';
import { useHse } from '../../../state';
import { Chip, Icon } from '../../../ui';
import { SiteNow } from './conditions';
import { CrewGuidance } from './crew';
import { SensorWidget } from './sensor';
import { Shortcuts } from './shortcuts';

const FEED = { live: ['low', 'Streaming'], connecting: ['watch', 'Connecting'], lost: ['act', 'Feed lost'] } as const;
/** The shift the demo clock sits in, so a hot-spot test lands on the cell being watched. */
const LIVE_SHIFT = 'B';

/** Live sensors and what they mean, as a board of widgets: one dial per sensor, then guidance, weather and shortcuts. */
export function SensorBoard({ feed, pending }: { feed: SensorFeed; pending: number }) {
  const { set } = useHse();
  const live = feed.status === 'live';
  const [tone, text] = FEED[feed.status];
  const alarms = wbgtSensors.filter((s) => feed.latest[s.id] !== undefined && workRest(feed.latest[s.id]).tone === 'act');

  function testSpike(id: string, area: string): void {
    // Jump to today's live shift so the effect on the map is visible straight away.
    set({ heatDay: 0, heatCell: `0|${area}|${LIVE_SHIFT}` });
    void feed.spike(id);
  }

  return (
    <div id="sensors" className="flex scroll-mt-24 flex-col gap-(--gutter)">
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <h2 className="text-[15px] font-medium tracking-[-0.01em]">WBGT sensors <span className="font-normal text-muted">· live every 2 s</span></h2>
        {live ? null : <Chip tone={tone}>{text}</Chip>}
      </div>
      {alarms.length ? (
        <div role="alert" className="flex flex-wrap items-center gap-2.5 rounded-md bg-act-bg px-4 py-2.5 text-[13.5px] text-act-ink">
          <Icon name="alert" className="size-[18px]" />
          <b className="font-semibold">Heat alarm</b>
          {alarms.map((s) => <span key={s.id} className="tabular-nums">{s.id} · {fmtWbgt(feed.latest[s.id])} °C</span>)}
          <span className="ml-auto text-[12.5px]">{workRest(feed.latest[alarms[0].id]).label}</span>
        </div>
      ) : null}
      <div data-tour="heat-sensors" className="grid grid-cols-3 gap-(--gutter) max-compact:grid-cols-1">
        {wbgtSensors.map((s) => (
          <SensorWidget key={s.id} sensor={s} value={feed.latest[s.id]} series={feed.series[s.id] ?? []} live={live} onTest={() => testSpike(s.id, s.area)} />
        ))}
      </div>
      {feed.error ? <p className="text-[12.5px] text-act-ink">Hot-spot test failed: {feed.error}</p> : null}
      <div className="grid grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,0.85fr)] gap-(--gutter) max-nav:grid-cols-2 max-compact:grid-cols-1">
        <CrewGuidance latest={feed.latest} />
        <SiteNow />
        <Shortcuts pending={pending} />
      </div>
    </div>
  );
}
