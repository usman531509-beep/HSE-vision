'use client';

import { attention, courses, people, reminders, trainingKpis } from '@/lib/data';
import { useHse } from '../state';
import { btn, Card, Chip, cx, Foot, KV, Kpis, Legend, list, meta, PageHead, Panel, row, rowMain, SEV, Table } from '../ui';

const MARK: Record<string, [string, string, string]> = {
  v: ['✓', 'Valid', 'text-low'],
  e: ['!', 'Expires within 30 days', 'text-watch-ink'],
  x: ['✕', 'Expired or missing', 'text-act'],
  n: ['–', 'Not needed', 'text-soft'],
};

function Mark({ k, title, small }: { k: string; title?: string; small?: boolean }) {
  const [glyph, label, color] = MARK[k];
  return (
    <span className={cx('inline-grid place-items-center font-bold', small ? 'size-[22px] text-[11.5px]' : 'size-6 text-sm', color)} title={title}>
      {glyph}
      {title ? <span className="sr-only">{label}</span> : null}
    </span>
  );
}

export function TrainingView() {
  const { s, set } = useHse();
  const rows = people.filter((p) => !s.gapsOnly || /[xe]/.test(p[2]));

  return (
    <>
      <PageHead
        title="Training & competency"
        desc="Who is trained for what. The agent checks this against the shift roster before it approves a permit."
        tools={
          <button type="button" className={btn(s.gapsOnly ? 'dark' : 'light')} aria-pressed={s.gapsOnly} onClick={() => set((p) => ({ gapsOnly: !p.gapsOnly }))}>
            Show only people with gaps
          </button>
        }
      />
      <Panel>
        <Kpis items={trainingKpis} />
        <Card
          title="Shift B · competency matrix"
          extra={<Legend>{['v', 'e', 'x', 'n'].map((k) => <span key={k}><Mark k={k} small />{MARK[k][1]}</span>)}</Legend>}
        >
          <Table head={['Worker', 'Role', ...courses]} className="[&_td]:text-center [&_th]:text-center [&_td:nth-child(-n+2)]:text-left [&_th:nth-child(-n+2)]:text-left">
            {rows.map((p) => (
              <tr key={p[0]} className={/x/.test(p[2]) ? 'warn' : undefined}>
                <td>{p[0]}</td><td>{p[1]}</td>
                {p[2].split('').map((k, i) => <td key={i}><Mark k={k} title={`${courses[i]}: ${MARK[k][1]}`} /></td>)}
              </tr>
            ))}
          </Table>
        </Card>
        <div className="grid grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] gap-4 max-nav:grid-cols-1">
          <Card title="Needs attention">
            <div className={list}>
              {attention.map((a) => (
                <div key={a[0] + a[1]} className={row}>
                  <span className={rowMain}><b>{a[0]} · {a[1]}</b><span className={cx(meta, 'mt-px block')}>{a[2]}</span></span>
                  <Chip tone={SEV[a[4]]}>{a[3]}</Chip>
                  <button type="button" className={btn('light', 'sm')}>Book course</button>
                </div>
              ))}
            </div>
          </Card>
          <Card title="Automatic reminders" sub="Sent in Urdu or English, by text or voice.">
            <div>{reminders.map((r) => <KV key={r[0]} k={r[0]} v={r[1]} vClass={r[1] === 'Permits blocked' ? 'text-act-ink' : undefined} />)}</div>
          </Card>
        </div>
        <Foot left="Sample data for the four-week pilot preview." />
      </Panel>
    </>
  );
}
