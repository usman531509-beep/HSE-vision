'use client';

import Link from 'next/link';
import { checklist, checklistPhotos, findings, inspectionKpis, schedState, schedule } from '@/lib/data';
import { useHse } from '../state';
import { btn, Card, Chip, cx, eyebrow, Foot, Icon, Kpis, link, list, meta, PageHead, Panel, row, rowMain, SEV, Table } from '../ui';

const PF = [['pass', 'Pass'], ['fail', 'Fail'], ['na', 'N/A']] as const;
const PF_ON = {
  pass: 'aria-pressed:bg-lime aria-pressed:text-lime-ink aria-pressed:ring-lime',
  fail: 'aria-pressed:bg-act aria-pressed:text-paper aria-pressed:ring-act',
  na: 'aria-pressed:bg-ink aria-pressed:text-paper aria-pressed:ring-ink',
};

export function InspectionsView() {
  const { s, set } = useHse();
  const done = Object.keys(s.answers).length, total = checklist.length;
  const fails = Object.values(s.answers).filter((a) => a === 'fail').length;

  return (
    <>
      <PageHead
        title="Inspections & audits"
        desc="Mobile checklists with photo evidence. Every finding becomes a tracked action."
        tools={<button type="button" className={btn('light')}><Icon name="download" />Download audit pack</button>}
      />
      <Panel>
        <Kpis items={inspectionKpis} />
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.65fr)] gap-4 max-nav:grid-cols-1">
          <Card tour="schedule" title="Schedule">
            <div className={list}>
              {schedule.map((x) => (
                <div key={x[1]} className={row}>
                  <span className={rowMain}><b>{x[1]}</b><span className={cx(meta, 'mt-px block')}>{x[0]} · {x[2]} · {x[3]}</span></span>
                  <Chip tone={SEV[schedState[x[4]]]}>{x[4]}</Chip>
                </div>
              ))}
            </div>
          </Card>

          <Card tour="checklist" title="Press hall · weekly machine guarding" sub="In progress · started 18:20 by Sana M." extra={<Chip tone="watch">In progress</Chip>}>
            <div>
              <div className="mb-1.5 flex justify-between text-[12.5px] text-ink-2 tabular-nums"><span>Progress</span><b className="font-medium">{done} of {total} checked</b></div>
              <div className="h-2.5 overflow-hidden rounded-[5px] bg-track"><span className="block h-full rounded-[5px] bg-lime transition-[width] duration-300 ease-out" style={{ width: `${Math.round((done / total) * 100)}%` }} /></div>
            </div>
            <div className={list}>
              {checklist.map((it, n) => (
                <div key={it[0]} className="flex items-center gap-3.5 border-t border-line py-2.5 max-compact:flex-wrap">
                  <div className="min-w-0 flex-1">
                    <b className="block text-[13.5px] font-normal">{it[0]}</b>
                    <span className={cx(meta, 'mt-px block')}>{it[1]}{checklistPhotos[n] ? ' · photo attached' : ''}</span>
                  </div>
                  <div className="inline-flex flex-none gap-1" role="group" aria-label={it[0]}>
                    {PF.map(([v, label]) => (
                      <button
                        key={v}
                        type="button"
                        aria-pressed={s.answers[n] === v}
                        onClick={() => set((p) => ({ answers: { ...p.answers, [n]: v } }))}
                        className={cx('h-8 min-w-[56px] rounded-[8px] px-3 text-[12.5px] font-medium text-muted ring-1 ring-line hover:bg-sunk', PF_ON[v])}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div>
              <div className={cx(eyebrow, 'mb-2')}>Photo evidence</div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(checklistPhotos).map(([k, label]) => (
                  <div key={k} className="flex h-[90px] w-[140px] items-end rounded-md bg-cam-floor px-2.5 py-2 text-xs text-cam-ink" role="img" aria-label={label}>{label}</div>
                ))}
                <button type="button" className="flex h-[90px] w-[140px] items-center justify-center gap-1.5 rounded-md border border-dashed border-ink/20 hover:bg-sunk text-xs font-medium text-muted">
                  <Icon name="camera" />Add photo
                </button>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3.5">
              <span className={fails ? 'text-act-ink' : meta}>
                {fails ? `${fails} failed item${fails > 1 ? 's' : ''} will become follow-up actions with an owner.` : 'No failed items so far.'}
              </span>
              <button type="button" className={btn('dark', 'sm')}>Submit inspection</button>
            </div>
          </Card>
        </div>

        <Card tour="findings" title="Recent findings">
          <Table head={['Finding', 'Inspection', 'Date', 'Risk', 'Action']}>
            {findings.map((f) => (
              <tr key={f[0]} className={f[3] === 'High' ? 'warn' : undefined}>
                <td>{f[0]}</td><td>{f[1]}</td><td>{f[2]}</td><td><Chip tone={SEV[f[3]]}>{f[3]}</Chip></td>
                <td><Link className={link} href="/actions">{f[4]}</Link></td>
              </tr>
            ))}
          </Table>
        </Card>
        <Foot left="Sample data for the four-week pilot preview." />
      </Panel>
    </>
  );
}
