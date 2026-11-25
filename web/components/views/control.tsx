'use client';

import Link from 'next/link';
import { audit, decisions, events, kpi, trend, waste, zones, type Range } from '@/lib/data';
import { openActions, useHse } from '../state';
import {
  btn, Card, Cells, CheckRow, Chip, cx, Dot, eyebrow, Filters, Foot, Icon, Ico, KV, Kpis, Legend, link, list, lvl, lvlName,
  card, meta, Num, PageHead, Panel, row, rowBase, rowBtn, rowMain, rowSide, SEV, segBtn, segWrap, Sq, TEXT, tile, type IconName,
} from '../ui';

const MODULE_ICON: Record<string, IconName> = { 'Vision-AI': 'camera', 'Chemical & sensors': 'thermo', 'Safety agent': 'shield', 'IoT sensors': 'activity', Inspections: 'checkSq', Connectors: 'refresh' };
const STAGE = ['Open', 'In progress', 'Awaiting check'];

function Pill({ children, tone }: { children: React.ReactNode; tone?: 'act' }) {
  return <span className={cx('inline-flex h-5 items-center rounded-full px-2 text-[10.5px] font-semibold whitespace-nowrap', tone === 'act' ? 'bg-act-bg text-act-ink' : 'bg-lime text-lime-ink')}>{children}</span>;
}

/** A headline number in the page head: huge, light, with a small badge beside it. */
function BigStat({ value, label, badge, title }: { value: number; label: string; badge: React.ReactNode; title: string }) {
  return (
    <div title={title}>
      <div className="flex items-start gap-2">
        <span className="text-[56px] leading-none font-light tracking-[-0.045em] tabular-nums max-compact:text-[44px]">{value}</span>
        <span className="mt-2">{badge}</span>
      </div>
      <div className="mt-1 text-[13px] text-muted">{label}</div>
    </div>
  );
}
const TOP_RULE = { act: 'before:bg-act', watch: 'before:bg-watch', low: 'before:bg-low', off: 'before:bg-off', info: 'before:bg-off' };

/** Top five zones by score, ranked left to right. Severity is the top rule plus the spelled-out level. */
function ZoneStrip() {
  const { s, set } = useHse();
  const ranked = [...zones].sort((a, b) => b.score - a.score).slice(0, 5);
  return (
    <section aria-label="Highest-risk zones, ranked" className="mb-4 grid grid-cols-5 gap-4 max-nav:grid-cols-3 max-compact:grid-cols-1">
      {ranked.map((z, i) => {
        const l = lvl(z.score);
        return (
          <button
            key={z.name}
            type="button"
            aria-pressed={s.zone === z.name}
            onClick={() => set({ zone: z.name })}
            className={cx(
              card, 'gap-2 text-left transition-colors duration-150 ease-out hover:bg-paper aria-pressed:bg-sage/95',
            )}
          >
            <span className="flex items-center gap-2 text-[13px]">
              <span className="grid size-6 flex-none place-items-center rounded-full bg-ink text-[11px] font-semibold text-paper tabular-nums">{i + 1}</span>
              <span className="min-w-0 truncate font-medium">{z.name}</span>
            </span>
            <span className="mt-2 flex items-end justify-between gap-2">
              <Num value={z.score} unit="/100" className="text-[40px]" />
              <Chip tone={l}>{lvlName(z.score)}</Chip>
            </span>
            <span className="line-clamp-2 min-h-[2.7em] text-[12.5px] leading-[1.35] text-muted">{z.cause}</span>
            <Cells n={Math.round(z.score / 5)} total={20} tone={l} className="mt-0.5" />
          </button>
        );
      })}
    </section>
  );
}

function Gauge({ risk }: { risk: number }) {
  const cx0 = 78, cy0 = 79;
  const dots: { x: string; y: string; r: number; fill: string }[] = [];
  ([[73, 3.3], [63, 3.0], [53, 2.7], [43, 2.4]] as const).forEach(([R, r]) => {
    const n = Math.round((Math.PI * R) / 8.4);
    for (let i = 0; i <= n; i++) {
      const t = i / n, a = Math.PI * (1 - t);
      const fill = t * 100 <= risk ? (t < 0.4 ? '#2f8656' : t < 0.7 ? '#c98412' : '#c8343d') : '#e3e6e4';
      dots.push({ x: (cx0 + R * Math.cos(a)).toFixed(1), y: (cy0 - R * Math.sin(a)).toFixed(1), r, fill });
    }
  });
  return (
    <div className="relative mx-auto aspect-[156/84] w-full max-w-[220px]">
      <svg viewBox="0 0 156 84" role="img" aria-label={`Site risk index ${risk} out of 100`} className="block size-full">
        {dots.map((d, i) => <circle key={i} cx={d.x} cy={d.y} r={d.r} fill={d.fill} />)}
      </svg>
      <div className="absolute inset-x-0 -bottom-0.5 text-center"><Num value={risk} unit="/100" className="text-[26px]" /></div>
    </div>
  );
}

function ShiftChart() {
  const peak = trend.reduce((m, t) => (t[1] > m[1] ? t : m));
  return (
    <div>
      <div className="relative grid grid-cols-8 gap-[5px]" role="img" aria-label={'Predicted risk by hour: ' + trend.map((t) => `${t[0]} ${t[1]}`).join(', ')}>
        {trend.map((t) => {
          const filled = Math.round(t[1] / 10);
          return (
            <div key={t[0]} title={`${t[0]} · ${t[1]}`} className="grid h-32 grid-rows-10 gap-0.5">
              {Array.from({ length: 10 }, (_, k) => {
                const r = 9 - k, level = (r + 1) * 10;
                const on = r < filled;
                return <span key={r} className={cx('mx-auto aspect-square h-full rounded-full', !on ? 'bg-track' : level > 70 ? 'bg-act' : level > 40 ? 'bg-watch' : 'bg-teal')} />;
              })}
            </div>
          );
        })}
        <i className="pointer-events-none absolute -inset-x-1 top-[calc(30%-1px)] border-t border-dashed border-act" />
      </div>
      <div className="mt-1.5 grid grid-cols-8 gap-[5px] text-center text-[11.5px] text-muted tabular-nums">
        {trend.map((t) => <span key={t[0]} className={t === peak ? 'font-semibold text-ink' : ''}>{t[0].slice(0, 2)}</span>)}
      </div>
    </div>
  );
}

export function ControlView() {
  const { s, set } = useHse();
  const k = kpi[s.range];
  const z = zones.find((x) => x.name === s.zone) ?? zones[0];
  const ranges: [Range, string][] = [['shift', 'This shift'], ['day', '24 hours'], ['week', '7 days']];
  const evs = events.filter((e) => s.evFilter === 'All' || e[1] === s.evFilter);
  const acts = openActions(s.stage).filter((a) => a.stage < 3).slice(0, 6);

  return (
    <>
      <PageHead
        title="Control room"
        desc="Every zone, checked against permits, lockout and the shift roster before an alert is raised."
        tools={
          <>
            <div className={segWrap} role="group" aria-label="Time range">
              {ranges.map(([id, label]) => (
                <button key={id} type="button" className={segBtn} aria-pressed={s.range === id} onClick={() => set({ range: id })}>{label}</button>
              ))}
            </div>
            <Link className={btn('dark')} href="/incidents"><Icon name="alert" />Report incident</Link>
          </>
        }
        aside={
          <div className="flex flex-wrap gap-x-10 gap-y-4">
            <BigStat value={k.risk} label="Site risk index" badge={<Chip tone={lvl(k.risk)}>{lvlName(k.risk)}</Chip>} title={k.riskNote} />
            <BigStat value={k.alerts} label="Real alerts" badge={<Pill>{k.silenced} quiet</Pill>} title={`${k.silenced} entries stayed quiet: permit and lockout verified`} />
            <BigStat value={k.stops} label="Machine stops" badge={<Pill>&lt; 1 s</Pill>} title="Person truly at risk · stopped in under 1 s" />
            <BigStat value={k.capa} label="Open actions" badge={<Pill tone="act">{k.due} due</Pill>} title={`${k.due} due today · each has an owner`} />
          </div>
        }
      />
      <ZoneStrip />
      <Panel>

        <div className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,.82fr)_minmax(0,1.05fr)] grid-rows-[auto_1fr] gap-4 max-xl:grid-cols-2 max-compact:grid-cols-1">
          <Card
            id="zone-risk"
            className="row-span-2 max-xl:col-span-full max-xl:row-auto"
            title="Zone risk"
            sub="Each zone is checked against permits, lockout and the shift roster before an alert is raised."
            extra={<Legend><span><Sq tone="act" />Act 70+</span><span><Sq tone="watch" />Watch 40–69</span><span><Sq tone="low" />Low</span></Legend>}
          >
            <div className={list}>
              {zones.map((zo) => {
                const l = lvl(zo.score);
                return (
                  <button
                    key={zo.name}
                    type="button"
                    aria-pressed={s.zone === zo.name}
                    onClick={() => set({ zone: zo.name })}
                    className={cx(rowBase, rowBtn, 'grid min-h-[50px] grid-cols-[minmax(0,1fr)_120px_40px] gap-3.5 max-compact:grid-cols-[minmax(0,1fr)_40px]')}
                  >
                    <span className={rowMain}><b>{zo.name}</b><span className={cx(meta, 'mt-px block')}>{zo.cause}</span></span>
                    <Cells n={Math.round(zo.score / 5)} total={20} tone={l} className="max-compact:hidden" />
                    <Num value={zo.score} className={cx('text-right text-lg', TEXT[l])} />
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-4 border-t border-line pt-3 max-compact:grid-cols-1">
              <div>
                <div className={eyebrow}>{z.name} · {lvlName(z.score)} {z.score}</div>
                <KV k="Cameras" v={z.cams} />
                <KV k="Sensors" v={z.sensors} />
                <KV k="Permit" v={z.permit} />
                <KV k="Lockout" v={z.lockout} />
              </div>
              <div className="self-start rounded-md bg-sage px-4 py-3.5">
                <div className={eyebrow}>Suggested next step</div>
                <p className="mt-1 text-[13.5px] leading-[1.45]">{z.action}</p>
              </div>
            </div>
          </Card>

          <Card title="Site risk" sub={k.riskNote}>
            <Gauge risk={k.risk} />
            <div className="flex justify-between gap-2 border-t border-line pt-3 text-[12.5px]">
              <div><span className={meta}>Peak this shift</span><b className="block text-[15px] font-semibold text-act-ink tabular-nums">72 · 18:00</b></div>
              <div className="text-right"><span className={meta}>Act threshold</span><b className="block text-[15px] font-semibold tabular-nums">70</b></div>
            </div>
          </Card>

          <Card title="Risk through the shift" sub="Predicted, hourly. Peak at 18:00 during changeover.">
            <ShiftChart />
            <Legend>
              <span><Sq tone="act" />Above 70</span>
              <span><Sq tone="watch" />40–70</span>
              <span><i className="inline-block size-2.5 rounded-full bg-teal" />Below 40</span>
              <span><span className="w-4 border-t-[1.5px] border-dashed border-act" />Act threshold</span>
            </Legend>
          </Card>

          <Card
            className="col-span-2 max-xl:col-span-full max-compact:col-auto"
            title={<><Dot tone="low" />Live events</>}
            sub={`${events.filter((e) => e[1] === 'High').length} high-severity this shift`}
            extra={<Filters label="Filter by severity" options={['All', 'High', 'Medium', 'Low']} value={s.evFilter} onChange={(v) => set({ evFilter: v })} />}
          >
            <ul className={list} aria-live="polite">
              {evs.length ? evs.map((e) => {
                const t = SEV[e[1]];
                return (
                  <li key={e[0] + e[2]} className={row}>
                    <Ico name={MODULE_ICON[e[4]] ?? 'activity'} tone={t === 'low' ? undefined : t} />
                    <span className={rowMain}><b>{e[2]} · {e[3]}</b><span className={cx(meta, 'mt-px block')}>{e[4]}</span></span>
                    <span className={rowSide}><Chip tone={t}>{e[1]}</Chip><span className={cx(meta, 'tabular-nums')}>{e[0]}</span></span>
                  </li>
                );
              }) : <li className={meta}>No events at this level.</li>}
            </ul>
          </Card>
        </div>

        <Card title="See · Decide · Act" sub="Recent agent decisions, with the facts it checked first.">
          <div className="grid grid-cols-3 gap-4 max-nav:grid-cols-1">
            {decisions.map((d) => (
              <div key={d.time} className="flex flex-col gap-2.5 rounded-md bg-sunk px-4 py-4">
                <div className="flex items-center justify-between gap-2">
                  <span className={cx(meta, 'tabular-nums')}>{d.time} · {d.zone}</span>
                  <Chip tone={SEV[d.sev]}>{d.outcome}</Chip>
                </div>
                <div className="text-sm">{d.scene}</div>
                <div className="flex flex-col gap-1.5">{d.checks.map((c) => <CheckRow key={c[1]} state={c[0]} label={c[1]} />)}</div>
                <div className="mt-auto border-t border-ink/10 pt-2.5 text-[13px] text-ink-2">{d.action}</div>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] gap-4 max-nav:grid-cols-1">
          <Card title="Follow-up actions" sub="Each has an owner and a due date." extra={<Link className={link} href="/actions">View all actions</Link>}>
            <div className={list}>
              {acts.map((a) => (
                <div key={a.id} className={row}>
                  <Ico name="list" tone={SEV[a.pri]} />
                  <span className={rowMain}><b>{a.title}</b><span className={cx(meta, 'mt-px block')}>{a.id} · {a.owner} · from {a.source}</span></span>
                  <span className={rowSide}>
                    <Chip tone={a.stage === 2 ? 'low' : 'info'}>{STAGE[a.stage]}</Chip>
                    <span className={cx(meta, a.late && 'font-semibold text-act-ink')}>{a.late ? 'Overdue · ' : 'Due '}{a.due}</span>
                  </span>
                </div>
              ))}
            </div>
          </Card>
          <div className="grid gap-4">
            <Card title="Waste & energy today">
              <div className="grid grid-cols-2 gap-4 max-compact:grid-cols-1">
                {waste.map((w) => (
                  <div key={w[0]} className={tile}>
                    <div className={meta}>{w[0]}</div>
                    <Num value={w[1]} unit={w[2]} className="mt-1 text-[22px]" />
                    <div className={cx(meta, 'mt-[3px]')}>{w[3]}</div>
                  </div>
                ))}
              </div>
            </Card>
            <Card title="Audit readiness" extra={<Link className={link} href="/compliance">Compliance</Link>}>
              {audit.map((a) => (
                <div key={a[0]}>
                  <div className="flex justify-between gap-3 pb-2 text-[13px]"><b className="font-medium">{a[0]}</b><span className="text-muted">{a[1]}% on file</span></div>
                  <Cells n={Math.round(a[1] / 4)} total={25} />
                  <div className={cx(meta, 'mt-1.5')}>Missing: {a[2]}</div>
                </div>
              ))}
            </Card>
          </div>
        </div>
        <Foot
          left="Sample data for the four-week pilot preview. The software suggests; a qualified person approves every safety and compliance decision."
          right="Records support ISO 45001 and ISO 14001 audits."
        />
      </Panel>
    </>
  );
}
