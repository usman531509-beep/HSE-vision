'use client';

import { useMemo } from 'react';
import { adviseDay } from '@/lib/heat/advice';
import { DAYS, type DayIndex } from '@/lib/heat/data';
import { ACT_FROM, scoreDay } from '@/lib/heat/engine';
import { fmtWbgt, workRest } from '@/lib/heat/wbgt';
import { BigStat } from '../../figures';
import { useSensorFeed } from '../../heat/use-sensor-feed';
import { useHse } from '../../state';
import { Chip, Foot, PageHead, Panel, segBtn, segWrap } from '../../ui';
import { HeatAgent } from './agent';
import { Briefing } from './briefing';
import { DataFlow } from './flow';
import { HeatForecast } from './forecast';
import { PilotMeasures } from './measures';
import { RiskMap } from './risk-map';
import { SensorBoard } from './widgets/board';

const twoCols = 'grid grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] gap-(--gutter) max-nav:grid-cols-1';

export function HeatView() {
  const { s, set } = useHse();
  const feed = useSensorFeed();
  const grid = useMemo(() => scoreDay(s.heatDay, feed.latest), [s.heatDay, feed.latest]);
  const advice = useMemo(() => adviseDay(s.heatDay, feed.latest), [s.heatDay, feed.latest]);

  const ahead = grid.flat().filter((c) => c.time !== 'past');
  const hottest = ahead.reduce((m, c) => (c.wbgt > m.wbgt ? c : m), ahead[0]);
  const atAct = ahead.filter((c) => c.score >= ACT_FROM).length;
  const pending = advice.filter((a) => !s.heatDecisions[a.id]).length;
  const band = workRest(hottest.wbgt);

  return (
    <>
      <PageHead
        title="Heat risk"
        desc="Forecasts heat stress per area and shift, and moves work before the heat peaks."
        tools={
          <div className={segWrap} role="group" aria-label="Day" data-tour="heat-day">
            {DAYS.map((d, i) => (
              <button key={d.label} type="button" className={segBtn} aria-pressed={s.heatDay === i} onClick={() => set({ heatDay: i as DayIndex })}>
                {d.label} · {d.date}
              </button>
            ))}
          </div>
        }
        aside={
          <div className="flex flex-wrap gap-x-10 gap-y-4" data-tour="heat-stats">
            <BigStat value={fmtWbgt(hottest.wbgt)} unit="°C" label={`Peak WBGT · ${hottest.area.zone}`} badge={<Chip tone={band.tone}>{band.short}</Chip>} title={band.label} />
            <BigStat value={atAct} label="Area-shifts at Act" badge={<Chip tone={atAct ? 'act' : 'low'}>{atAct ? 'Act' : 'Clear'}</Chip>} />
            <BigStat value={advice.length} label="Jobs to change" badge={pending ? <Chip tone="watch">{pending} to decide</Chip> : undefined} />
          </div>
        }
      />
      <Panel>
        <DataFlow feed={feed} grid={grid} advice={advice} />
        <SensorBoard feed={feed} pending={pending} />
        <div className={twoCols}>
          <HeatForecast />
          <PilotMeasures jobs={advice.length} />
        </div>
        <RiskMap grid={grid} />
        <div className={twoCols}>
          <Briefing advice={advice} grid={grid} />
          <HeatAgent live={feed.latest} />
        </div>
        <Foot
          left="Pilot preview · sample data · simulated sensor gateway."
          right="A qualified person approves every schedule change."
        />
      </Panel>
    </>
  );
}
