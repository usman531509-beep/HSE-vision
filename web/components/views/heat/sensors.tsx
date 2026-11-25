'use client';

import { wbgtSensors } from '@/lib/heat/data';
import type { LiveReadings } from '@/lib/heat/engine';
import { fmtWbgt, workRest, WORK_REST } from '@/lib/heat/wbgt';
import { Spark } from '../../figures';
import type { SensorFeed } from '../../heat/use-sensor-feed';
import { useHse } from '../../state';
import { btn, Card, Chip, cx, Dot, FILL, Icon, meta, Num, tile } from '../../ui';

const STATUS = { live: ['low', 'Streaming'], connecting: ['watch', 'Connecting'], lost: ['act', 'Feed lost'] } as const;
/** WBGT range the work-rest scale spans, °C. */
const SCALE = { min: 26, max: 33 } as const;
/** Height of one sensor-pin row above the scale, px. */
const PIN_ROW = 22;

export function LiveSensors({ feed }: { feed: SensorFeed }) {
  const { set } = useHse();
  const [tone, text] = STATUS[feed.status];
  const alarms = wbgtSensors.filter((s) => feed.latest[s.id] !== undefined && workRest(feed.latest[s.id]).tone === 'act');

  function testSpike(id: string, area: string): void {
    // Jump to today's live shift so the effect on the map is visible straight away.
    set({ heatDay: 0, heatCell: `0|${area}|B` });
    void feed.spike(id);
  }

  return (
    <Card
      id="sensors"
      tour="heat-sensors"
      title={<><Dot tone={tone} className={feed.status === 'live' ? 'animate-pulse' : ''} />WBGT sensors</>}
      sub="Live · every 2 s"
      extra={<Chip tone={tone}>{text}</Chip>}
    >
      {alarms.length ? (
        <div role="alert" className="flex items-center gap-2.5 rounded-md bg-act-bg px-4 py-2.5 text-[13.5px] text-act-ink">
          <Icon name="alert" className="size-[18px]" />
          <b className="font-semibold">Heat alarm</b>
          {alarms.map((s) => <span key={s.id} className="tabular-nums">{s.id} · {fmtWbgt(feed.latest[s.id])} °C</span>)}
          <span className="ml-auto text-[12.5px]">{workRest(feed.latest[alarms[0].id]).label}</span>
        </div>
      ) : null}
      <div className="grid grid-cols-3 gap-4 max-compact:grid-cols-1">
        {wbgtSensors.map((sn) => {
          const series = feed.series[sn.id] ?? [];
          const v = feed.latest[sn.id];
          const band = v === undefined ? undefined : workRest(v);
          return (
            <div key={sn.id} className={cx(tile, 'flex flex-col gap-2.5')}>
              <div className="flex items-start justify-between gap-2">
                <span className="text-[13px] leading-tight"><b className="block font-medium">{sn.id}</b><span className="text-muted">{sn.spot}</span></span>
                {band ? <Chip tone={band.tone}>{band.short}</Chip> : null}
              </div>
              <Num value={v === undefined ? '–' : fmtWbgt(v)} unit="°C" className="text-[28px]" />
              {series.length > 1 && band ? <Spark values={series} tone={band.tone} /> : <div className="h-9" />}
              <button type="button" className={btn('light', 'sm')} disabled={feed.status !== 'live'} onClick={() => testSpike(sn.id, sn.area)}>
                <Icon name="thermo" />Test hot spot
              </button>
            </div>
          );
        })}
      </div>
      {feed.error ? <p className="text-[12.5px] text-act-ink">Hot-spot test failed: {feed.error}</p> : null}
    </Card>
  );
}

const pct = (v: number): number => ((Math.min(Math.max(v, SCALE.min), SCALE.max) - SCALE.min) / (SCALE.max - SCALE.min)) * 100;

/** ACGIH work-rest bands as one scale, with each sensor pinned where it reads now. */
export function WorkRestGuide({ latest }: { latest: LiveReadings }) {
  const bands = WORK_REST.map((b, i) => ({ ...b, from: Math.max(b.min, SCALE.min), to: WORK_REST[i + 1]?.min ?? SCALE.max }));
  const pins = wbgtSensors.filter((s) => latest[s.id] !== undefined).sort((a, b) => latest[a.id] - latest[b.id]);

  return (
    <Card tour="heat-workrest" title="Work-rest guide" sub="Minutes of work / rest per hour · moderate work">
      <div className="relative" style={{ paddingTop: pins.length * PIN_ROW + 8 }}>
        {/* One row per sensor, so readings that sit close together never overlap. */}
        {pins.map((s, i) => (
          <span key={s.id} className="absolute flex -translate-x-1/2 flex-col items-center" style={{ left: `${pct(latest[s.id])}%`, top: i * PIN_ROW }}>
            <span className="rounded-[6px] bg-ink px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap text-paper tabular-nums">{s.id}</span>
            <span className="w-px bg-ink" style={{ height: (pins.length - i) * PIN_ROW - 12 }} />
          </span>
        ))}
        {/* Thin gaps between bands, so two bands of the same colour still read as separate steps. */}
        <div className="flex h-3 gap-[2px]">
          {bands.map((b) => <span key={b.label} className={cx('rounded-[2px]', FILL[b.tone])} style={{ width: `${pct(b.to) - pct(b.from)}%` }} />)}
        </div>
        <div className="relative mt-1.5 h-4 text-[11.5px] text-muted tabular-nums">
          {WORK_REST.slice(1).map((b) => <span key={b.min} className="absolute -translate-x-1/2" style={{ left: `${pct(b.min)}%` }}>{b.min}°</span>)}
        </div>
      </div>
      <div className="grid grid-cols-5 gap-1 text-center text-[12px]">
        {bands.map((b) => (
          <span key={b.label} className="flex flex-col items-center gap-1">
            <Dot tone={b.tone} />
            <b className="font-medium">{b.short}</b>
          </span>
        ))}
      </div>
      <p className={meta}>ACGIH limits for acclimatised workers.</p>
    </Card>
  );
}
