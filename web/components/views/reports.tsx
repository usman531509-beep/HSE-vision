'use client';

import { briefing, reports, reportState, routines, weeks } from '@/lib/data';
import { useHse } from '../state';
import { btn, Card, Chip, cx, Foot, Icon, Ico, Legend, list, meta, PageHead, Panel, row, rowMain, SEV, Sq } from '../ui';

function Bar({ v, on }: { v: number; on: string }) {
  return (
    <div className="grid h-full w-3.5 grid-rows-8 gap-0.5 max-compact:w-[9px]">
      {Array.from({ length: 8 }, (_, k) => {
        const r = 7 - k;
        return <span key={r} className={cx('rounded-full', r < v ? on : 'bg-track')} />;
      })}
    </div>
  );
}

export function ReportsView() {
  const { s, set } = useHse();

  return (
    <>
      <PageHead
        title="Reports"
        desc="What leadership opens every morning, plus the reports that write themselves."
        tools={<button type="button" className={btn('dark')}><Icon name="plus" />New report</button>}
      />
      <Panel>
        <div className="grid grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] gap-4 max-nav:grid-cols-1">
          <Card
            title="Incidents and near-misses, by week"
            sub="More near-misses reported, fewer incidents: problems are caught earlier."
            extra={<Legend><span><Sq tone="act" />Incidents</span><span><i className="inline-block size-2.5 rounded-full bg-teal" />Near-misses</span></Legend>}
          >
            <div
              className="mt-2 grid grid-cols-[28px_repeat(8,1fr)] items-start gap-1.5 max-compact:gap-[3px]"
              role="img"
              aria-label={'Incidents and near-misses by week: ' + weeks.map((w) => `${w[0]} ${w[1]} incidents, ${w[2]} near-misses`).join('; ')}
            >
              <div className="-mt-[7px] flex h-[222px] flex-col justify-between text-right text-[11.5px] leading-[14px] text-soft tabular-nums">
                <span>8</span><span>4</span><span>0</span>
              </div>
              {weeks.map((w) => (
                <div key={w[0]} className="flex flex-col items-center gap-1.5">
                  <div className="flex h-52 items-end gap-[3px]"><Bar v={w[1]} on="bg-act" /><Bar v={w[2]} on="bg-teal" /></div>
                  <span className="text-[11.5px] whitespace-nowrap text-muted">{w[0]}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card title="Wednesday, 25 November" sub="Morning briefing · sent 06:30" note>
            <ul>
              {briefing.map((b) => (
                <li key={b} className="flex gap-2.5 border-b border-line py-[9px] text-[13.5px] last:border-b-0 before:mt-2 before:size-[5px] before:flex-none before:rounded-full before:bg-ink">{b}</li>
              ))}
            </ul>
            <p className={meta}>Sent to 6 people in English and Urdu. Every line links to its source.</p>
          </Card>
        </div>

        <div className="grid grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] gap-4 max-nav:grid-cols-1">
          <Card title="Report library">
            <div className={list}>
              {reports.map((r) => (
                <div key={r[0]} className={row}>
                  <Ico name="file" />
                  <span className={rowMain}><b>{r[0]}</b><span className={cx(meta, 'mt-px block')}>{r[1]}</span></span>
                  <Chip tone={SEV[reportState[r[2]]]}>{r[2]}</Chip>
                  <span className="flex flex-wrap items-center gap-2">
                    <button type="button" className={btn('light', 'sm')} aria-label={`${r[0]} as PDF`}>PDF</button>
                    <button type="button" className={btn('light', 'sm')} aria-label={`${r[0]} as Excel`}>Excel</button>
                  </span>
                </div>
              ))}
            </div>
          </Card>
          <Card title="Routines" sub="Run on a schedule or a trigger, without anyone asking.">
            <div className={list}>
              {routines.map((r, i) => {
                const on = !s.routinesOff[i];
                return (
                  <div key={r[0]} className={row}>
                    <span className={rowMain}><b>{r[0]}</b><span className={cx(meta, 'mt-px block')}>{r[1]}</span></span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={on}
                      aria-label={r[0]}
                      onClick={() => set((p) => ({ routinesOff: { ...p.routinesOff, [i]: !p.routinesOff[i] } }))}
                      className="relative h-6 w-11 flex-none rounded-full bg-line-2 transition-colors duration-200 ease-out after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:bg-paper after:transition-[left] after:duration-200 after:ease-out aria-checked:bg-ink aria-checked:after:left-[22px] aria-checked:after:bg-lime"
                    />
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
        <Foot left="Sample data for the four-week pilot preview. Reports are drafted by the software and approved by a person before they are filed." />
      </Panel>
    </>
  );
}
