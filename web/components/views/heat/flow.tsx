'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Advice } from '@/lib/heat/advice';
import { areas, wbgtSensors } from '@/lib/heat/data';
import { heatPart, type Cell } from '@/lib/heat/engine';
import { fmtHour, fmtWbgt, forecastWbgt, workRest } from '@/lib/heat/wbgt';
import type { SensorFeed } from '../../heat/use-sensor-feed';
import { Card, Dot, Legend, lvl, meta, Sq } from '../../ui';
import type { HeatScene, SceneState } from './scene/scene';
import { SceneControls, type ViewAction } from './scene-controls';

const FEED = { live: ['low', 'Streaming'], connecting: ['watch', 'Connecting'], lost: ['act', 'Feed lost'] } as const;
const LAYOUT = { zones: areas.map((a) => a.zone), sensors: wbgtSensors.map((s) => ({ id: s.id, area: s.area })) };
const TOMORROW = Array.from({ length: 24 }, (_, h) => 24 + h);
const HINT_MS = 1600;

/** The proposal's Figure 2 as a live 3D scene: inputs fly into the engine, which re-scores the site and feeds the outputs. */
export function DataFlow({ feed, grid, advice }: { feed: SensorFeed; grid: Cell[][]; advice: Advice[] }) {
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<HeatScene | null>(null);
  const [failed, setFailed] = useState(false);
  const [hint, setHint] = useState(false);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [ready, setReady] = useState(false);
  const latest = useRef<SceneState | null>(null);

  const state = useMemo<SceneState>(() => {
    const peak = TOMORROW.reduce((m, h) => (forecastWbgt(h) > forecastWbgt(m) ? h : m));
    const sensors = wbgtSensors.map((s) => {
      const value = feed.latest[s.id];
      return { id: s.id, area: s.area, value, tone: value === undefined ? ('off' as const) : workRest(value).tone, heat: value === undefined ? 0 : heatPart(value) / 100 };
    });
    return {
      // Each column shows the area's worst score still ahead on the chosen day.
      areas: grid.map((row) => {
        const ahead = row.filter((c) => c.time !== 'past');
        const score = Math.max(...(ahead.length ? ahead : row).map((c) => c.score));
        return { zone: row[0].area.zone, score, tone: lvl(score), heat: score / 100 };
      }),
      sensors,
      tick: feed.at,
      forecast: `${fmtWbgt(forecastWbgt(peak))} °C · ${fmtHour(peak)}`,
      forecastHeat: heatPart(forecastWbgt(peak)) / 100,
      jobs: advice.length,
      alarm: sensors.some((s) => s.tone === 'act'),
    };
  }, [feed.latest, feed.at, grid, advice.length]);

  // Start the 3D only when the card nears the viewport, so three.js and 5 MB of models stay off the first load.
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let alive = true;
    const start = (): void => {
      import('./scene/scene')
        .then(({ createHeatScene }) => {
          if (!alive || !host.current) return;
          scene.current = createHeatScene(host.current, LAYOUT, {
            onReady: () => { if (alive) setReady(true); },
            onWheelHint: () => {
              setHint(true);
              clearTimeout(hintTimer.current);
              hintTimer.current = setTimeout(() => setHint(false), HINT_MS);
            },
          });
          if (latest.current) scene.current.update(latest.current);
        })
        .catch((err: unknown) => {
          console.error('[heat scene] could not start 3D view:', err);
          if (alive) setFailed(true);
        });
    };
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); start(); } }, { rootMargin: '200px' });
    io.observe(el);
    return () => { alive = false; io.disconnect(); clearTimeout(hintTimer.current); scene.current?.dispose(); scene.current = null; };
  }, []);

  // Push every new state into the scene; it decides whether to animate a fresh reading.
  useEffect(() => {
    latest.current = state;
    scene.current?.update(state);
  }, [state]);

  const act = (a: ViewAction): void => { scene.current?.[a](); };
  const [tone, text] = FEED[feed.status];
  return (
    <Card tour="heat-flow" title="How HeatShield works" sub="Drag to turn · Ctrl + scroll or pinch to zoom · double-click to focus">
      {failed ? (
        <p className={meta}>3D view is not available in this browser. The map and briefing below show the same scores.</p>
      ) : (
        <div
          ref={host}
          role="region"
          aria-label={`Data flow: ${wbgtSensors.length} WBGT sensors, the weather forecast and IonHSE registers feed the heat-risk engine, which scores ${areas.length} areas and drives the briefing, alarm and Ask.`}
          className="relative h-[460px] cursor-grab overflow-hidden rounded-md bg-sunk active:cursor-grabbing max-compact:h-[320px]"
        >
          {/* Opaque until the lighting and models are in: a half-lit scene looks broken. */}
          {ready ? <SceneControls onAction={act} hint={hint} /> : <span className="absolute inset-0 z-10 grid place-items-center bg-sunk text-[13px] text-muted">Loading site model…</span>}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-[13px] tabular-nums">
          <Dot tone={tone} className={feed.status === 'live' ? 'animate-pulse' : ''} />{text}{feed.at ? ` · ${feed.at}` : ''}
        </span>
        <Legend><span><Sq tone="act" />Act 70+</span><span><Sq tone="watch" />Watch 40–69</span><span><Sq tone="low" />Low</span></Legend>
      </div>
    </Card>
  );
}
