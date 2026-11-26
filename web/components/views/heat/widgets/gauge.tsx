'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import type { Arc, Labels, PointerProps } from 'react-gauge-component';
import { WORK_REST, workRest } from '@/lib/heat/wbgt';
import { TICK_MS } from '@/lib/heat/feed';
import { useToneColors, type ToneColors } from '../../../heat/use-tokens';

/** WBGT span of the dial, °C: from comfortably normal to past the stop-work limit. */
export const DIAL = { min: 26, max: 33 } as const;
// Capped so a single-column phone layout doesn't stack three full-width dials.
const BOX = 'mx-auto aspect-[2/1] w-full max-w-[300px]';
/** The needle settles well inside one feed tick, so it never lags a reading behind. */
const NEEDLE_MS = Math.round(TICK_MS * 0.45);
/** Bands the needle is not in fade back, so the current one stands out. */
const IDLE_ALPHA = 0.25;

/** A hex token (#rrggbb) at the given opacity. */
function withAlpha(hex: string, alpha: number): string {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) throw new Error(`Expected a #rrggbb colour token, got "${hex}"`);
  return `rgb(${parseInt(m[1], 16)} ${parseInt(m[2], 16)} ${parseInt(m[3], 16)} / ${alpha})`;
}

// react-gauge-component draws with d3 in the browser: client only, and out of the page's first bundle.
const GaugeComponent = dynamic(() => import('react-gauge-component'), { ssr: false, loading: () => <div className={BOX} /> });

/** One sub-arc per ACGIH work-rest band, so the dial reads exactly like the work-rest rules. */
function config(c: ToneColors, active: number): { arc: Arc; labels: Labels; pointer: PointerProps } {
  const tick = { style: { fontSize: '10px', fill: c.muted, textShadow: 'none', fontFamily: 'inherit' } };
  return {
    arc: {
      width: 0.16,
      padding: 0.02,
      cornerRadius: 2,
      subArcs: WORK_REST.map((b, i) => ({
        limit: WORK_REST[i + 1]?.min ?? DIAL.max,
        color: i === active ? c[b.tone] : withAlpha(c[b.tone], IDLE_ALPHA),
        tooltip: { text: b.label },
      })),
    },
    labels: {
      valueLabel: { hide: true },
      tickLabels: {
        type: 'outer',
        ticks: [DIAL.min, ...WORK_REST.slice(1).map((b) => b.min), DIAL.max].map((value) => ({ value })),
        defaultTickValueConfig: { ...tick, formatTextValue: (v: number) => `${v}°` },
        defaultTickLineConfig: { color: c.line, length: 4, width: 1 },
      },
    },
    pointer: { type: 'needle', color: c.ink, baseColor: c.ink, length: 0.7, width: 8, animationDuration: NEEDLE_MS, elastic: false, maxFps: 30 },
  };
}

/** Semicircle WBGT dial with the five work-rest bands and a live needle. The reading itself is shown by the caller. */
export function WbgtGauge({ value, label }: { value: number | undefined; label: string }) {
  const colors = useToneColors();
  const active = value === undefined ? -1 : WORK_REST.indexOf(workRest(value));
  // Rebuilt only when the band changes: the library redraws its arcs when these objects change.
  const cfg = useMemo(() => (colors ? config(colors, active) : null), [colors, active]);
  if (!cfg || value === undefined) return <div className={BOX} />;
  return (
    <div role="img" aria-label={label} className={BOX}>
      <GaugeComponent
        type="semicircle"
        minValue={DIAL.min}
        maxValue={DIAL.max}
        value={Math.min(Math.max(value, DIAL.min), DIAL.max)}
        marginInPercent={{ top: 0.03, bottom: 0, left: 0.08, right: 0.08 }}
        arc={cfg.arc}
        labels={cfg.labels}
        pointer={cfg.pointer}
      />
    </div>
  );
}
