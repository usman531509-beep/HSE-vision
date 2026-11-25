'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { GUIDES } from '@/lib/guides';
import { btn, Card, cx, Icon, PageHead } from '../ui';

export function GuideView() {
  const [q, setQ] = useState('');
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return GUIDES;
    return GUIDES.filter((g) =>
      [g.title, g.summary, ...g.tasks.flatMap((k) => [k.title, ...k.steps]), ...(g.tips ?? [])].join(' ').toLowerCase().includes(t),
    );
  }, [q]);

  return (
    <>
      <PageHead
        title="User guide"
        desc="How to use each module, step by step. Every guide can start a tour of its page."
        tools={
          <label className="flex h-11 w-[360px] max-w-full items-center gap-2 rounded-[8px] bg-paper px-3.5 ring-1 ring-line focus-within:ring-2 focus-within:ring-ink">
            <Icon name="search" className="size-4 text-muted" />
            <span className="sr-only">Search the guide</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search, e.g. approve a permit" className="min-w-0 flex-1 bg-transparent text-[13.5px] outline-0 placeholder:text-soft" />
          </label>
        }
      />
      <div className="grid grid-cols-[220px_minmax(0,1fr)] items-start gap-6 max-nav:grid-cols-1">
        <nav aria-label="Guide contents" className="sticky top-4 flex flex-col gap-0.5 max-nav:static max-nav:flex-row max-nav:flex-wrap" data-tour="guide-index">
          {GUIDES.map((g) => {
            const on = shown.includes(g);
            return (
              <a
                key={g.id}
                href={`#${g.id}`}
                className={cx('rounded-[8px] px-3 py-2 text-[13.5px] hover:bg-paper max-nav:bg-paper max-nav:ring-1 max-nav:ring-line', on ? 'text-ink-2' : 'pointer-events-none text-soft')}
              >
                {g.title}
              </a>
            );
          })}
        </nav>

        <div className="flex min-w-0 flex-col gap-4">
          {shown.length ? shown.map((g) => (
            <Card
              key={g.id}
              id={g.id}
              tour={g.id === 'getting-started' ? 'guide-article' : undefined}
              title={g.title}
              sub={g.summary}
              extra={g.href ? (
                <div className="flex flex-wrap gap-2">
                  <Link className={btn('light', 'sm')} href={`${g.href}?tour=1`}><Icon name="help" />Tour this page</Link>
                  <Link className={btn('dark', 'sm')} href={g.href}>Open<Icon name="send" /></Link>
                </div>
              ) : undefined}
            >
              <div className="grid grid-cols-2 gap-4 max-compact:grid-cols-1">
                {g.tasks.map((t) => (
                  <section key={t.title} className="rounded-md bg-sunk px-4 py-3.5">
                    <h3 className="text-[13.5px] font-medium">{t.title}</h3>
                    <ol className="mt-2 flex flex-col gap-1.5">
                      {t.steps.map((s, k) => (
                        <li key={k} className="flex gap-2.5 text-[13px] leading-[1.5] text-ink-2">
                          <span className="mt-px grid size-5 flex-none place-items-center rounded-[5px] bg-ink text-[10.5px] font-semibold text-paper tabular-nums">{k + 1}</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ol>
                  </section>
                ))}
              </div>
              {g.tips?.length ? (
                <div className="rounded-md bg-sage px-4 py-3">
                  <div className="text-[12.5px] font-medium text-ink">Good to know</div>
                  <ul className="mt-1 flex flex-col gap-1">
                    {g.tips.map((t) => <li key={t} className="text-[13px] leading-[1.5] text-ink-2">{t}</li>)}
                  </ul>
                </div>
              ) : null}
            </Card>
          )) : (
            <Card title="No matches">
              <p className="text-[13px] text-muted">Nothing in the guide matches “{q}”. Try a module name or a task such as “lockout”.</p>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
