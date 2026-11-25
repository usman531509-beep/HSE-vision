'use client';

import Image from 'next/image';
import { cams, floorStats, machines, machineState, plan, sensors, type Sev } from '@/lib/data';
import { useHse } from '../state';
import { Card, Chip, cx, Dot, eyebrow, Foot, Icon, Legend, meta, Num, PageHead, Panel, SEV, Sq, Table, tile } from '../ui';

const BOX: Partial<Record<Sev, string>> = { High: '#ff6a5a', Medium: '#f6b43e', Low: '#35c877' };
const PLAN_TONE = { act: 'bg-act-bg', watch: 'bg-watch-bg', low: 'bg-lime/60', off: 'bg-sunk', info: 'bg-sunk' };
const SPARK_LAST = { act: 'bg-act', watch: 'bg-watch', low: 'bg-low', off: 'bg-off', info: 'bg-off' };

export function LiveView() {
  const { s, set } = useHse();
  const c = cams.find((x) => x.id === s.cam) ?? cams[0];

  return (
    <>
      <PageHead
        title="Live floor"
        desc="What the cameras and sensors see right now, zone by zone."
        tools={
          <div className="flex flex-wrap gap-[18px] text-[13px] text-muted">
            {floorStats.map((f) => <span key={f[1]}><b className="mr-1 font-semibold text-ink tabular-nums">{f[0]}</b>{f[1]}</span>)}
          </div>
        }
      />
      <Panel>
        <div className="grid grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] gap-4 max-nav:grid-cols-1">
          <Card tour="camera" title={<>{c.name} <Chip tone={SEV[c.sev]}>{c.status}</Chip></>} sub={`${c.id} · ${c.zone}`}>
            <div className="relative aspect-video overflow-hidden rounded-[18px] bg-cam text-cam-ink" role="img" aria-label={`Camera view of ${c.name}: ${c.summary}`}>
              {c.img ? (
                <Image key={c.id} src={c.img} alt="" fill priority sizes="(max-width: 1100px) 100vw, 60vw" className="object-cover brightness-[.82] saturate-[.85]" />
              ) : (
                <div className="absolute inset-x-0 bottom-0 h-[34%] border-t border-cam-ink/8 bg-cam-floor" />
              )}
              {c.sev === 'Off' ? (
                <div className="absolute inset-0 grid place-items-center bg-cam text-[13px] text-cam-ink/70">
                  <span className="inline-flex items-center gap-2"><Icon name="camera" />Camera offline</span>
                </div>
              ) : (
                <>
                  {c.boxes.map((b, i) => (
                    <div key={i} className="absolute rounded-[3px] border-2" style={{ left: `${b.l}%`, top: `${b.t}%`, width: `${b.w}%`, height: `${b.h}%`, borderColor: BOX[b.sev] }}>
                      <span className={cx('absolute rounded-[3px] px-1.5 py-0.5 text-[11.5px] font-semibold whitespace-nowrap text-[#111]', b.t < 12 ? 'top-0 left-0' : '-top-[22px] -left-0.5')} style={{ background: BOX[b.sev] }}>{b.label}</span>
                    </div>
                  ))}
                  <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-black/45 px-3.5 py-2 text-xs font-medium tabular-nums">
                    <span>{c.id} · {c.name}</span>
                    <span className="inline-flex items-center gap-1.5 before:size-1.5 before:rounded-[2px] before:bg-act">REC</span>
                  </div>
                </>
              )}
            </div>
            <p className="text-sm">{c.summary}</p>
            <div className="grid grid-cols-4 gap-2 max-compact:grid-cols-2" role="group" aria-label="Choose camera">
              {cams.map((x) => (
                <button
                  key={x.id}
                  type="button"
                  aria-pressed={x.id === c.id}
                  onClick={() => set({ cam: x.id })}
                  className="flex flex-col items-start gap-0.5 rounded-md bg-sunk px-3 py-2.5 text-left hover:bg-sage aria-pressed:bg-sage"
                >
                  <b className="flex items-center gap-[7px] text-[12.5px] font-semibold"><Dot tone={SEV[x.sev]} />{x.id}</b>
                  <span className="text-xs text-muted">{x.name}</span>
                </button>
              ))}
            </div>
          </Card>

          <Card tour="plan" title="Floor plan" sub="Zone level and people on the floor now">
            <div className="grid grid-cols-4 grid-rows-[repeat(3,88px)] gap-1.5 max-compact:grid-rows-[repeat(3,76px)]">
              {plan.map(([name, col, r, cs, rs, sev, people]) => {
                const t = SEV[sev];
                return (
                  <div key={name} className={cx('flex flex-col justify-between rounded-md px-3 py-2.5 text-[12.5px]', PLAN_TONE[t])}
                    style={{ gridColumn: `${col} / span ${cs}`, gridRow: `${r} / span ${rs}` }}>
                    <b className="text-[13px] font-medium">{name}</b>
                    <span className="flex flex-wrap justify-between gap-x-2 text-ink-2">
                      <span>{({ act: 'Act', watch: 'Watch', low: 'Low' } as Record<string, string>)[t]}</span>
                      <span>{people ? `${people} ${people === 1 ? 'person' : 'people'}` : 'Nobody'}</span>
                    </span>
                  </div>
                );
              })}
            </div>
            <Legend><span><Sq tone="act" />Act</span><span><Sq tone="watch" />Watch</span><span><Sq tone="low" />Low</span></Legend>
            <div className={tile}>
              <div className={eyebrow}>Watching now</div>
              <p className="mt-1">Danger-zone entry, safety gear, machine and forklift spacing, spills.</p>
            </div>
          </Card>
        </div>

        <Card tour="sensors" title="Sensors" sub="Last 12 readings">
          <div className="grid grid-cols-3 gap-4 max-nav:grid-cols-1">
            {sensors.map((sn) => {
              const max = Math.max(...sn.v), min = Math.min(...sn.v), t = SEV[sn.sev];
              return (
                <div key={sn.label} className={tile}>
                  <div className="flex justify-between gap-3 text-[13px]"><span className="text-ink-2">{sn.label}</span><Chip tone={t}>{sn.state}</Chip></div>
                  <Num value={sn.value} unit={sn.unit} className="mt-1 text-2xl" />
                  <div className="mt-2.5 grid h-9 grid-cols-12 items-end gap-[3px]" aria-hidden="true">
                    {sn.v.map((v, i) => {
                      const h = max === min ? 70 : 25 + ((v - min) / (max - min)) * 75;
                      return <span key={i} className={cx('rounded-[2px]', i === sn.v.length - 1 ? SPARK_LAST[t] : 'bg-line-2')} style={{ height: `${h.toFixed(0)}%` }} />;
                    })}
                  </div>
                  <div className={cx(meta, 'mt-2')}>{sn.where}</div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card tour="machines" title="Machines">
          <Table head={['Machine', 'Zone', 'Status', 'Power', 'Temp', 'Guard / lockout']}>
            {machines.map((m) => {
              const t = SEV[machineState[m[2]]];
              return (
                <tr key={m[0]} className={t === 'act' ? 'warn' : undefined}>
                  <td>{m[0]}</td><td>{m[1]}</td><td><Chip tone={t}>{m[2]}</Chip></td><td>{m[3]}</td><td>{m[4]}</td><td>{m[5]}</td>
                </tr>
              );
            })}
          </Table>
        </Card>
        <Foot left="Sample data for the four-week pilot preview. Video analysis runs on the edge; footage stays on site." right="Camera stills are stand-in photos from Unsplash." />
      </Panel>
    </>
  );
}
