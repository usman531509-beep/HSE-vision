'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Mic, X } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useToneColors } from '../../../../heat/use-tokens';
import { SWAP } from '../../../../motion';
import { cx, Dot } from '../../../../ui';
import { drawMound, type MoundShape } from './mound';
import { LINE, Swarm } from './swarm';
import { MAX_S, useVoice } from './use-voice';

const ghost = 'grid size-8 flex-none place-items-center rounded-full text-muted transition-colors duration-150 ease-out hover:bg-sunk hover:text-ink focus-visible:ring-2 focus-visible:ring-ink/30 focus-visible:outline-none';
const clock = (s: number): string => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/** Opens the voice composer. Sits beside Send and matches its size. */
export function MicButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" aria-label="Ask by voice" title="Ask by voice" onClick={onClick} className={cx(ghost, 'active:scale-95')}>
      <Mic strokeWidth={1.75} className="size-4" />
    </button>
  );
}

/**
 * Voice composer: speak and the words are built out of the light of your voice.
 * Stop sends what was heard; Esc or the cross throws it away. `script` is what the demo voice says where the browser cannot listen.
 */
export function VoicePanel({ script, onDone, onCancel }: { script: string; onDone: (text: string) => void; onCancel: () => void }) {
  const still = useReducedMotion() ?? false;
  const colors = useToneColors();
  const canvas = useRef<HTMLCanvasElement>(null);
  const swarm = useRef<Swarm | null>(null);
  const mound = useRef<MoundShape>({ centre: 0.5, topAt: () => 0 });
  const width = useRef(0);
  const tools = useRef<HTMLDivElement>(null);
  const [heard, setHeard] = useState(0);

  // The words use the page's sans; the canvas element carries `font-mono` so the mound can read the mono stack.
  useLayoutEffect(() => {
    const el = canvas.current;
    if (!el?.parentElement) return;
    swarm.current = new Swarm(getComputedStyle(el.parentElement).fontFamily, still);
  }, [still]);

  const onWord = useCallback((w: string): void => {
    swarm.current?.add(w, mound.current, width.current, performance.now());
    setHeard((n) => n + 1);
  }, []);
  const voice = useVoice({ script, onWord });
  const { level, finish, elapsed, mode } = voice;
  const done = useCallback((): void => onDone(finish()), [onDone, finish]);

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext('2d');
    if (!el || !ctx || !colors) return;
    const mono = getComputedStyle(el).fontFamily;
    let h = 0;
    const fit = (): void => {
      const dpr = window.devicePixelRatio || 1;
      width.current = el.clientWidth;
      h = el.clientHeight;
      el.width = Math.round(width.current * dpr);
      el.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    let raf = 0;
    const frame = (now: number): void => {
      ctx.clearRect(0, 0, width.current, h);
      // Reduced motion: the mound holds still at the voice's level instead of breathing.
      mound.current = drawMound(ctx, width.current, h, still ? 0 : now / 1000, level(), mono, colors.ink);
      // The line ends a little short of the timer group, whatever it holds (the Demo tag comes and goes).
      swarm.current?.draw(ctx, (tools.current?.offsetLeft ?? width.current) - LINE.x, now, colors.ink);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [colors, still, level]);

  useEffect(() => { if (elapsed >= MAX_S) done(); }, [elapsed, done]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') { e.preventDefault(); finish(); onCancel(); }
      if (e.key === 'Enter') { e.preventDefault(); done(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [done, finish, onCancel]);

  const hint = mode === 'demo' ? 'Demo voice, no mic here' : mode === 'mic' ? 'Listening… ask away' : 'Starting the mic…';
  return (
    <div className="relative -mx-4 -mt-3 -mb-2.5 h-[136px] overflow-hidden rounded-[18px]" role="group" aria-label="Voice question">
      <canvas ref={canvas} aria-hidden="true" className="absolute inset-0 size-full font-mono" />
      <AnimatePresence initial={false}>
        {heard ? null : (
          <motion.p key={hint} {...SWAP} className="pointer-events-none absolute max-w-[calc(100%-180px)] truncate text-[14px] leading-6 text-soft" style={{ left: LINE.x, top: LINE.y - 3 }}>
            {hint}
          </motion.p>
        )}
      </AnimatePresence>
      <div ref={tools} className="absolute top-2.5 right-2.5 flex items-center gap-1">
        {mode === 'demo' ? <span className="rounded-full bg-sunk px-2 py-0.5 text-[11px] text-ink-2">Demo</span> : null}
        <span className="flex items-center gap-1.5 px-1.5 text-[12.5px] text-muted tabular-nums" aria-label={`Recording, ${elapsed} seconds`}>
          <Dot tone="act" className={still ? '' : 'animate-pulse'} />{clock(elapsed)}
        </span>
        <button type="button" aria-label="Discard the recording" title="Discard (Esc)" onClick={() => { finish(); onCancel(); }} className={ghost}>
          <X strokeWidth={1.75} className="size-4" />
        </button>
      </div>
      <button
        type="button"
        onClick={done}
        aria-label="Stop and ask"
        title="Stop and ask (Enter)"
        className="absolute right-3 bottom-3 grid size-11 place-items-center rounded-full bg-sunk ring-1 ring-line transition-[background-color,transform] duration-150 ease-out hover:bg-line active:scale-95 focus-visible:ring-2 focus-visible:ring-ink/30 focus-visible:outline-none"
      >
        <span className="size-3 rounded-[3px] bg-ink" />
      </button>
      <p className="sr-only" aria-live="polite">{hint}</p>
    </div>
  );
}
