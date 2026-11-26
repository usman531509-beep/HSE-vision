'use client';

import { Box, ChevronDown, Flame, Sun, Wrench, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import type { Advice } from '@/lib/heat/advice';
import { BRIEFING_SENT, DAYS, type JobKind } from '@/lib/heat/data';
import { ACT_FROM, type Cell } from '@/lib/heat/engine';
import { refId } from '@/lib/heat/refs';
import { TINT } from '../../figures';
import { useHse } from '../../state';
import { btn, Card, Chip, cx, Icon, lvl, TEXT } from '../../ui';
import { ScorePill } from './score-pill';

type Decision = 'yes' | 'no';
const DECIDED = { yes: ['low', 'Approved'], no: ['info', 'Kept'] } as const;
const KIND_ICON: Record<JobKind, LucideIcon> = { 'Hot work': Flame, 'Confined space': Box, Outdoor: Sun };
/** Small status pill: dark when a change waits, grey when the job only needs a rest cycle. */
const pill = 'rounded-full px-2 py-px text-[11px] font-medium';

/** One job: a compact row that opens to show the change and the decision buttons. */
function Row({ a, open, onToggle, decision, onDecide }: {
  a: Advice; open: boolean; onToggle: () => void; decision?: Decision; onDecide: (d: Decision) => void;
}) {
  const I = a.job.kind ? KIND_ICON[a.job.kind] : Wrench;
  const l = lvl(a.from.score);
  const panel = `brief-${a.id}`;
  return (
    <li className="border-t border-line first:border-t-0">
      <button type="button" onClick={onToggle} aria-expanded={open} aria-controls={panel} className="flex w-full items-center gap-3.5 py-3 text-left">
        <span className={cx('grid size-11 flex-none place-items-center rounded-md', TINT[l])}>
          <I aria-hidden="true" strokeWidth={1.75} className={cx('size-5', TEXT[l])} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <b className="truncate text-[14px] font-medium">{a.title}</b>
            {decision ? <Chip tone={DECIDED[decision][0]}>{DECIDED[decision][1]}</Chip>
              : <span className={cx(pill, a.to ? 'bg-ink text-paper' : 'bg-sunk text-ink-2')}>{a.to ? 'Move' : 'Rest'}</span>}
          </span>
          <span className="mt-0.5 block truncate text-[12.5px] text-muted">{[refId(a.job.ref), a.job.area].filter(Boolean).join(' · ')}</span>
        </span>
        <span className="grid size-9 flex-none place-items-center rounded-full bg-sunk">
          <ChevronDown aria-hidden="true" strokeWidth={1.75} className={cx('size-4 transition-transform duration-200 ease-out', open && 'rotate-180')} />
        </span>
      </button>
      {open ? (
        <div id={panel} className="flex flex-wrap items-center justify-between gap-3 pb-4 pl-[58px]">
          <div className="flex flex-wrap items-center gap-2">
            <ScorePill score={a.from.score} caption={a.from.label} />
            {a.to ? (
              <>
                <Icon name="send" className="size-4 text-muted" />
                <ScorePill score={a.to.score} caption={a.to.label} />
              </>
            ) : (
              <Chip tone="watch">{a.rest} rest</Chip>
            )}
            {a.care ? <span className="text-[12px] text-ink-2">{a.care}</span> : null}
          </div>
          {decision ? null : (
            <div className="flex gap-2">
              <button type="button" className={btn('light', 'sm')} onClick={() => onDecide('no')}>Decline</button>
              <button type="button" className={btn('dark', 'sm')} onClick={() => onDecide('yes')}>Approve</button>
            </div>
          )}
        </div>
      ) : null}
    </li>
  );
}

/** Output 1: the morning briefing. The engine suggests; the site head decides each change. */
export function Briefing({ advice, grid }: { advice: Advice[]; grid: Cell[][] }) {
  const { s, set } = useHse();
  const day = DAYS[s.heatDay];
  const atRisk = new Set(grid.flat().filter((c) => c.time !== 'past' && c.score >= ACT_FROM).map((c) => c.area.zone)).size;
  // The first job still waiting opens by default; after that the user decides what is open.
  const [openId, setOpenId] = useState<string | null | undefined>(undefined);
  const open = openId === undefined ? advice.find((a) => !s.heatDecisions[a.id])?.id ?? null : openId;
  const decide = (id: string, d: Decision): void => set((p) => ({ heatDecisions: { ...p.heatDecisions, [id]: d } }));

  return (
    <Card
      id="briefing"
      tour="heat-briefing"
      title="Heat briefing"
      sub={s.heatDay === 0 ? `${day.date} · sent ${BRIEFING_SENT}` : `${day.date} · draft for ${BRIEFING_SENT}`}
      extra={<Chip tone={atRisk ? 'act' : 'low'}>{atRisk ? `${atRisk} areas at risk` : 'All clear'}</Chip>}
    >
      {advice.length ? (
        <ul className="-my-3 flex flex-col">
          {advice.map((a) => (
            <Row
              key={a.id}
              a={a}
              open={open === a.id}
              onToggle={() => setOpenId(open === a.id ? null : a.id)}
              decision={s.heatDecisions[a.id]}
              onDecide={(d) => decide(a.id, d)}
            />
          ))}
        </ul>
      ) : (
        <p className="text-[13.5px]">No planned job needs a change.</p>
      )}
    </Card>
  );
}
