'use client';

import { motion, useReducedMotion } from 'motion/react';
import { useRef } from 'react';
import { ENTER, STAGGER } from '../../../motion';
import { cx, Dot, TEXT } from '../../../ui';
import { AgentAvatar } from './avatar';
import { Thinking } from './thinking';
import { LAND, OVERHANG, useConverge } from './converge';
import type { Msg } from './use-agent';

export function UserBubble({ text }: { text: string }) {
  return (
    <motion.li layout="position" {...ENTER} className="flex justify-end">
      <p className="max-w-[85%] rounded-[14px] rounded-br-[4px] bg-ink px-3.5 py-2 text-[13.5px] text-paper">{text}</p>
    </motion.li>
  );
}

/** Shade's reply: thinking, then the headline streaming in word by word, then its rows one after another. */
export function AgentMessage({ m, thinking }: { m: Msg; thinking: boolean }) {
  const a = m.answer;
  if (!a) return null;
  const words = a.headline.split(' ');
  const shown = m.shown ?? 0;
  const done = shown >= words.length;
  const still = useReducedMotion() ?? false;
  const para = useRef<HTMLParagraphElement>(null);
  const dots = useRef<HTMLCanvasElement>(null);
  useConverge(para, dots, shown, still);
  return (
    <motion.li layout="position" {...ENTER} className="flex gap-2.5">
      <AgentAvatar size="sm" />
      <div className="min-w-0 flex-1 pt-0.5">
        {thinking ? <Thinking /> : (
          <>
            <p ref={para} className="relative text-[13.5px] leading-relaxed text-ink" aria-live="polite">
              <canvas ref={dots} aria-hidden="true" className="pointer-events-none absolute" style={{ left: -OVERHANG, top: -OVERHANG }} />
              {/* Pixels gather into each word, then the real text fades in under them as they land. */}
              {words.slice(0, shown).map((w, i) => (
                <span key={i}>{i ? ' ' : null}<span data-w={i} className="inline-block animate-land" style={{ animationDelay: `${LAND.delay}ms`, animationDuration: `${LAND.duration}ms` }}>{w}</span></span>
              ))}
              {!done && !m.stopped ? <span aria-hidden="true" className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] animate-pulse bg-watch" /> : null}
            </p>
            {done && a.rows.length ? (
              <ul className="mt-2.5 flex flex-col rounded-md bg-sunk px-3.5 py-1">
                {a.rows.map((r, i) => (
                  <motion.li
                    key={r.label}
                    {...ENTER}
                    transition={{ ...ENTER.transition, delay: i * STAGGER }}
                    className="flex items-center gap-2.5 border-t border-line py-2 text-[13px] first:border-t-0"
                  >
                    {r.tone ? <Dot tone={r.tone} /> : null}
                    <span className="min-w-0 flex-1 truncate">{r.label}{r.sub ? <span className="text-muted"> · {r.sub}</span> : null}</span>
                    <b className={cx('font-medium whitespace-nowrap tabular-nums', r.tone && TEXT[r.tone])}>{r.value}</b>
                  </motion.li>
                ))}
              </ul>
            ) : null}
            {done || m.stopped ? (
              <motion.p {...ENTER} className="mt-1.5 text-[11.5px] text-muted">
                {m.stopped && !done ? 'Stopped' : `Source: ${a.source}`}
              </motion.p>
            ) : null}
          </>
        )}
      </div>
    </motion.li>
  );
}
