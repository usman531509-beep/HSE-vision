'use client';

import { useEffect, useRef, useState } from 'react';
import { askAnswer, askSteps, askSuggestions, type AskAnswer } from '@/lib/ask';
import { DotColumns } from '../figures';
import { btn, cx, Foot, Icon, meta, PageHead } from '../ui';

interface Msg {
  id: number;
  role: 'user' | 'assistant';
  text?: string;
  answer?: AskAnswer;
  status: string | null;
  revealed: number;
  pending: boolean;
}

let nextId = 1;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const riskRow = (level: number) => (level > 70 ? 'bg-act' : level > 40 ? 'bg-watch' : 'bg-teal');
const countRow = () => 'bg-accent';

function Chart({ a }: { a: NonNullable<AskAnswer['chart']> }) {
  return (
    <figure className="mt-3 rounded-md bg-sunk p-4">
      <DotColumns
        cols={a.cols}
        max={a.max}
        rows={10}
        rowClass={a.scale === 'risk' ? riskRow : countRow}
        lines={a.scale === 'risk' ? [{ value: 70, className: 'border-act' }] : []}
        label={a.label}
        height="h-28"
      />
      <figcaption className={cx(meta, 'mt-2')}>{a.caption}</figcaption>
    </figure>
  );
}

function Answer({ m }: { m: Msg }) {
  const a = m.answer!;
  const blocks = a.blocks.slice(0, m.revealed);
  const showChart = a.chart && m.revealed > a.blocks.length;
  const tone = a.kind === 'offtopic' ? 'border-watch/40 bg-watch-bg/40' : 'border-line bg-paper';
  return (
    <div className="flex gap-3">
      <span className="grid size-8 flex-none place-items-center rounded-full bg-accent text-paper"><Icon name="shield" className="size-[18px]" /></span>
      <article className={cx('min-w-0 flex-1 rounded-xl rounded-tl-sm border px-4 py-3', tone)} aria-live={m.pending ? 'polite' : undefined}>
        {a.headline ? <p className="text-[14.5px] font-medium leading-snug text-ink">{a.headline}</p> : null}
        {blocks.map((b, i) =>
          b.kind === 'p'
            ? <p key={i} className="mt-2 text-[13.5px] leading-relaxed text-ink-2">{b.text}</p>
            : <ul key={i} className="mt-2 flex flex-col gap-1">{b.items.map((it, j) => <li key={j} className="flex gap-2 text-[13.5px] text-ink-2"><span className="mt-[7px] size-1.5 flex-none rounded-[2px] bg-ink/40" />{it}</li>)}</ul>,
        )}
        {showChart && a.chart ? <Chart a={a.chart} /> : null}
        {!m.pending && (a.sources?.length || a.checked) ? (
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-line pt-2.5 text-[11.5px] text-muted">
            {a.checked ? <span className="inline-flex items-center gap-1 text-low"><Icon name="check" className="size-3.5" stroke={2.6} />Figures checked</span> : null}
            {a.queries ? <span>{a.queries} {a.queries === 1 ? 'query' : 'queries'}</span> : null}
            {a.sources?.length ? <span className="inline-flex items-center gap-1"><Icon name="file" className="size-3.5" />{a.sources.join(' · ')}</span> : null}
          </div>
        ) : null}
      </article>
    </div>
  );
}

function Thinking({ status }: { status: string | null }) {
  return (
    <div className="flex gap-3" aria-live="polite">
      <span className="grid size-8 flex-none place-items-center rounded-full bg-accent text-paper"><Icon name="shield" className="size-[18px]" /></span>
      <div className="flex items-center gap-2.5 rounded-xl rounded-tl-sm border border-line bg-paper px-4 py-3">
        <span className="flex gap-1" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span key={i} className="size-1.5 animate-bounce rounded-full bg-accent motion-reduce:animate-none" style={{ animationDelay: `${i * 140}ms` }} />
          ))}
        </span>
        <span className="text-[13px] text-muted">{status ?? askSteps[0]}</span>
      </div>
    </div>
  );
}

export function AskView() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);
  const feed = useRef<HTMLDivElement>(null);
  const seeded = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  // Optional: /ask?q=… asks a question on load, for deep links and demos.
  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    const q = new URLSearchParams(window.location.search).get('q');
    if (q) void run(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = (id: number, patch: Partial<Msg>) => { if (alive.current) setMsgs((m) => m.map((x) => (x.id === id ? { ...x, ...patch } : x))); };

  useEffect(() => { feed.current?.scrollTo({ top: feed.current.scrollHeight, behavior: 'smooth' }); }, [msgs]);

  async function run(question: string) {
    const trimmed = question.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setInput('');
    const aid = ++nextId;
    setMsgs((m) => [...m, { id: ++nextId, role: 'user', text: trimmed, status: null, revealed: 0, pending: false }, { id: aid, role: 'assistant', status: askSteps[0], revealed: 0, pending: true }]);

    for (let i = 0; i < askSteps.length; i++) { update(aid, { status: askSteps[i] }); await sleep(i === 1 ? 650 : 500); }
    const ans = askAnswer(trimmed);
    update(aid, { answer: ans, status: null, revealed: 0 });
    const steps = ans.blocks.length + (ans.chart ? 1 : 0);
    for (let k = 0; k < steps; k++) { await sleep(190); update(aid, { revealed: k + 1 }); }
    update(aid, { pending: false });
    if (alive.current) setBusy(false);
  }

  const empty = msgs.length === 0;

  return (
    <>
      <PageHead
        title="Ask IonHSE"
        desc="Ask about the plant's safety data in plain words. Every answer is built from the same records the dashboard shows — and the figures are checked before you see them."
        tools={msgs.length ? <button type="button" className={btn('light')} onClick={() => setMsgs([])}><Icon name="plus" />New chat</button> : undefined}
      />

      <div data-tour="chat" className="flex min-w-0 flex-col overflow-hidden rounded-lg bg-paper shadow-[0_1px_2px_rgb(0_0_0/0.04),0_10px_30px_-14px_rgb(0_0_0/0.10)] ring-1 ring-line">
        <div ref={feed} className="flex max-h-[min(62vh,620px)] min-h-[380px] flex-col gap-5 overflow-y-auto p-5">
          {empty ? (
            <div className="m-auto max-w-[520px] py-6 text-center">
              <span className="mx-auto grid size-12 place-items-center rounded-full bg-sage text-accent"><Icon name="shield" className="size-6" /></span>
              <h2 className="mt-4 text-[18px] font-medium tracking-[-0.01em]">Ask IonHSE</h2>
              <p className={cx(meta, 'mx-auto mt-1.5 max-w-[380px]')}>Questions about zones, alerts, incidents, permits, hazards and compliance — answered from this plant's records.</p>
              <div className="mt-5 grid grid-cols-2 gap-2.5 text-left max-compact:grid-cols-1">
                {askSuggestions.map((s) => (
                  <button key={s} type="button" onClick={() => run(s)} className="flex items-center gap-2.5 rounded-md bg-paper px-3.5 py-3 text-[13px] text-ink-2 ring-1 ring-line transition-colors hover:bg-sunk">
                    <Icon name="send" className="size-4 flex-none text-accent" />{s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            msgs.map((m) =>
              m.role === 'user' ? (
                <div key={m.id} className="ml-auto max-w-[82%] rounded-xl rounded-br-sm bg-sage px-4 py-2.5 text-[14px] text-ink">{m.text}</div>
              ) : m.answer ? (
                <Answer key={m.id} m={m} />
              ) : (
                <Thinking key={m.id} status={m.status} />
              ),
            )
          )}
        </div>

        <form
          className="flex items-end gap-2.5 border-t border-line p-3.5"
          onSubmit={(e) => { e.preventDefault(); void run(input); }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void run(input); } }}
            rows={1}
            placeholder="Ask about zones, alerts, incidents, hazards, compliance…"
            className="max-h-32 min-h-[44px] flex-1 resize-none rounded-[8px] bg-sunk px-3.5 py-3 text-[14px] text-ink outline-none ring-1 ring-line placeholder:text-soft focus:ring-ink/30"
          />
          <button type="submit" disabled={busy || !input.trim()} className={cx(btn('dark'), 'h-11 disabled:opacity-40')} aria-label="Send">
            <Icon name="send" />Send
          </button>
        </form>
      </div>

      <Foot left="Mock answers for the four-week pilot preview — grounded in the sample data. The live build answers from your plant's records with a model." />
    </>
  );
}
