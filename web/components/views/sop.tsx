'use client';

import { useState } from 'react';
import Link from 'next/link';
import { docCats, docs, docStatusSev, sopKpis, type Doc } from '@/lib/data';
import { btn, Card, Chip, cx, eyebrow, Filters, Foot, Icon, Kpis, link, list, meta, PageHead, Panel, SEV } from '../ui';

const CAT_ICON: Record<Doc['cat'], 'file' | 'files' | 'shield' | 'alert'> = {
  SOP: 'file',
  'Safety data sheet': 'files',
  'Method statement': 'file',
  Policy: 'shield',
  Emergency: 'alert',
};

function Detail({ d }: { d: Doc }) {
  const pct = Math.round((d.ackDone / d.ackTotal) * 100);
  return (
    <Card
      tour="doc"
      title={d.title}
      sub={<>{d.id} · {d.cat} · owner {d.owner}</>}
      extra={<Chip tone={SEV[docStatusSev[d.status]]}>{d.status}</Chip>}
    >
      <div className="grid grid-cols-3 gap-3 max-compact:grid-cols-1">
        {([['Version', d.version], ['Applies to', d.areas], ['Next review', d.review]] as const).map(([k, v]) => (
          <div key={k} className="rounded-md bg-sunk px-3.5 py-3">
            <div className="text-[11.5px] text-muted">{k}</div>
            <div className="mt-1 text-[13.5px] font-medium text-ink">{v}</div>
          </div>
        ))}
      </div>

      <div>
        <div className={cx(eyebrow, 'mb-2')}>Approval chain</div>
        <div className="flex flex-wrap gap-2">
          {d.chain.map(([role, name, state], i) => {
            const ok = state === 'ok' || state === 1;
            const no = state === 'no' || state === 0;
            return (
              <div key={role} className="flex items-center gap-2">
                <div className={cx('flex items-center gap-2 rounded-md px-3 py-2 ring-1', ok ? 'bg-sage ring-line' : no ? 'bg-act-bg ring-act/30' : 'bg-paper ring-line')}>
                  <Icon name={ok ? 'check' : no ? 'x' : 'clock'} className={cx('size-4', ok ? 'text-low' : no ? 'text-act' : 'text-watch')} stroke={ok ? 2.4 : 2} />
                  <span className="text-[12.5px]"><b className="font-medium text-ink">{role}</b><span className="ml-1.5 text-muted">{name}</span></span>
                </div>
                {i < d.chain.length - 1 && <Icon name="send" className="size-3.5 text-soft" />}
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between text-[12.5px]">
          <span className={eyebrow}>Read &amp; understood</span>
          <b className="font-medium tabular-nums text-ink-2">{d.ackDone} of {d.ackTotal} · {pct}%</b>
        </div>
        <div className="h-2.5 overflow-hidden rounded-[5px] bg-track">
          <span className={cx('block h-full rounded-[5px] transition-[width] duration-300', pct >= 90 ? 'bg-low' : pct >= 70 ? 'bg-watch' : 'bg-act')} style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div>
        <div className={cx(eyebrow, 'mb-2 flex items-center gap-1.5')}><Icon name="history" className="size-4" />Version history</div>
        <div className={list}>
          {d.history.map(([ver, note], i) => (
            <div key={ver} className="flex items-baseline gap-3 border-t border-line py-2 first:border-t-0">
              <b className={cx('w-12 flex-none text-[12.5px] font-semibold tabular-nums', i === 0 ? 'text-accent' : 'text-muted')}>{ver}</b>
              <span className="min-w-0 flex-1 text-[13px] text-ink-2">{note}</span>
              {i === 0 && <Chip tone="low">Current</Chip>}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3.5">
        <span className={cx(meta, 'inline-flex items-center gap-1.5')}><Icon name="file" className="size-4" />Controlled copy · do not print to keep</span>
        <div className="flex gap-2">
          <button type="button" className={btn('light', 'sm')}><Icon name="download" />Download</button>
          <button type="button" className={btn('dark', 'sm')}><Icon name="check" />Acknowledge</button>
        </div>
      </div>
    </Card>
  );
}

export function SopView() {
  const [cat, setCat] = useState<string>('All');
  const [sel, setSel] = useState(docs[0].id);
  const shown = cat === 'All' ? docs : docs.filter((d) => d.cat === cat);
  const current = docs.find((d) => d.id === sel) ?? docs[0];

  return (
    <>
      <PageHead
        title="SOP &amp; document control"
        desc="One controlled library for SOPs, method statements, policies and safety data sheets. Every document has a version, an owner, a review date and a read-and-understood trail."
        tools={<button type="button" className={btn('dark')}><Icon name="plus" />Add document</button>}
      />
      <Panel>
        <Kpis items={sopKpis} />
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-4 max-nav:grid-cols-1">
          <Card
            title="Library"
            sub={`${shown.length} of ${docs.length} documents`}
            extra={<Filters label="Category" options={[...docCats]} value={cat} onChange={setCat} />}
          >
            <div className={list}>
              {shown.map((d) => {
                const on = d.id === sel;
                return (
                  <button
                    key={d.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setSel(d.id)}
                    className={cx('flex items-center gap-3 rounded-md border-t border-line px-2 py-3 text-left transition-colors first:border-t-0 hover:bg-sunk', on && 'bg-sunk')}
                  >
                    <span className="grid size-9 flex-none place-items-center rounded-md bg-paper text-ink-2 ring-1 ring-line"><Icon name={CAT_ICON[d.cat]} className="size-[18px]" /></span>
                    <span className="min-w-0 flex-1">
                      <b className="block truncate text-[13.5px] font-medium">{d.title}</b>
                      <span className={cx(meta, 'mt-px block')}>{d.id} · {d.version} · {d.cat}</span>
                    </span>
                    <Chip tone={SEV[docStatusSev[d.status]]}>{d.status}</Chip>
                  </button>
                );
              })}
            </div>
          </Card>

          <Detail d={current} />
        </div>
        <Foot left="Sample data for the four-week pilot preview." right={<Link className={link} href="/compliance">Documents map to Compliance evidence →</Link>} />
      </Panel>
    </>
  );
}
