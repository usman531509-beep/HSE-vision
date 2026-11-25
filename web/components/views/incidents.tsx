'use client';

import { incidentKpis, incidents, incidentStages, incidentStageText } from '@/lib/data';
import { useHse } from '../state';
import {
  btn, Card, Chip, cx, eyebrow, Filters, Foot, Icon, Kpis, list, meta, PageHead, Panel, row, rowBtn, rowMain, rowSide, SEV, Table, tile,
} from '../ui';

export function IncidentsView() {
  const { s, set } = useHse();
  const shown = incidents.filter((i) => s.incFilter === 'All' || i.type === s.incFilter);
  const c = incidents.find((i) => i.id === s.inc) ?? incidents[0];
  const approved = c.stage === 4 || !!s.approved[c.id];
  const stage = approved ? 4 : c.stage;

  return (
    <>
      <PageHead
        title="Incidents & near-misses"
        desc="The software does the follow-up work. A person signs it off."
        tools={<button type="button" className={btn('dark')}><Icon name="plus" />Report an incident</button>}
      />
      <Panel>
        <Kpis items={incidentKpis} />
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.65fr)] gap-4 max-nav:grid-cols-1">
          <Card title="This month">
            <Filters label="Filter by type" options={[['All', 'All'], ['Incident', 'Incidents'], ['Near-miss', 'Near-misses']]} value={s.incFilter} onChange={(v) => set({ incFilter: v })} />
            <div className={list}>
              {shown.map((i) => (
                <button key={i.id} type="button" aria-pressed={i.id === c.id} onClick={() => set({ inc: i.id })} className={cx(row, rowBtn, 'items-start')}>
                  <span className={rowMain}><b>{i.title}</b><span className={cx(meta, 'mt-px block')}>{i.id} · {i.date} {i.time} · {i.zone}</span></span>
                  <span className={rowSide}><Chip tone={SEV[i.sev]}>{i.sev}</Chip><span className={meta}>{incidentStageText[s.approved[i.id] ? 4 : i.stage]}</span></span>
                </button>
              ))}
            </div>
          </Card>

          <Card title={c.title} sub={`${c.id} · ${c.type} · ${c.zone} · ${c.date} ${c.time}`} extra={<Chip tone={SEV[c.sev]}>{c.sev} severity</Chip>}>
            <ol className="grid grid-cols-4 gap-2" aria-label="Progress">
              {incidentStages.map((st, n) => {
                const done = n + 1 < stage || approved, now = n + 1 === stage && !approved;
                return (
                  <li key={st} className="text-[12.5px]">
                    <i className={cx('mb-2 block h-[3px]', done ? 'bg-low' : now ? 'bg-watch' : 'bg-track')} />
                    <b className="block font-semibold text-ink">{n + 1}. {st}</b>
                    <span className="text-muted">{done ? 'Done' : now ? 'In progress' : 'Waiting'}</span>
                  </li>
                );
              })}
            </ol>
            <div className="grid grid-cols-2 gap-4 max-compact:grid-cols-1">
              <div className={tile}>
                <div className={eyebrow}>What happened</div>
                <p className="mt-1.5">{c.what}</p>
                <div className={cx(meta, 'mt-2')}>Captured by {c.source}</div>
              </div>
              <div className={tile}>
                <div className={cx(eyebrow, 'mb-2')}>Likely causes</div>
                <ol className="flex flex-col gap-2">
                  {c.causes.map((t, i) => (
                    <li key={i} className="flex gap-2.5 text-[13.5px]">
                      <span className="w-4 flex-none text-[13px] font-semibold text-soft tabular-nums">{i + 1}.</span>{t}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
            <div>
              <div className={cx(eyebrow, 'mb-1')}>Standards</div>
              <Table>
                {c.clauses.map((k) => (
                  <tr key={k[0] + k[1]}>
                    <td className="whitespace-nowrap">{k[0]}</td><td>{k[1]}</td>
                    <td className="text-right"><Chip tone={k[2] === 'Gap' ? 'act' : 'low'}>{k[2]}</Chip></td>
                  </tr>
                ))}
              </Table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3.5">
              <div className="min-w-[220px] flex-1">
                <b className="font-medium">Draft report and follow-up actions</b>
                <p className="mt-[3px]">{c.draft}</p>
                <div className={cx(meta, 'mt-1')}>{approved ? 'Signed off by a qualified person. Filed to the audit pack.' : 'Needs sign-off from a qualified person before it is filed.'}</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" className={btn('light', 'sm')}>Open draft</button>
                {approved ? (
                  <button type="button" className={btn('ok', 'sm')} disabled><Icon name="check" />Approved</button>
                ) : (
                  <button type="button" className={btn('dark', 'sm')} onClick={() => set((p) => ({ approved: { ...p.approved, [c.id]: true } }))}>Approve and file</button>
                )}
              </div>
            </div>
          </Card>
        </div>
        <Foot left="Sample data for the four-week pilot preview. Each closed incident feeds back into risk prediction." />
      </Panel>
    </>
  );
}
