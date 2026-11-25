'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { site } from '@/lib/data';
import { PAGES, pageForPath } from '@/lib/pages';
import { useHse } from './state';
import { cx, Icon } from './ui';

/** Shell: floating top bar (brand pill · pill nav · ask, alerts, avatar) over the pastel wash. */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const page = pageForPath(pathname);

  // Old links used hashes (#live, #permits…). Send them to the matching route.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    const p = PAGES.find((x) => x.id === id);
    if (p) router.replace(p.href);
  }, [router]);

  useEffect(() => {
    document.title = 'Visual HSE · ' + page.title;
  }, [page.title]);

  return (
    <div className="mx-auto min-h-screen max-w-[1480px] px-6 pb-10 max-compact:px-4">
      <TopBar pathname={pathname} />
      <main>{children}</main>
    </div>
  );
}

const roundBtn = 'relative grid size-11 flex-none place-items-center rounded-full bg-paper/90 text-ink shadow-[0_1px_2px_rgb(0_0_0/0.05)] ring-1 ring-white/70 backdrop-blur hover:bg-paper';

function TopBar({ pathname }: { pathname: string }) {
  return (
    <header className="relative z-20 -mx-6 flex items-center justify-between gap-4 px-6 pt-4 pb-3 max-compact:-mx-4 max-compact:px-4 max-xl:flex-wrap">
      <Link href="/" className="inline-flex h-11 flex-none items-center gap-2.5 rounded-full bg-paper/60 pr-5 pl-2 ring-1 ring-ink/15 backdrop-blur">
        <span className="grid size-8 place-items-center rounded-full bg-ink text-lime"><Icon name="eye" className="size-4" /></span>
        <span className="text-[13px] font-semibold tracking-[0.06em] uppercase">Visual HSE</span>
      </Link>

      <nav aria-label="Main" className="order-none max-xl:order-last max-xl:w-full">
        <div className="flex gap-0.5 overflow-x-auto rounded-full bg-paper/90 p-1 shadow-[0_1px_2px_rgb(0_0_0/0.05)] ring-1 ring-white/70 backdrop-blur [scrollbar-width:none]">
          {PAGES.map((p) => {
            const here = pathname === p.href;
            return (
              <Link
                key={p.id}
                href={p.href}
                aria-current={here ? 'page' : undefined}
                className="inline-flex h-9 flex-none items-center gap-1.5 rounded-full px-4 text-[13px] whitespace-nowrap text-ink-2 hover:bg-sunk aria-[current=page]:bg-ink aria-[current=page]:text-paper"
              >
                {p.nav}
                {p.count ? (
                  <span
                    className={cx('grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[10.5px] font-semibold tabular-nums', p.count[1] === 'act' ? 'bg-act text-paper' : 'bg-lime text-lime-ink')}
                    aria-label={`${p.count[0]} open`}
                  >
                    {p.count[0]}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="flex flex-none items-center gap-2">
        <span className="mr-1 hidden flex-col items-end text-right text-[12px] leading-tight text-muted 2xl:flex">
          <span className="text-ink">{site.name}</span>
          <span>{site.shift}</span>
        </span>
        <span className="mr-1 inline-flex h-7 items-center gap-1.5 rounded-full bg-lime px-3 text-[11.5px] font-semibold text-lime-ink before:size-1.5 before:rounded-full before:bg-low max-compact:hidden">LIVE</span>
        <AskData />
        <button type="button" className={roundBtn} aria-label="Notifications, 3 high-severity events">
          <Icon name="bell" />
          <span className="absolute top-2.5 right-3 size-2 rounded-full bg-act ring-2 ring-paper" />
        </button>
        <span className="grid size-11 place-items-center rounded-full bg-ink text-[13px] font-semibold text-lime" role="img" aria-label={`Signed in as ${site.user}`}>
          {site.initials}
        </span>
      </div>
    </header>
  );
}

/** "Ask the data" lives behind a round button; the panel drops down under it. */
function AskData() {
  const { s, set } = useHse();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown); };
  }, [open]);

  function ask(e: FormEvent) {
    e.preventDefault();
    set({ askNote: true });
  }

  return (
    <div ref={ref} className="relative">
      <button type="button" className={roundBtn} aria-label="Ask the data" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Icon name="search" />
      </button>
      {open ? (
        <form onSubmit={ask} className="absolute top-[52px] right-0 z-30 w-[320px] rounded-lg bg-paper p-4 shadow-[0_20px_50px_-20px_rgb(0_0_0/0.25)] ring-1 ring-line">
          <label htmlFor="ask-q" className="block text-[14px] font-medium">Ask the data</label>
          <p className="mt-0.5 text-[12.5px] text-muted">
            {s.askNote ? 'Answers with cited sources run in the pilot app. This preview shows the layout only.' : 'Answers come with cited sources.'}
          </p>
          <div className="mt-3 flex h-11 items-center gap-1.5 rounded-full bg-sunk pr-1 pl-4 focus-within:ring-2 focus-within:ring-ink">
            <input id="ask-q" autoFocus placeholder="Why did Press 3 stop?" autoComplete="off" className="min-w-0 flex-1 bg-transparent text-[13px] outline-0 placeholder:text-soft" />
            <button type="submit" aria-label="Ask" className="grid size-9 place-items-center rounded-full bg-ink text-lime"><Icon name="send" className="size-4" /></button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
