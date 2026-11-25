'use client';

import { useEffect, useRef, useState } from 'react';
import type { Sim, SimEvent, SimTick } from '../spatial/sim';
import { CCTV } from '../spatial/sim';
import { btn, Card, Chip, cx, Foot, Icon, Legend, list, meta, Num, PageHead, Panel, SEV, segBtn, segWrap, Sq } from '../ui';

const OPTIONS = [['cones', 'Camera cones'], ['zones', 'Danger zones'], ['labels', 'Labels']] as const;
type Opt = (typeof OPTIONS)[number][0];

export function SpatialView() {
  const host = useRef<HTMLDivElement>(null);
  const feedHost = useRef<HTMLDivElement>(null);
  const overlay = useRef<HTMLCanvasElement>(null);
  const sim = useRef<Sim | null>(null);
  const [cam, setCam] = useState('CAM 03');
  const [tick, setTick] = useState<SimTick | null>(null);
  const [events, setEvents] = useState<SimEvent[]>([]);
  const [opts, setOpts] = useState<Record<Opt, boolean>>({ cones: true, zones: true, labels: true });
  const [paused, setPaused] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    let s: Sim | null = null;
    import('../spatial/sim').then(({ createSim }) => {
      if (!alive || !host.current || !feedHost.current || !overlay.current) return;
      try {
        s = createSim(host.current, feedHost.current, overlay.current, {
          onTick: (t) => setTick(t),
          onEvent: (e) => { if (alive) setEvents((p) => [e, ...p.filter((x) => x.key !== e.key)].slice(0, 40)); },
          onPickCam: (id) => setCam(id),
        });
        sim.current = s;
      } catch {
        setFailed(true);
      }
    });
    return () => { alive = false; s?.dispose(); sim.current = null; setEvents([]); };
  }, []);

  useEffect(() => { sim.current?.select(cam); }, [cam, tick === null]);

  const c = CCTV.find((x) => x.id === cam)!;
  const toggle = (k: Opt) => setOpts((o) => { const v = !o[k]; sim.current?.set(k, v); return { ...o, [k]: v }; });
  const pause = () => setPaused((p) => { sim.current?.set('paused', !p); return !p; });
  const alerts = tick?.detections.filter((d) => d.sev !== 'Low').length ?? 0;

  return (
    <>
      <PageHead
        title="Spatial view"
        desc="A live 3D model of the hall. Every person and vehicle the cameras see is placed on the floor and checked against danger zones, walkways and safety-gear rules."
        tools={
          <>
            <div className={segWrap} role="group" aria-label="Show in model" data-tour="spatial-layers">
              {OPTIONS.map(([k, label]) => (
                <button key={k} type="button" className={segBtn} aria-pressed={opts[k]} onClick={() => toggle(k)}>{label}</button>
              ))}
            </div>
            <button type="button" className={btn('light')} onClick={pause} data-tour="spatial-pause">{paused ? 'Resume' : 'Pause'}</button>
            <button type="button" className={btn('light')} onClick={() => sim.current?.home()}><Icon name="refresh" />Reset view</button>
          </>
        }
        aside={
          <div className="flex flex-wrap gap-x-8 gap-y-3" data-tour="spatial-stats">
            <Stat label="People tracked" value={tick ? String(tick.people) : '–'} />
            <Stat label="Hard hats on" value={tick ? `${tick.helmets}/${tick.people}` : '–'} tone={tick && tick.helmets < tick.people ? 'act' : undefined} />
            <Stat label="Machine stops" value={tick ? String(tick.stops) : '–'} tone={tick?.stops ? 'act' : undefined} />
            <Stat label="Near-misses" value={tick ? String(tick.nearMisses) : '–'} tone={tick?.nearMisses ? 'watch' : undefined} />
          </div>
        }
      />
      <Panel>
        <div className="grid grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] gap-4 max-nav:grid-cols-1">
          <Card
            tour="spatial-model"
            title="Hall model"
            sub="Drag to orbit, scroll to zoom. Click a camera to watch it."
            extra={<span className="text-[12.5px] text-muted tabular-nums">Site time {tick?.time ?? '–'}</span>}
          >
            <div ref={host} className="relative h-[560px] overflow-hidden rounded-md bg-sunk max-compact:h-[420px]" role="img" aria-label="3D model of the hall with workers, a forklift and cameras">
              {failed ? <p className="absolute inset-0 grid place-items-center text-[13px] text-muted">3D view needs WebGL, which this browser has turned off.</p> : null}
            </div>
            <Legend>
              <span><Sq tone="act" />Rule broken</span>
              <span><Sq tone="watch" />Warning</span>
              <span><Sq tone="low" />Safe</span>
              <span><i className="inline-block h-2.5 w-4 rounded-[2px] bg-[repeating-linear-gradient(135deg,#c8343d_0_3px,#efd3cf_3px_6px)]" />Danger zone</span>
              <span><i className="inline-block h-2.5 w-4 rounded-[2px] bg-[repeating-linear-gradient(135deg,#58a88f_0_3px,#dbe8e1_3px_6px)]" />Walkway</span>
            </Legend>
          </Card>

          <div className="flex min-w-0 flex-col gap-4">
            <Card
              tour="spatial-feed"
              title={<>{c.name} <Chip tone={c.offline ? 'off' : alerts ? 'act' : 'low'}>{c.offline ? 'Offline' : alerts ? `${alerts} alert${alerts > 1 ? 's' : ''}` : 'All clear'}</Chip></>}
              sub={`${c.id} · rendered from the camera's position in the model`}
              extra={<button type="button" className={btn('light', 'sm')} onClick={() => sim.current?.lookThrough(cam)}>Fly to camera</button>}
            >
              <div ref={feedHost} className="relative aspect-video overflow-hidden rounded-md bg-cam text-cam-ink">
                <canvas ref={overlay} className="pointer-events-none absolute inset-0 size-full" />
                <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-between bg-black/45 px-3 py-1.5 text-[11.5px] font-medium tabular-nums">
                  <span className="inline-flex items-center gap-1.5 before:size-1.5 before:rounded-[2px] before:bg-act">REC · {c.id}</span>
                  <span>{tick?.time ?? ''}</span>
                </div>
                {c.offline ? (
                  <div className="absolute inset-0 grid place-items-center text-[13px] text-cam-ink/70">
                    <span className="inline-flex items-center gap-2"><Icon name="camera" />Camera offline since 17:12</span>
                  </div>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Choose camera" data-tour="spatial-cams">
                {CCTV.map((x) => {
                  const n = tick?.camCounts[x.id];
                  return (
                    <button
                      key={x.id}
                      type="button"
                      aria-pressed={x.id === cam}
                      onClick={() => setCam(x.id)}
                      className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-paper px-2.5 text-[12px] font-medium text-ink-2 ring-1 ring-line hover:bg-sunk aria-pressed:bg-ink aria-pressed:text-paper aria-pressed:ring-ink"
                    >
                      {x.id.replace('CAM ', 'C')}
                      {x.offline ? <span className="text-[11px] text-soft">off</span> : n?.alerts ? <span className="size-1.5 rounded-[2px] bg-act" /> : null}
                    </button>
                  );
                })}
              </div>
              <div data-tour="spatial-detections">
                <div className="mb-1 text-[12.5px] font-medium text-muted">Detections in view</div>
                {tick?.detections.length ? (
                  <ul className="flex flex-col">
                    {tick.detections.map((d) => (
                      <li key={d.id} className="flex items-center justify-between gap-3 border-t border-line py-2 text-[13px] first:border-t-0">
                        <span className="min-w-0 truncate">{d.label}</span>
                        <span className="flex flex-none items-center gap-3">
                          <span className="text-[12px] text-soft tabular-nums">{d.conf.toFixed(2)}</span>
                          <Chip tone={SEV[d.sev]}>{d.sev === 'Low' ? 'OK' : d.sev}</Chip>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : <p className={meta}>{c.offline ? 'No feed.' : 'Nothing detected in this view right now.'}</p>}
              </div>
            </Card>
          </div>
        </div>

        <Card tour="spatial-events" title="Spatial events" sub="Raised by the rules engine from positions in the model, with the cameras that saw it.">
          <div className={cx(list, 'max-h-[340px] overflow-y-auto')}>
            {events.length ? events.map((e) => (
              <div key={e.key} className="flex items-center gap-3 border-t border-line px-1 py-2.5 first:border-t-0">
                <span className="w-[70px] flex-none text-[12.5px] text-muted tabular-nums">{e.time}</span>
                <span className="min-w-0 flex-1">
                  <b className="block text-[13.5px] font-medium">{e.where} · {e.what}</b>
                  <span className={meta}>{e.cams.length ? `Seen by ${e.cams.join(', ')}` : 'Outside camera coverage'}</span>
                </span>
                <span className="flex flex-none items-center gap-2">
                  {e.cams[0] ? <button type="button" className={btn('light', 'sm')} onClick={() => setCam(e.cams[0])}>Watch</button> : null}
                  <Chip tone={SEV[e.sev]}>{e.sev}</Chip>
                </span>
              </div>
            )) : <p className={meta}>Waiting for the first event…</p>}
          </div>
        </Card>
        <Foot left="Simulation for the pilot preview. Workers, vehicles and camera views are rendered from the model, not recorded footage." />
      </Panel>
    </>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'act' | 'watch' }) {
  return (
    <div className="min-w-[96px]">
      <Num value={value} className={cx('text-[40px]', tone === 'act' && 'text-act-ink', tone === 'watch' && 'text-watch-ink')} />
      <div className="mt-1 text-[13px] text-muted">{label}</div>
    </div>
  );
}
