'use client';

import type { WbgtSensor } from '@/lib/heat/data';
import { fmtWbgt, nextBand, workRest } from '@/lib/heat/wbgt';
import { Spark } from '../../../figures';
import { btn, Card, Chip, Icon, meta, Num } from '../../../ui';
import { WbgtGauge } from './gauge';

/** One WBGT sensor as a widget: the dial, the reading with its work-rest rule, the recent trend and the test button. */
export function SensorWidget({ sensor, value, series, live, onTest }: {
  sensor: WbgtSensor; value: number | undefined; series: number[]; live: boolean; onTest: () => void;
}) {
  const band = value === undefined ? undefined : workRest(value);
  const next = value === undefined ? undefined : nextBand(value);
  // The chip already names the band, so the line under the reading says how close the next one is.
  const headroom = value === undefined ? 'Connecting' : next ? `${fmtWbgt(next.min - value)} °C to ${next.short}` : 'Past the stop limit';
  return (
    <Card
      title={sensor.id}
      sub={sensor.spot}
      extra={band ? <Chip tone={band.tone}>{band.short}</Chip> : null}
      className="gap-2"
    >
      <WbgtGauge value={value} label={value === undefined ? `${sensor.id}: waiting for a reading` : `${sensor.id}: ${fmtWbgt(value)} °C WBGT, ${band?.label}`} />
      <div className="flex flex-col items-center gap-1 text-center">
        <Num value={value === undefined ? '–' : fmtWbgt(value)} unit="°C" className="text-[34px]" />
        <span className={meta}>{headroom}</span>
      </div>
      <div className="mt-2 flex items-end gap-3">
        {series.length > 1 && band ? <Spark values={series} tone={band.tone} className="flex-1" /> : <div className="h-9 flex-1" />}
        <button type="button" className={btn('light', 'sm')} disabled={!live} onClick={onTest}>
          <Icon name="thermo" />Test hot spot
        </button>
      </div>
    </Card>
  );
}
