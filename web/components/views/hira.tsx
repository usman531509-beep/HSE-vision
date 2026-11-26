'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CONTROL_LAYERS, hiraKpis, hiras, type Hira, type Tone } from '@/lib/data';
import { btn, Card, Chip, cx, eyebrow, Foot, Icon, Kpis, link, list, meta, PageHead, Panel, SEV } from '../ui';

const band = (score: number): Tone => (score >= 15 ? 'act' : score >= 8 ? 'watch' : 'low');
const bandName = (score: number) => (score >= 15 ? 'High' : score >= 8 ? 'Medium' : 'Low');
const TINT: Record<Tone, string> = { act: 'bg-act/15', watch: 'bg-watch/18', low: 'bg-low/14', off: 'bg-off/10', info: 'bg-off/10' };
const INK: Record<Tone, string> = { act: 'text-act-ink', watch: 'text-watch-ink', low: 'text-low-ink', off: 'text-off-ink', info: 'text-off-ink' };
const FILL: Record<Tone, string> = { act: 'bg-act', watch: 'bg-watch', low: 'bg-low', off: 'bg-off', info: 'bg-off' };
const SEV_LABEL = ['', 'Minor', 'Slight', 'Serious', 'Major', 'Fatal'];
const LIK_LABEL = ['', 'Rare', 'Unlikely', 'Possible', 'Likely', 'Almost certain'];

/** The 5×5 likelihood × severity grid, with the initial cell ringed and the residual cell filled. */
function Matrix({ h }: { h: Hira }) {
  return (
    <div>
      <div className="flex gap-2">
        {/* y-axis label */}
        <div className="grid place-items-center">
          <span className="whitespace-nowrap text-[11px] font-medium tracking-wide text-muted [writing-mode:vertical-rl] rotate-180">Severity →</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="grid grid-cols-[auto_repeat(5,1fr)] gap-[3px]">
            {[5, 4, 3, 2, 1].map((s) => (
              <div key={s} className="contents">
                <div className="flex items-center justify-end pr-1.5 text-[10.5px] tabular-nums text-soft">{s}</div>
                {[1, 2, 3, 4, 5].map((l) => {
                  const score = l * s;
                  const t = band(score);
                  const isInit = l === h.l0 && s === h.s0;
                  const isRes = l === h.l1 && s === h.s1;
                  return (
                    <div
                      key={l}
                      className={cx(
                        'relative grid aspect-[5/4] place-items-center rounded-[5px] text-[12px] font-medium tabular-nums',
                        isRes ? cx(FILL[t], 'text-paper') : cx(TINT[t], INK[t]),
                        isInit && !isRes && 'ring-2 ring-ink ring-inset',
                      )}
                    >
                      {score}
                      {isInit && <span className="absolute -top-1 -left-1 rounded-[3px] bg-ink px-1 text-[8.5px] font-semibold text-paper">Was</span>}
                      {isRes && <span className="absolute -top-1 -right-1 rounded-[3px] bg-ink px-1 text-[8.5px] font-semibold text-paper">Now</span>}
                    </div>
                  );
                })}
              </div>
            ))}
            {/* x-axis ticks */}
            <div />
            {[1, 2, 3, 4, 5].map((l) => <div key={l} className="pt-0.5 text-center text-[10.5px] tabular-nums text-soft">{l}</div>)}
          </div>
          <div className="mt-1 text-center text-[11px] font-medium tracking-wide text-muted">Likelihood →</div>
        </div>
      </div>
    </div>
  );
}

function Detail({ h }: { h: Hira }) {
  const init = h.l0 * h.s0, res = h.l1 * h.s1;
  return (
    <Card
      tour="assess"
      title={h.task}
      sub={<>{h.id} · {h.area} · {h.who}</>}
      extra={<Chip tone={SEV[h.reviewSev]}>{h.review}</Chip>}
    >
      <p className="text-[13.5px] leading-relaxed text-ink-2">{h.hazard}</p>

      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] gap-5 max-compact:grid-cols-1">
        <Matrix h={h} />
        <div className="flex flex-col justify-center gap-3">
          <div className="flex items-center gap-3 rounded-md bg-sunk px-4 py-3">
            <span className="text-[12px] text-muted">Initial risk</span>
            <span className="ml-auto flex items-center gap-2"><b className={cx('text-[20px] tabular-nums', INK[band(init)])}>{init}</b><Chip tone={band(init)}>{bandName(init)}</Chip></span>
          </div>
          <div className="grid place-items-center text-soft"><Icon name="send" className="size-4 rotate-90" /></div>
          <div className="flex items-center gap-3 rounded-md bg-sage px-4 py-3">
            <span className="text-[12px] text-muted">After controls</span>
            <span className="ml-auto flex items-center gap-2"><b className={cx('text-[20px] tabular-nums', INK[band(res)])}>{res}</b><Chip tone={band(res)}>{bandName(res)}</Chip></span>
          </div>
          <p className={cx(meta, 'px-1')}>Severity {h.s0}/5 · likelihood cut from {h.l0} to {h.l1} by the controls below.</p>
        </div>
      </div>

      <div>
        <div className={cx(eyebrow, 'mb-2')}>Controls · hierarchy of control</div>
        <div className={list}>
          {[...h.controls].sort((a, b) => CONTROL_LAYERS.indexOf(a.layer) - CONTROL_LAYERS.indexOf(b.layer)).map((c, i) => (
            <div key={i} className="flex items-center gap-3 border-t border-line py-2.5 first:border-t-0">
              <Icon name={c.done ? 'check' : 'clock'} className={cx('size-4', c.done ? 'text-low' : 'text-watch')} stroke={c.done ? 2.4 : 2} />
              <span className="w-[108px] flex-none text-[11.5px] font-semibold text-muted">{c.layer}</span>
              <span className="min-w-0 flex-1 text-[13px] text-ink-2">{c.text}</span>
              {!c.done && <span className="flex-none text-[11.5px] font-medium text-watch-ink">Planned</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3.5">
        <span className={cx(meta, 'inline-flex items-center gap-1.5')}><Icon name="lock" className="size-4" />Linked: {h.link}</span>
        <div className="flex gap-2">
          <button type="button" className={btn('light', 'sm')}><Icon name="download" />Export</button>
          <button type="button" className={btn('dark', 'sm')}><Icon name="refresh" />Review now</button>
        </div>
      </div>
    </Card>
  );
}

export function HiraView() {
  const [sel, setSel] = useState(hiras[0].id);
  const current = hiras.find((h) => h.id === sel) ?? hiras[0];

  return (
    <>
      <PageHead
        title="Hazard ID &amp; risk assessment"
        desc="A structured HIRA for every task and area. Score the risk, add controls from the hierarchy, and track the risk that is left — linked to permits, SOPs and actions."
        tools={<button type="button" className={btn('dark')}><Icon name="plus" />New assessment</button>}
      />
      <Panel>
        <Kpis items={hiraKpis} />
        <div className="grid grid-cols-[minmax(0,0.85fr)_minmax(0,1.3fr)] gap-4 max-nav:grid-cols-1">
          <Card title="Assessments" sub="Ranked by the risk left after controls.">
            <div className={list}>
              {[...hiras].sort((a, b) => b.l1 * b.s1 - a.l1 * a.s1).map((h) => {
                const res = h.l1 * h.s1, on = h.id === sel;
                return (
                  <button
                    key={h.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setSel(h.id)}
                    className={cx('flex items-center gap-3 border-t border-line px-2 py-3 text-left transition-colors first:border-t-0 hover:bg-sunk rounded-md', on && 'bg-sunk')}
                  >
                    <span className={cx('grid size-9 flex-none place-items-center rounded-md text-[13px] font-semibold tabular-nums', TINT[band(res)], INK[band(res)])}>{res}</span>
                    <span className="min-w-0 flex-1">
                      <b className="block truncate text-[13.5px] font-medium">{h.task}</b>
                      <span className={cx(meta, 'mt-px block')}>{h.area} · {h.id}</span>
                    </span>
                    <Chip tone={SEV[h.reviewSev]}>{h.reviewSev === 'High' ? 'Overdue' : h.reviewSev === 'Medium' ? 'Due' : 'Current'}</Chip>
                  </button>
                );
              })}
            </div>
            <Foot left={<span className="inline-flex items-center gap-2"><span className="inline-flex items-center gap-1"><i className="size-2.5 rounded-[2px] bg-act/15 ring-1 ring-act/30" />High</span><span className="inline-flex items-center gap-1"><i className="size-2.5 rounded-[2px] bg-watch/18" />Medium</span><span className="inline-flex items-center gap-1"><i className="size-2.5 rounded-[2px] bg-low/14" />Low</span></span>} />
          </Card>

          <Detail h={current} />
        </div>
        <Foot left="Sample data for the four-week pilot preview." right={<Link className={link} href="/permits">Controls feed Permits &amp; lockout →</Link>} />
      </Panel>
    </>
  );
}
