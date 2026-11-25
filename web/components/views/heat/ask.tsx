'use client';

import type { ReactNode } from 'react';
import { HEAT_QUESTIONS } from '@/lib/heat/ask';
import { backtest } from '@/lib/heat/data';
import type { LiveReadings } from '@/lib/heat/engine';
import { useHse } from '../../state';
import { Card, Cells, cx, Dot, Filters, meta, Num, TEXT, tile } from '../../ui';

/** Output 3: Ask IonHSE, answered from the same engine scores the page shows. */
export function AskHeat({ live }: { live: LiveReadings }) {
  const { s, set } = useHse();
  const answers = HEAT_QUESTIONS.map((q) => q(live));
  const a = answers[s.heatAsk] ?? answers[0];

  return (
    <Card id="ask" tour="heat-ask" title="Ask IonHSE" sub="Answered from the live scores">
      <Filters label="Sample questions" options={answers.map((x, i) => [String(i), x.q] as [string, string])} value={String(s.heatAsk)} onChange={(v) => set({ heatAsk: Number(v) })} />
      <div className="flex flex-col gap-2 rounded-md bg-sunk px-4 py-3.5">
        <b className="text-[15px] font-medium">{a.headline}</b>
        {a.rows.length ? (
          <ul className="flex flex-col">
            {a.rows.map((r) => (
              <li key={r.label} className="flex items-center gap-3 border-t border-line py-2 text-[13px] first:border-t-0">
                {r.tone ? <Dot tone={r.tone} /> : null}
                <span className="min-w-0 flex-1 truncate">{r.label}{r.sub ? <span className="text-muted"> · {r.sub}</span> : null}</span>
                <b className={cx('font-medium whitespace-nowrap tabular-nums', r.tone && TEXT[r.tone])}>{r.value}</b>
              </li>
            ))}
          </ul>
        ) : null}
        <span className="text-[11.5px] text-muted">Source: {a.source}</span>
      </div>
    </Card>
  );
}

function Measure({ value, unit, label, children }: { value: string; unit?: string; label: string; children?: ReactNode }) {
  return (
    <div className={cx(tile, 'flex flex-col gap-1.5')}>
      <span className={meta}>{label}</span>
      <Num value={value} unit={unit} className="text-[30px]" />
      {children}
    </div>
  );
}

/** The proposal's success measures, as three figures. Adoption counts the decisions made on this page. */
export function PilotMeasures({ className }: { className?: string }) {
  const { s } = useHse();
  const decided = Object.values(s.heatDecisions);
  const adopted = decided.filter((d) => d === 'yes').length;
  const accuracy = Math.round((backtest.flagged / backtest.total) * 100);

  return (
    <Card tour="heat-measures" className={className} title="Pilot measures" sub={`Back-test ${backtest.season} · sample`}>
      <div className="grid gap-3">
        <Measure value={String(accuracy)} unit="%" label="Accuracy · incidents flagged early">
          <Cells n={backtest.flagged} total={backtest.total} tone="low" />
        </Measure>
        <div className="grid grid-cols-2 gap-3">
          <Measure value={decided.length ? `${adopted}/${decided.length}` : '–'} label="Adoption · approved" />
          <Measure value="May" label="Outcome · season starts" />
        </div>
      </div>
    </Card>
  );
}
