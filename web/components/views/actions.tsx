'use client';

import { actionCols, actionNext, actionOwners } from '@/lib/data';
import { openActions, useHse } from '../state';
import { btn, card, Chip, cx, Filters, Foot, PageHead, Panel, SEV } from '../ui';

export function ActionsView() {
  const { s, set } = useHse();
  const owner = s.owner;
  const all = openActions(s.stage).filter(
    (a) => owner === 'Everyone' || a.owner === owner || (owner === 'Floor team' && /Floor team|Line lead|Shift supervisor/.test(a.owner)),
  );

  return (
    <>
      <PageHead
        title="Follow-up actions"
        desc="Corrective and preventive actions. Each has an owner and a due date, and cameras confirm the fix before it closes."
        tools={<Filters label="Filter by owner" options={actionOwners} value={owner} onChange={(v) => set({ owner: v })} />}
      />
      <Panel>
        <div data-tour="board" className="grid grid-cols-4 items-start gap-4 max-xl:grid-cols-2 max-compact:grid-cols-1">
          {actionCols.map((title, i) => {
            const cs = all.filter((a) => a.stage === i);
            return (
              <section key={title} aria-label={title} className="flex min-h-[200px] flex-col gap-2">
                <div className="flex h-11 items-center justify-between rounded-[8px] bg-paper pr-1.5 pl-4 text-[13.5px] font-medium ring-1 ring-line">
                  {title}<span className="grid h-8 min-w-8 place-items-center rounded-[8px] bg-ink px-2 text-xs font-semibold text-paper tabular-nums">{cs.length}</span>
                </div>
                {cs.length ? cs.map((a) => {
                  const initials = a.owner.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
                  return (
                    <article key={a.id} className={cx(card, 'gap-2.5 p-4')}>
                      <div className="flex items-center justify-between"><span className="text-xs text-soft tabular-nums">{a.id}</span><Chip tone={SEV[a.pri]}>{a.pri}</Chip></div>
                      <b className="text-[13.5px] leading-[1.35] font-medium">{a.title}</b>
                      <span className="text-[12.5px] text-muted">From {a.source}</span>
                      <div className="flex items-center justify-between gap-2 text-[12.5px] text-ink-2">
                        <span className="inline-flex items-center gap-[7px]">
                          <span className="grid size-7 place-items-center rounded-[5px] bg-sage text-[10.5px] font-semibold text-ink" aria-hidden="true">{initials}</span>
                          {a.owner}
                        </span>
                        <span className={cx(a.late && 'font-semibold text-act-ink')}>{a.late ? 'Overdue · ' : ''}{a.due}</span>
                      </div>
                      {a.stage < 3 ? (
                        <button type="button" className={cx(btn('light', 'sm'), 'w-full')} onClick={() => set((p) => ({ stage: { ...p.stage, [a.id]: a.stage + 1 } }))}>
                          {actionNext[a.stage]}
                        </button>
                      ) : null}
                    </article>
                  );
                }) : <p className="p-1 text-[12.5px] text-muted">Nothing here.</p>}
              </section>
            );
          })}
        </div>
        <Foot left="Sample data for the four-week pilot preview." />
      </Panel>
    </>
  );
}
