'use client';

import Link from 'next/link';
import { askCompliance, clauseState, standards } from '@/lib/data';
import { useHse } from '../state';
import { Card, Cells, Chip, cx, Foot, Ico, Kpis, link, list, meta, PageHead, Panel, row, rowMain, SEV, segBtn, segWrap, Table } from '../ui';

export function ComplianceView() {
  const { s, set } = useHse();
  const d = standards[s.std];
  const [covered, of] = d.covered.split(' of ');

  return (
    <>
      <PageHead
        title="Compliance"
        desc="Live mapping of site activity to each standard, and the evidence still missing."
        tools={
          <div className={segWrap} role="tablist" aria-label="Standard">
            {Object.keys(standards).map((k) => (
              <button key={k} type="button" role="tab" aria-selected={s.std === k} className={segBtn} onClick={() => set({ std: k })}>{k}</button>
            ))}
          </div>
        }
      />
      <Panel>
        <Kpis
          items={[
            ['Evidence on file', d.pct, '%', '', null, <div key="c" className="mt-2.5"><Cells n={Math.round(d.pct / 4)} total={25} /></div>],
            ['Clauses covered', covered, 'of ' + of, d.scope],
            ['Gaps to close', d.gaps.length, '', 'Each linked to a follow-up action'],
            ['Next audit', d.next, '', d.nextNote],
          ]}
        />
        <div className="grid grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] gap-4 max-nav:grid-cols-1">
          <Card tour="clauses" title={`${d.name} · clause by clause`}>
            <Table head={['Clause', 'Requirement', 'Evidence', 'Status']}>
              {d.clauses.map((c) => {
                const t = SEV[clauseState[c[3]]];
                return (
                  <tr key={c[0]} className={t === 'act' ? 'warn' : undefined}>
                    <td>{c[0]}</td><td className="text-ink!">{c[1]}</td><td>{c[2]}</td><td><Chip tone={t}>{c[3]}</Chip></td>
                  </tr>
                );
              })}
            </Table>
          </Card>
          <div className="grid content-start gap-4">
            <Card tour="gaps" title="Missing evidence" sub="Each linked to a follow-up action">
              <div className={list}>
                {d.gaps.map((g) => (
                  <div key={g[0]} className={row}>
                    <Ico name="alert" tone="act" />
                    <span className={rowMain}>
                      <b>{g[0]}</b>
                      <span className={cx(meta, 'mt-px block')}>Clause {g[1]} · <Link className={link} href="/actions">{g[2]}</Link></span>
                    </span>
                  </div>
                ))}
              </div>
            </Card>
            <Card tour="ask" title="Ask compliance" note>
              <p className="text-[15px]">“{askCompliance.q}”</p>
              <p>{askCompliance.a}</p>
              <div className="flex flex-wrap gap-1.5">{askCompliance.refs.map((r) => <Chip key={r} tone="off">{r}</Chip>)}</div>
            </Card>
          </div>
        </div>
        <Foot left="Sample data for the four-week pilot preview. A qualified person reviews every compliance decision." />
      </Panel>
    </>
  );
}
