'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { site } from '@/lib/data';
import { PAGES, pageForPath } from '@/lib/pages';
import { useHse } from './state';
import { Logo, LogoMark } from './logo';
import { Tour, useAutoTour } from './tour';
import { cx, Icon } from './ui';

/** Shell: sticky sidebar (brand · nav · site) beside a slim top bar and the page, over the pastel wash. */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const page = pageForPath(pathname);
  const { s, set } = useHse();
  const [touring, setTouring] = useState(false);
  const startTour = useCallback(() => { set({ menuOpen: false }); setTouring(true); }, [set]);
  const stopTour = useCallback(() => setTouring(false), []);
  useAutoTour(page.id, startTour);

  // Links such as /permits?tour=1 (from the user guide) open the page's tour.
  useEffect(() => {
    const u = new URL(window.location.href);
    if (u.searchParams.get('tour') !== '1') return;
    u.searchParams.delete('tour');
    window.history.replaceState(null, '', u.pathname + u.search + u.hash);
    const t = setTimeout(startTour, 500);
    return () => clearTimeout(t);
  }, [pathname, startTour]);

  // Old links used hashes (#live, #permits…). Send them to the matching route.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    const p = PAGES.find((x) => x.id === id);
    if (p) router.replace(p.href);
  }, [router]);

  useEffect(() => {
    document.title = 'Visual HSE · ' + page.title;
  }, [page.title]);

  // Close the mobile drawer on navigation and on Escape.
  useEffect(() => {
    set({ menuOpen: false });
  }, [pathname, set]);

  useEffect(() => {
    if (!s.menuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') set({ menuOpen: false }); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [s.menuOpen, set]);

  return (
    <div className="mx-auto flex min-h-screen max-w-[1560px] gap-6 px-6 max-nav:gap-4 max-compact:block max-compact:px-4">
      {s.menuOpen ? (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-30 bg-ink/25 nav:hidden"
          onClick={() => set({ menuOpen: false })}
        />
      ) : null}
      <Sidebar current={page.nav} open={s.menuOpen} />
      <Rail current={page.nav} onMenu={() => set({ menuOpen: true })} />
      <div className="relative min-w-0 flex-1 pb-10">
        <TopBar onMenu={() => set({ menuOpen: true })} onGuide={startTour} />
        <main>{children}</main>
        <Tour key={page.id} page={page.id} open={touring} onClose={stopTour} />
      </div>
    </div>
  );
}

const roundBtn = 'relative grid size-11 flex-none place-items-center rounded-[8px] bg-paper text-ink shadow-[0_1px_2px_rgb(0_0_0/0.05)] ring-1 ring-line hover:bg-paper';

function Brand() {
  return (
    <Link href="/" aria-label="Visual HSE home" className="inline-flex h-11 items-center rounded-[8px] px-1.5">
      <Logo />
    </Link>
  );
}

function Sidebar({ current, open }: { current: string; open: boolean }) {
  return (
    <aside
      id="sidebar"
      className={cx(
        // Sticky on desktop: the sidebar is one viewport tall, so it stays pinned while the page scrolls.
        'sticky top-4 z-40 my-4 flex h-[calc(100vh-2rem)] w-[244px] flex-none flex-col gap-2 self-start rounded-lg bg-paper p-3 shadow-[0_1px_2px_rgb(0_0_0/0.05)] ring-1 ring-line',
        'max-nav:fixed max-nav:top-3 max-nav:bottom-3 max-nav:left-3 max-nav:my-0 max-nav:h-auto max-nav:bg-paper max-nav:shadow-[0_20px_50px_-20px_rgb(0_0_0/0.3)] max-nav:transition-transform max-nav:duration-200 max-nav:ease-out',
        open ? 'max-nav:translate-x-0' : 'max-nav:-translate-x-[calc(100%+1rem)]',
      )}
    >
      <div className="flex items-center justify-between">
        <Brand />
        <CloseBtn />
      </div>

      <nav aria-label="Main" data-tour="shell-nav" className="mt-2 -mr-1 flex-1 overflow-y-auto pr-1 [scrollbar-width:thin]">
        <p className="px-3 pb-1.5 text-[11.5px] font-medium text-soft">Menu</p>
        <ul className="flex flex-col gap-0.5">
          {PAGES.map((p) => {
            const here = current === p.id;
            return (
              <li key={p.id}>
                <Link
                  href={p.href}
                  aria-current={here ? 'page' : undefined}
                  className="group flex h-11 items-center gap-3 rounded-[8px] pr-2 pl-4 text-[13.5px] text-ink-2 hover:bg-sunk aria-[current=page]:bg-ink aria-[current=page]:text-paper"
                >
                  <p.icon aria-hidden="true" strokeWidth={1.75} className="size-[18px] flex-none text-muted group-hover:text-ink group-aria-[current=page]:text-lime" />
                  <span className="min-w-0 flex-1 truncate">{p.nav}</span>
                  {p.count ? (
                    <span
                      className={cx('grid h-5 min-w-5 place-items-center rounded-[5px] px-1.5 text-[10.5px] font-semibold tabular-nums', p.count[1] === 'act' ? 'bg-act text-paper' : 'bg-lime text-lime-ink')}
                      aria-label={`${p.count[0]} open`}
                    >
                      {p.count[0]}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="rounded-md bg-sage p-3.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13px] font-medium">{site.name}</span>
          <span className="inline-flex h-6 items-center gap-1.5 rounded-[5px] bg-lime px-2.5 text-[10.5px] font-semibold text-lime-ink before:size-1.5 before:rounded-[2px] before:bg-low">LIVE</span>
        </div>
        <p className="mt-0.5 text-[12px] text-muted">{site.shift}</p>
      </div>

      <div className="flex items-center gap-2.5 px-1 pt-1">
        <span className="grid size-10 flex-none place-items-center rounded-[8px] bg-ink text-[12.5px] font-semibold text-lime" aria-hidden="true">{site.initials}</span>
        <span className="min-w-0 text-[13px] leading-tight">
          <span className="block truncate font-medium">{site.user}</span>
          <span className="block text-[12px] text-muted">Signed in</span>
        </span>
      </div>
    </aside>
  );
}

/**
 * Icon rail for mid widths (720–1100px, e.g. a split screen): the full sidebar is a drawer there,
 * so the rail keeps every screen one click away. The menu button opens the full drawer.
 */
function Rail({ current, onMenu }: { current: string; onMenu: () => void }) {
  return (
    <aside className="sticky top-4 z-20 my-4 hidden h-[calc(100vh-2rem)] w-[64px] flex-none flex-col items-center gap-2 self-start rounded-lg bg-paper py-3 shadow-[0_1px_2px_rgb(0_0_0/0.05)] ring-1 ring-line compact:max-nav:flex">
      <Link href="/" aria-label="Visual HSE home" className="grid size-11 place-items-center rounded-[8px]">
        <span className="grid size-9 place-items-center rounded-[9px] bg-ink text-paper [--logo-cut:#141414]">
          <LogoMark className="size-[26px]" />
        </span>
      </Link>
      <button type="button" aria-label="Open menu" aria-controls="sidebar" onClick={onMenu} className="grid size-11 place-items-center rounded-[8px] text-ink hover:bg-sunk">
        <Icon name="menu" />
      </button>
      <nav aria-label="Main (compact)" className="mt-1 flex w-full flex-1 flex-col items-center overflow-y-auto [scrollbar-width:none]">
        <ul className="flex flex-col gap-0.5">
          {PAGES.map((p) => {
            const here = current === p.id;
            return (
              <li key={p.id}>
                <Link
                  href={p.href}
                  aria-current={here ? 'page' : undefined}
                  aria-label={p.nav}
                  title={p.nav}
                  className="group relative grid size-11 place-items-center rounded-[8px] text-ink-2 hover:bg-sunk aria-[current=page]:bg-ink"
                >
                  <p.icon aria-hidden="true" strokeWidth={1.75} className="size-[18px] text-muted group-hover:text-ink group-aria-[current=page]:text-lime" />
                  {p.count ? (
                    <span className={cx('absolute top-1.5 right-1.5 size-2 rounded-[2px] ring-2 ring-paper', p.count[1] === 'act' ? 'bg-act' : 'bg-lime')} aria-hidden="true" />
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <span className="grid size-10 flex-none place-items-center rounded-[8px] bg-ink text-[12.5px] font-semibold text-lime" role="img" aria-label={`Signed in as ${site.user}`}>
        {site.initials}
      </span>
    </aside>
  );
}

function CloseBtn() {
  const { set } = useHse();
  return (
    <button type="button" aria-label="Close menu" onClick={() => set({ menuOpen: false })} className="grid size-9 place-items-center rounded-[8px] hover:bg-sunk nav:hidden">
      <Icon name="x" className="size-4" />
    </button>
  );
}

function TopBar({ onMenu, onGuide }: { onMenu: () => void; onGuide: () => void }) {
  return (
    <header className="relative z-20 flex items-center justify-between gap-3 pt-4 pb-3 nav:absolute nav:top-0 nav:right-0 nav:pb-0">
      <div className="flex items-center gap-2 compact:hidden">
        <button type="button" className={roundBtn} aria-label="Open menu" aria-controls="sidebar" onClick={onMenu}>
          <Icon name="menu" />
        </button>
      </div>
      <div className="ml-auto flex flex-none items-center gap-2">
        <button type="button" className="inline-flex h-11 flex-none items-center gap-2 rounded-[8px] bg-paper px-4 text-[13px] font-medium text-ink shadow-[0_1px_2px_rgb(0_0_0/0.05)] ring-1 ring-line hover:bg-sunk" onClick={onGuide} data-tour="shell-guide">
          <Icon name="help" />Guide
        </button>
        <AskData />
        <button type="button" className={roundBtn} aria-label="Notifications, 3 high-severity events" data-tour="shell-bell">
          <Icon name="bell" />
          <span className="absolute top-2.5 right-3 size-2 rounded-[2px] bg-act ring-2 ring-paper" />
        </button>
        <span className="grid size-11 place-items-center rounded-[8px] bg-ink text-[13px] font-semibold text-lime compact:hidden" role="img" aria-label={`Signed in as ${site.user}`}>
          {site.initials}
        </span>
      </div>
    </header>
  );
}

/** "Ask IonHSE" opens the full chat page. */
function AskData() {
  return (
    <Link href="/ask" aria-label="Ask IonHSE" data-tour="shell-ask" className={roundBtn}>
      <Icon name="search" />
    </Link>
  );
}
