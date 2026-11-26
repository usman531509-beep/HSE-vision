'use client';

import { DAYS, SHIFTS } from '@/lib/heat/data';
import { cellKey, WEIGHTS, type Cell } from '@/lib/heat/engine';
import { refId, refTitle } from '@/lib/heat/refs';
import { fmtWbgt, workRest } from '@/lib/heat/wbgt';
import { TINT } from '../../figures';
import { useHse } from '../../state';
import { Card, Cells, Chip, cx, Dot, eyebrow, Legend, lvl, lvlName, meta, Num, Sq, TEXT } from '../../ui';

/** A map cell is just the score; WBGT and the rest live in the side panel and the accessible name. */
function MapCell({ c, selected, onPick }: { c: Cell; selected: boolean; onPick: () => void }) {
  const l = lvl(c.score);
  const past = c.time === 'past';
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onPick}
      aria-label={`${c.area.zone}, shift ${c.shift.id}: risk ${c.score}, ${lvlName(c.score)}, WBGT ${fmtWbgt(c.wbgt)} °C${c.jobs.length ? `, ${c.jobs.length} planned job` : ''}`}
      className={cx(
        'relative flex h-14 items-center justify-center rounded-md ring-inset ring-ink transition-shadow duration-150 ease-out hover:ring-1 aria-pressed:ring-2',
        past ? 'bg-sunk text-muted' : TINT[l],
      )}
    >
      <Num value={c.score} className={cx('text-[22px]', !past && TEXT[l])} />
      {c.jobs.length ? <Dot tone="info" className="absolute top-2 right-2" /> : null}
    </button>
  );
}

function Part({ label, value, weight, note }: { label: string; value: number; weight: number; note: string }) {
  return (
    <div className="py-2">
      <div className="flex items-baseline justify-between gap-3 text-[13px]">
        <span>{label} <span className="text-muted">{note}</span></span>
        <b className="font-medium tabular-nums">+{Math.round(value * weight)}</b>
      </div>
      <Cells n={Math.round(value / 5)} total={20} tone={lvl(value)} className="mt-1.5" />
    </div>
  );
}

/** How one score was built, as three bars that add up to it. */
function Breakdown({ c }: { c: Cell }) {
  return (
    <div className="flex flex-col gap-2 rounded-md bg-sunk px-4 py-4">
      <div className={eyebrow}>{c.area.zone} · Shift {c.shift.id} · {DAYS[c.day].label}</div>
      <div className="flex items-end justify-between gap-2">
        <Num value={c.score} unit="/100" className="text-[40px]" />
        <Chip tone={lvl(c.score)}>{lvlName(c.score)}</Chip>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-ink-2 tabular-nums">
        <span>{fmtWbgt(c.wbgt)} °C WBGT</span>
        <span>{workRest(c.wbgt).short} work-rest</span>
        <span>{c.source === 'sensor' ? 'Live sensor' : 'Forecast'}</span>
      </div>
      <div className="mt-1 border-t border-line pt-1">
        <Part label="Heat" value={c.parts.heat} weight={WEIGHTS.heat} note={`${WEIGHTS.heat * 100}%`} />
        <Part label="Planned work" value={c.parts.work} weight={WEIGHTS.work} note={`${WEIGHTS.work * 100}%`} />
        <Part label="Past incidents" value={c.parts.history} weight={WEIGHTS.history} note={`${c.area.heatEvents} last summer`} />
      </div>
      {c.jobs.map((j) => (
        <div key={j.ref} className="flex items-center gap-2 border-t border-line pt-2 text-[13px]">
          <Dot tone="info" />
          <span className="min-w-0 flex-1 truncate">{refTitle(j.ref)}</span>
          <span className={meta}>{refId(j.ref) ?? j.start}</span>
        </div>
      ))}
    </div>
  );
}

export function RiskMap({ grid }: { grid: Cell[][] }) {
  const { s, set } = useHse();
  const flat = grid.flat();
  const selected = flat.find((c) => cellKey(c) === s.heatCell) ?? flat.reduce((m, c) => (c.score > m.score ? c : m));

  return (
    <Card
      id="risk-map"
      tour="heat-map"
      title="Heat-risk map"
      sub="Pick a cell to see how its score was built"
      extra={<Legend><span><Sq tone="act" />Act 70+</span><span><Sq tone="watch" />Watch</span><span><Sq tone="low" />Low</span><span><Dot tone="info" />Planned job</span></Legend>}
    >
      <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-5 max-nav:grid-cols-1">
        <div className="overflow-x-auto">
          <div className="grid min-w-[440px] grid-cols-[140px_repeat(3,minmax(0,1fr))] gap-1.5" role="group" aria-label="Heat-risk map">
            <span />
            {SHIFTS.map((sh) => (
              <span key={sh.id} className="px-1 pb-1 text-center text-[12px] text-muted">
                <b className="font-medium text-ink">Shift {sh.id}</b> · {sh.label}
              </span>
            ))}
            {grid.map((row) => (
              <div key={row[0].area.zone} className="contents">
                <span className="flex items-center pr-2 text-[13px] font-medium">{row[0].area.zone}</span>
                {row.map((c) => <MapCell key={cellKey(c)} c={c} selected={c === selected} onPick={() => set({ heatCell: cellKey(c) })} />)}
              </div>
            ))}
          </div>
        </div>
        <Breakdown c={selected} />
      </div>
    </Card>
  );
}
