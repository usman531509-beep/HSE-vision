'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { SWAP } from '../../../motion';
import { cx } from '../../../ui';

/** What Shade is "doing" while it thinks, in the order the real engine would work. */
const STEPS = ['Reading the sensors', 'Checking the forecast', 'Scoring each area'] as const;
const BARS = 5;
/** One meter step, ms. The meter climbs, then empties, like a signal finding its level. */
const STEP_MS = 140;
const LABEL_MS = 430;
/** Per-bar delay, ms: bars fill bottom up and empty top down. */
const BAR_DELAY_MS = 30;

/** Rising bars filled up to `level`, like a signal meter. */
function Meter({ level }: { level: number }) {
  return (
    <span aria-hidden="true" className="flex h-3.5 items-end gap-[2px]">
      {Array.from({ length: BARS }, (_, i) => (
        <span
          key={i}
          className={cx('w-[3px] rounded-[1px] transition-colors duration-200', i <= level ? 'bg-watch' : 'bg-line-2')}
          style={{ height: `${((i + 1) / BARS) * 100}%`, transitionDelay: `${(i <= level ? i : BARS - 1 - i) * BAR_DELAY_MS}ms` }}
        />
      ))}
    </span>
  );
}

/** Shade at work: a pulsing meter and a status line that crossfades through the steps. */
export function Thinking() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setTick((n) => n + 1), STEP_MS);
    return () => window.clearInterval(t);
  }, []);
  // Climb 0 → BARS-1 then back down, forever.
  const cycle = (BARS - 1) * 2;
  const pos = tick % cycle;
  const level = pos < BARS ? pos : cycle - pos;
  const step = STEPS[Math.floor((tick * STEP_MS) / LABEL_MS) % STEPS.length];

  return (
    <div role="status" className="flex items-center gap-2.5 text-[13px] text-muted">
      <Meter level={level} />
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span key={step} {...SWAP}>{step}…</motion.span>
      </AnimatePresence>
    </div>
  );
}
