'use client';

import { locks, lockState, permitRequests, permits } from '@/lib/data';
import { useHse } from '../state';
import { btn, card, Card, Cells, CheckRow, Chip, cx, eyebrow, Foot, Icon, Kpis, list, meta, PageHead, Panel, SEV, Table } from '../ui';

export function PermitsView() {
  const { s, set } = useHse();
  const pending = permitRequests.filter((r) => !s.permitDecisions[r.id]).length;
  const decide = (id: string, d: 'yes' | 'no') => set((p) => ({ permitDecisions: { ...p.permitDecisions, [id]: d } }));

  return (
    <>
      <PageHead
        title="Permits & lockout"
        desc="Hot work, confined space and lockout. The agent reads these before raising any alarm, and cameras confirm the power is off before work starts."
        tools={<button type="button" className={btn('dark')}><Icon name="plus" />Request a permit</button>}
      />
      <Panel>
        <Kpis
          items={[
            ['Active permits', '3', '', 'Lockout, hot work, confined space'],
            ['Waiting for approval', String(pending), '', 'Agent checks training and roster first'],
            ['Lockouts verified', '3', 'of 4', <span key="n" className="text-act-ink">Press 3 has no lockout</span>],
            ['Expiring within 1 hour', '1', '', 'PTW-1185 · hot work'],
          ]}
        />

        <Card tour="approvals" title="Waiting for approval" sub="The agent checks training and the roster first.">
          <div className={list}>
            {permitRequests.map((r) => {
              const d = s.permitDecisions[r.id];
              return (
                <div key={r.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-t border-line py-3.5 first:border-t-0 first:pt-0 max-compact:grid-cols-1">
                  <div>
                    <div className="flex flex-wrap items-baseline gap-2.5">
                      <b className="text-[14.5px] font-medium">{r.type}</b>
                      <span className={meta}>{r.id} · asked {r.when} by {r.who}</span>
                    </div>
                    <p className="mt-1">{r.work}</p>
                    <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-2">{r.checks.map((c) => <CheckRow key={c[1]} state={c[0]} label={c[1]} />)}</div>
                  </div>
                  {d ? (
                    <Chip tone={d === 'yes' ? 'low' : 'info'}>{d === 'yes' ? 'Approved · issued' : 'Declined · sent back'}</Chip>
                  ) : (
                    <div className="flex gap-2">
                      <button type="button" className={btn('light', 'sm')} onClick={() => decide(r.id, 'no')}>Decline</button>
                      <button type="button" className={btn('dark', 'sm')} onClick={() => decide(r.id, 'yes')}>Approve</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        <div data-tour="active" className="px-1 pt-2"><h2 className="text-[22px] font-normal tracking-[-0.02em]">Active permits</h2></div>
        <div className="grid grid-cols-3 gap-4 max-nav:grid-cols-1">
          {permits.map((p) => (
            <section key={p.id} className={cx(card, 'gap-3')}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <span className={eyebrow}>{p.type}</span>
                <Chip tone={SEV[p.sev === 'Low' ? 'Low' : 'Medium']}>{p.status}</Chip>
              </div>
              <div>
                <div className="text-sm">{p.work}</div>
                <div className={cx(meta, 'mt-[3px]')}>{p.id} · {p.where} · {p.holder}</div>
              </div>
              <div className="flex flex-col gap-1.5">{p.checks.map((c) => <CheckRow key={c[1]} state={c[0]} label={c[1]} />)}</div>
              <div className="mt-auto">
                <div className="mb-1.5 flex justify-between text-[12.5px] text-ink-2 tabular-nums">
                  <span>Valid until {p.until}</span><b className="font-medium">{p.left} left</b>
                </div>
                <Cells n={Math.round(p.pct / 5)} total={20} tone={p.pct > 80 ? 'watch' : 'low'} />
              </div>
            </section>
          ))}
        </div>

        <Card tour="lockout" title="Lockout board">
          <Table head={['Machine', 'Energy sources', 'Locked by', 'Since', 'Checked by', 'State']}>
            {locks.map((l) => {
              const t = SEV[lockState[l[5]]];
              return (
                <tr key={l[0]} className={t === 'act' ? 'warn' : undefined}>
                  <td>{l[0]}</td><td>{l[1]}</td><td>{l[2]}</td><td>{l[3]}</td><td>{l[4]}</td><td><Chip tone={t}>{l[5]}</Chip></td>
                </tr>
              );
            })}
          </Table>
        </Card>
        <Foot left="Sample data for the four-week pilot preview. A qualified person approves every permit." />
      </Panel>
    </>
  );
}
