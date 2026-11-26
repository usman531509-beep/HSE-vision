'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { RotateCcw } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { INTENTS } from '@/lib/heat/ask';
import { FORECAST_ISSUED, wbgtSensors } from '@/lib/heat/data';
import type { LiveReadings } from '@/lib/heat/engine';
import { EASE_OUT, ENTER, STAGGER } from '../../../motion';
import { Card, Dot } from '../../../ui';
import { AgentAvatar } from './avatar';
import { Composer, ContextPill } from './composer';
import { AgentMessage, UserBubble } from './message';
import { useAgent } from './use-agent';

const chip = 'h-8 rounded-full bg-paper px-3 text-[12.5px] text-ink-2 ring-1 ring-line transition-colors duration-150 ease-out hover:bg-sunk hover:text-ink disabled:opacity-50';
/** Suggestions shown under a running conversation. */
const MORE = 3;
const EXAMPLES = INTENTS.map((i) => i.q);
/** Soft fade where the thread scrolls under its edges, instead of a hard cut. px. */
const FADE = 'mask-[linear-gradient(to_bottom,transparent,black_14px,black_calc(100%-14px),transparent)]';

/** Shade, the heat-risk agent (output 3). Mock answers, built from the same live scores the page shows. */
export function HeatAgent({ live }: { live: LiveReadings }) {
  const { msgs, phase, ask, stop, reset } = useAgent(live);
  const still = useReducedMotion() ?? false;
  const thread = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const busy = phase !== 'idle';
  const asked = new Set(msgs.filter((m) => m.role === 'user').map((m) => m.text));
  const suggestions = INTENTS.filter((i) => !asked.has(i.q));

  const sensorsLive = wbgtSensors.filter((x) => live[x.id] !== undefined).length;

  // Follow the reply as it grows: words stream and rows animate in after the state changes, so watch the size itself.
  useEffect(() => {
    const box = thread.current, inner = content.current;
    if (!box || !inner) return;
    const follow = (): void => box.scrollTo({ top: box.scrollHeight, behavior: still ? 'auto' : 'smooth' });
    const ro = new ResizeObserver(follow);
    ro.observe(inner);
    return () => ro.disconnect();
  }, [still]);

  return (
    <Card
      id="ask"
      tour="heat-ask"
      className="h-[560px]"
      title={<><AgentAvatar size="sm" />Shade</>}
      sub="Heat-risk agent · answers from the live scores"
      extra={msgs.length ? (
        <button type="button" onClick={reset} className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12.5px] text-muted hover:bg-sunk hover:text-ink">
          <RotateCcw aria-hidden="true" strokeWidth={1.75} className="size-3.5" />New chat
        </button>
      ) : null}
    >
      <div ref={thread} className={`-mx-1 flex min-h-0 flex-1 flex-col overflow-y-auto px-1 [scrollbar-width:thin] ${FADE}`}>
        {/* mt-auto anchors short content to the bottom, next to the input; long threads scroll as usual. */}
        <div ref={content} className="mt-auto py-3">
        {msgs.length ? (
          <ul className="flex flex-col gap-4">
            <AnimatePresence initial={false}>
              {msgs.map((m, i) => (m.role === 'user'
                ? <UserBubble key={m.id} text={m.text} />
                : <AgentMessage key={m.id} m={m} thinking={phase === 'thinking' && i === msgs.length - 1} />))}
            </AnimatePresence>
          </ul>
        ) : (
          <motion.div {...ENTER} className="flex flex-col gap-4">
            <p className="text-[22px] leading-tight font-light tracking-[-0.02em]">What do you want to know about the heat?</p>
            <div className="flex flex-wrap gap-1.5">
              {INTENTS.map((it, i) => (
                <motion.button key={it.id} type="button" className={chip} onClick={() => ask(it.q, it)} {...ENTER} transition={{ ...ENTER.transition, delay: 0.1 + i * STAGGER }}>
                  {it.q}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
        </div>
      </div>
      <AnimatePresence initial={false}>
        {msgs.length && !busy && suggestions.length ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: still ? 0 : 0.2, ease: EASE_OUT }}
            className="-mb-2 overflow-hidden"
          >
            <div className="flex gap-1.5 overflow-x-auto pb-2 [scrollbar-width:none]">
              {suggestions.slice(0, MORE).map((it) => (
                <button key={it.id} type="button" className={`${chip} flex-none`} onClick={() => ask(it.q, it)}>{it.q}</button>
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <Composer
        busy={busy}
        onSend={(q) => ask(q)}
        onStop={stop}
        // Only questions not asked yet, so the hint never suggests a repeat.
        examples={suggestions.length ? suggestions.map((i) => i.q) : EXAMPLES}
        context={(
          <>
            <ContextPill><Dot tone={sensorsLive ? 'low' : 'off'} className={sensorsLive ? 'animate-pulse' : ''} />{sensorsLive} sensors live</ContextPill>
            <ContextPill>Forecast {FORECAST_ISSUED}</ContextPill>
          </>
        )}
      />
    </Card>
  );
}
