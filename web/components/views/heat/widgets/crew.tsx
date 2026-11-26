'use client';

import { wbgtSensors } from '@/lib/heat/data';
import type { LiveReadings } from '@/lib/heat/engine';
import { fmtWbgt, nextBand, workRest } from '@/lib/heat/wbgt';
import { Stat, TickBar } from '../../../figures';
import { Card, TEXT } from '../../../ui';

const HOUR = 60;

/** What crews should do right now, set by the hottest sensor: work and rest minutes, and how close the next limit is. */
export function CrewGuidance({ latest }: { latest: LiveReadings }) {
  const read = wbgtSensors.filter((s) => latest[s.id] !== undefined);
  if (!read.length) {
    return <Card tour="heat-crew" title="Crew guidance" sub="Waiting for the first readings"><div className="h-40" /></Card>;
  }
  const hot = read.reduce((m, s) => (latest[s.id] > latest[m.id] ? s : m));
  const v = latest[hot.id];
  const band = workRest(v);
  const next = nextBand(v);
  const inAlarm = read.filter((s) => workRest(latest[s.id]).tone === 'act').length;

  return (
    <Card tour="heat-crew" title="Crew guidance" sub={`Set by ${hot.id}, the hottest sensor`}>
      <div className="grid grid-cols-2 gap-4">
        <Stat label="Work" value={band.work} unit="min / h" size="lg" className={TEXT[band.tone]} />
        <Stat label="Rest in shade" value={HOUR - band.work} unit="min / h" size="lg" />
      </div>
      {/* One tick per minute of the hour: coloured ticks are work, grey ticks are rest. */}
      <TickBar n={band.work} total={HOUR} ticks={HOUR} tone={band.tone} className="h-8" />
      <div className="grid grid-cols-3 gap-4 border-t border-line pt-4">
        <Stat label="Hottest" value={fmtWbgt(v)} unit="°C" />
        {next
          ? <Stat label={`Next limit (${next.short})`} value={fmtWbgt(next.min - v)} unit="°C away" />
          : <Stat label="Stop limit" value={`+${fmtWbgt(v - band.min)}`} unit="°C over" className={TEXT.act} />}
        <Stat label="In alarm" value={`${inAlarm}/${read.length}`} className={inAlarm ? TEXT.act : undefined} />
      </div>
    </Card>
  );
}
