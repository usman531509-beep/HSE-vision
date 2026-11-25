'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { TOURS, type TourStep } from '@/lib/tour';
import { btn, cx } from './ui';

const SEEN = 'vhse-tour-seen:';
const PAD = 8;
type Rect = { top: number; left: number; width: number; height: number };

function find(step: TourStep): HTMLElement | null {
  const els = Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${step.target}"]`));
  return els.find((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; }) ?? null;
}

/** Coach marks: dims the page, spotlights one module at a time and explains it. */
export function Tour({ page, open, onClose }: { page: string; open: boolean; onClose: () => void }) {
  const [steps, setSteps] = useState<TourStep[]>([]);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const card = useRef<HTMLDivElement>(null);
  const [cardH, setCardH] = useState(180);

  // Build the step list when the tour opens: only targets that exist and are visible.
  useEffect(() => {
    if (!open) return;
    const list = (TOURS[page] ?? []).filter((s, k, all) => find(s) && all.findIndex((x) => x.target === s.target && x.title === s.title) === k);
    setSteps(list); setI(0);
    if (!list.length) onClose();
  }, [open, page, onClose]);

  const step = open ? steps[i] : undefined;

  // Scroll the target into view, then keep the spotlight on it while the page moves.
  useEffect(() => {
    if (!step) { setRect(null); return; }
    const el = find(step);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: el.offsetHeight > innerHeight * 0.7 ? 'start' : 'center' });
    let raf = 0;
    const loop = () => {
      const r = el.getBoundingClientRect();
      setRect((p) => (p && Math.abs(p.top - r.top) < 0.5 && Math.abs(p.left - r.left) < 0.5 && p.width === r.width && p.height === r.height ? p : { top: r.top, left: r.left, width: r.width, height: r.height }));
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [step]);

  useLayoutEffect(() => { if (card.current) setCardH(card.current.offsetHeight); }, [step, rect?.width]);

  const finish = useCallback(() => {
    try { localStorage.setItem(SEEN + page, '1'); } catch {}
    onClose();
  }, [page, onClose]);
  const next = useCallback(() => (i < steps.length - 1 ? setI(i + 1) : finish()), [i, steps.length, finish]);
  const back = useCallback(() => setI((k) => Math.max(0, k - 1)), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') back();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, next, back, finish]);

  useEffect(() => { if (step) card.current?.focus({ preventScroll: true }); }, [step]);

  if (!open || !step || !rect) return null;

  // Spotlight box, clipped to the viewport for very tall modules.
  const vw = innerWidth, vh = innerHeight;
  const s = {
    top: Math.max(6, rect.top - PAD), left: Math.max(6, rect.left - PAD),
    bottom: Math.min(vh - 6, rect.top + rect.height + PAD), right: Math.min(vw - 6, rect.left + rect.width + PAD),
  };
  const W = Math.min(340, vw - 32);
  const below = vh - s.bottom, above = s.top;
  let top: number, left: number;
  if (below >= cardH + 16) { top = s.bottom + 12; left = s.left; }
  else if (above >= cardH + 16) { top = s.top - cardH - 12; left = s.left; }
  else if (vw - s.right >= W + 24) { top = s.top + 12; left = s.right + 12; }
  else if (s.left >= W + 24) { top = s.top + 12; left = s.left - W - 12; }
  else { top = vh - cardH - 16; left = (vw - W) / 2; }
  left = Math.min(Math.max(16, left), vw - W - 16);
  top = Math.min(Math.max(16, top), vh - cardH - 16);

  return (
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-labelledby="tour-title" aria-describedby="tour-body">
      <div className="absolute inset-0" onClick={(e) => e.stopPropagation()} />
      <div
        className="pointer-events-none absolute rounded-[12px] ring-2 ring-lime transition-all duration-300 ease-out"
        style={{ top: s.top, left: s.left, width: s.right - s.left, height: s.bottom - s.top, boxShadow: '0 0 0 9999px rgb(20 20 20 / 0.55)' }}
      />
      <div
        ref={card}
        tabIndex={-1}
        className="absolute rounded-[12px] bg-paper p-4 shadow-[0_24px_60px_-20px_rgb(0_0_0/0.45)] outline-none transition-[top,left] duration-300 ease-out"
        style={{ top, left, width: W }}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-[12px] font-medium text-muted tabular-nums">Step {i + 1} of {steps.length}</span>
          <button type="button" onClick={finish} className="text-[12.5px] font-medium text-muted underline-offset-2 hover:text-ink hover:underline">Skip tour</button>
        </div>
        <h2 id="tour-title" className="mt-2 text-[16px] font-medium tracking-[-0.01em]">{step.title}</h2>
        <p id="tour-body" className="mt-1 text-[13.5px] leading-[1.5] text-ink-2">{step.body}</p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex gap-1" aria-hidden="true">
            {steps.map((_, k) => <span key={k} className={cx('h-1.5 rounded-[2px] transition-all', k === i ? 'w-4 bg-ink' : 'w-1.5 bg-line-2')} />)}
          </div>
          <div className="flex gap-2">
            {i > 0 ? <button type="button" className={btn('light', 'sm')} onClick={back}>Back</button> : null}
            <button type="button" className={btn('dark', 'sm')} onClick={next}>{i === steps.length - 1 ? 'Done' : 'Next'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** First visit to a page starts its tour once. */
export function useAutoTour(page: string, start: () => void) {
  useEffect(() => {
    let seen = false;
    try { seen = localStorage.getItem(SEEN + page) === '1'; } catch {}
    if (seen) return;
    const t = setTimeout(start, 900);
    return () => clearTimeout(t);
  }, [page, start]);
}
