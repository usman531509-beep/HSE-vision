'use client';

import Image from 'next/image';
import { useState, type ReactNode } from 'react';
import { BOX_COLOR } from '@/lib/camera/labels';
import { cams, floorStats, machines, machineState, plan, sensors, type Cam, type Sev } from '@/lib/data';
import { Spark, TINT } from '../figures';
import { Card, Chip, cx, Dot, eyebrow, Foot, Icon, Legend, meta, Num, PageHead, Panel, SEV, Sq, Table, tile } from '../ui';
import { useCamera } from '../camera/state';
import { CameraBody, CameraHeaderStats, CameraHeaderTools } from './camera';
import { LiveFeedsCard } from './camera/live-feeds';

const BOX: Partial<Record<Sev, string>> = { High: BOX_COLOR.act, Medium: BOX_COLOR.watch, Low: BOX_COLOR.low };

/** A few wall cameras play a looping clip; the rest show a still frame. All get live detection boxes. */
const CLIP: Record<string, { src: string; poster: string }> = {
  'CAM 03': { src: '/camera/assembly-2.mp4', poster: '/camera/assembly-2.jpg' },
  'CAM 05': { src: '/camera/stitching-1.mp4', poster: '/camera/stitching-1.jpg' },
  'CAM 09': { src: '/camera/aisle-b.mp4', poster: '/camera/aisle-b.jpg' },
};

/** One live camera on the wall: video or still, with drifting detection boxes. */
function CameraTile({ cam }: { cam: Cam }) {
  const off = cam.sev === 'Off';
  const clip = CLIP[cam.id];
  const flagged = cam.sev === 'High' || cam.sev === 'Medium';
  return (
    <figure className="flex flex-col gap-2">
      <div
        className={cx(
          'relative aspect-video overflow-hidden rounded-[12px] bg-cam text-cam-ink ring-1',
          cam.sev === 'High' ? 'ring-act/70' : cam.sev === 'Medium' ? 'ring-watch/60' : 'ring-ink/10',
        )}
        role="img"
        aria-label={`${cam.id} ${cam.name}: ${cam.summary}`}
      >
        {off ? (
          <div className="absolute inset-0 grid place-items-center bg-cam text-[12px] text-cam-ink/70">
            <span className="inline-flex items-center gap-1.5"><Icon name="camera" className="size-4" />Offline</span>
          </div>
        ) : (
          <>
            {clip ? (
              <video src={clip.src} poster={clip.poster} autoPlay loop muted playsInline preload="metadata" className="absolute inset-0 size-full object-cover brightness-[.82] saturate-[.85]" />
            ) : cam.img ? (
              <Image src={cam.img} alt="" fill sizes="(max-width: 1100px) 50vw, 25vw" className="object-cover brightness-[.82] saturate-[.85]" />
            ) : (
              <div className="absolute inset-x-0 bottom-0 h-[34%] border-t border-cam-ink/8 bg-cam-floor" />
            )}
            {cam.boxes.map((b, i) => (
              <div
                key={i}
                className="cam-drift absolute rounded-[2px] border-2"
                style={{ left: `${b.l}%`, top: `${b.t}%`, width: `${b.w}%`, height: `${b.h}%`, borderColor: BOX[b.sev], ['--camd' as string]: `${6 + (i % 4) * 1.6}s`, ['--camdl' as string]: `${i * 0.7}s` }}
              >
                <span className="absolute -top-[3px] -left-[3px] size-1.5 rounded-[1px]" style={{ background: BOX[b.sev] }} />
              </div>
            ))}
            <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between bg-black/45 px-2.5 py-1.5 text-[10.5px] font-medium tabular-nums">
              <span>{cam.id}</span>
              <span className={cx('inline-flex items-center gap-1 before:size-1.5 before:rounded-[2px]', flagged ? 'before:animate-pulse before:bg-act' : 'before:bg-low')}>LIVE</span>
            </div>
          </>
        )}
      </div>
      <figcaption className="flex items-start justify-between gap-2">
        <span className="min-w-0">
          <b className="flex items-center gap-1.5 text-[12.5px] font-semibold"><Dot tone={SEV[cam.sev]} />{cam.name}</b>
          <span className={cx(meta, 'mt-px block truncate')}>{cam.status}</span>
        </span>
      </figcaption>
    </figure>
  );
}

function LiveTab({ onOpen }: { onOpen: (cameraId: string) => void }) {
  return (
    <Panel>
      <LiveFeedsCard onOpen={onOpen} />
      <Card tour="camera" title="Camera wall" sub="Sample footage for the pilot preview, with example detection boxes.">
        <div className="grid grid-cols-4 gap-3.5 max-nav:grid-cols-3 max-compact:grid-cols-2">
          {cams.map((c) => <CameraTile key={c.id} cam={c} />)}
        </div>
        <Legend><span><Sq tone="act" />Act</span><span><Sq tone="watch" />Watch</span><span><Sq tone="low" />Low</span><span><Sq tone="off" />Offline</span></Legend>
      </Card>

      <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-4 max-nav:grid-cols-1">
        <Card tour="plan" title="Floor plan" sub="Zone level and people on the floor now">
          <div className="grid grid-cols-4 grid-rows-[repeat(3,88px)] gap-1.5 max-compact:grid-rows-[repeat(3,76px)]">
            {plan.map(([name, col, r, cs, rs, sev, people]) => {
              const t = SEV[sev];
              return (
                <div key={name} className={cx('flex flex-col justify-between rounded-md px-3 py-2.5 text-[12.5px]', TINT[t])} style={{ gridColumn: `${col} / span ${cs}`, gridRow: `${r} / span ${rs}` }}>
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
        </Card>

        <Card tour="sensors" title="Sensors" sub="Last 12 readings">
          <div className="flex flex-col gap-3">
            {sensors.map((sn) => {
              const t = SEV[sn.sev];
              return (
                <div key={sn.label} className={tile}>
                  <div className="flex items-center justify-between gap-3 text-[13px]"><span className="text-ink-2">{sn.label}</span><Chip tone={t}>{sn.state}</Chip></div>
                  <div className="mt-1 flex items-end justify-between gap-3">
                    <Num value={sn.value} unit={sn.unit} className="text-2xl" />
                    <Spark values={sn.v} tone={t} className="w-28" />
                  </div>
                  <div className={cx(meta, 'mt-1.5')}>{sn.where}</div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

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
      <Foot left="Sample data for the four-week pilot preview. Video analysis runs on the edge; footage stays on site." right="Sample clips are stock footage." />
    </Panel>
  );
}

const TABS = [['live', 'Live'], ['recorded', 'Recorded analysis']] as const;
type Tab = (typeof TABS)[number][0];

function TabBar({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  return (
    <div className="inline-flex gap-0.5 rounded-[8px] bg-paper p-1 ring-1 ring-line" role="tablist" aria-label="Cameras view">
      {TABS.map(([key, label]) => (
        <button
          key={key}
          type="button"
          role="tab"
          aria-selected={tab === key}
          onClick={() => setTab(key)}
          className="h-9 whitespace-nowrap rounded-[7px] px-4 text-[13px] font-medium text-ink-2 hover:bg-sunk aria-selected:bg-ink aria-selected:text-paper"
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function CamerasView() {
  const [tab, setTab] = useState<Tab>('live');
  const { selectCamera } = useCamera();
  const openRecorded = (cameraId: string) => { selectCamera(cameraId); setTab('recorded'); };
  const live = tab === 'live';

  const tools: ReactNode = (
    <div className="flex flex-col gap-3">
      <TabBar tab={tab} setTab={setTab} />
      {live ? (
        <div className="flex flex-wrap gap-[18px] text-[13px] text-muted">
          {floorStats.map((f) => <span key={f[1]}><b className="mr-1 font-semibold text-ink tabular-nums">{f[0]}</b>{f[1]}</span>)}
        </div>
      ) : (
        <CameraHeaderTools />
      )}
    </div>
  );

  return (
    <>
      <PageHead
        title="Cameras"
        desc={live
          ? 'A live wall of every camera, with detection boxes for what each one sees right now.'
          : 'Analyse recorded site video for people, safety gear and restricted-area entry, and review what it finds.'}
        tools={tools}
        aside={live ? undefined : <CameraHeaderStats />}
      />
      {live ? <LiveTab onOpen={openRecorded} /> : <CameraBody />}
    </>
  );
}
