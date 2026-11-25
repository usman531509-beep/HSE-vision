'use client';

import type { Advice } from '@/lib/heat/advice';
import { BRIEFING_SENT, DAYS } from '@/lib/heat/data';
import { ACT_FROM, type Cell } from '@/lib/heat/engine';
import { refId } from '@/lib/heat/refs';
import { useHse } from '../../state';
import { btn, Card, Chip, Icon, meta } from '../../ui';
import { ScorePill } from './score-pill';

const DECIDED = { yes: ['low', 'Approved'], no: ['info', 'Kept as planned'] } as const;

/** One suggestion: the job, then its risk now → after the change, drawn as two score tiles. */
function Suggestion({ a, decision, onDecide }: { a: Advice; decision?: 'yes' | 'no'; onDecide: (d: 'yes' | 'no') => void }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 border-t border-ink/10 py-3.5 first:border-t-0 first:pt-0 max-compact:grid-cols-1">
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <b className="text-[14px] font-medium">{a.title}</b>
          <span className={meta}>{[refId(a.job.ref), a.job.area].filter(Boolean).join(' · ')}</span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <ScorePill score={a.from.score} caption={a.from.label} />
          {a.to ? (
            <>
              <Icon name="send" className="size-4 text-muted" />
              <ScorePill score={a.to.score} caption={a.to.label} />
            </>
          ) : (
            <Chip tone="watch">Keep · {a.rest} rest</Chip>
          )}
          {a.care ? <span className="ml-1 text-[12px] text-ink-2">{a.care}</span> : null}
        </div>
      </div>
      {decision ? (
        <Chip tone={DECIDED[decision][0]}>{DECIDED[decision][1]}</Chip>
      ) : (
        <div className="flex gap-2">
          <button type="button" className={btn('light', 'sm')} onClick={() => onDecide('no')}>Decline</button>
          <button type="button" className={btn('dark', 'sm')} onClick={() => onDecide('yes')}>Approve</button>
        </div>
      )}
    </div>
  );
}

/** Output 1: the morning briefing. The engine suggests; the site head decides each change. */
export function Briefing({ advice, grid }: { advice: Advice[]; grid: Cell[][] }) {
  const { s, set } = useHse();
  const day = DAYS[s.heatDay];
  const atRisk = [...new Set(grid.flat().filter((c) => c.time !== 'past' && c.score >= ACT_FROM).map((c) => c.area.zone))];
  const decide = (id: string, d: 'yes' | 'no'): void => set((p) => ({ heatDecisions: { ...p.heatDecisions, [id]: d } }));

  return (
    <Card
      id="briefing"
      tour="heat-briefing"
      note
      title={`${day.date} · Heat briefing`}
      sub={s.heatDay === 0 ? `Sent ${BRIEFING_SENT}` : `Draft for ${BRIEFING_SENT} tomorrow`}
      extra={<Chip tone={atRisk.length ? 'act' : 'low'}>{atRisk.length ? `${atRisk.length} areas at risk` : 'All clear'}</Chip>}
    >
      {advice.length ? (
        <div className="flex flex-col">
          {advice.map((a) => <Suggestion key={a.id} a={a} decision={s.heatDecisions[a.id]} onDecide={(d) => decide(a.id, d)} />)}
        </div>
      ) : (
        <p className="text-[13.5px]">No planned job needs a change.</p>
      )}
    </Card>
  );
}
