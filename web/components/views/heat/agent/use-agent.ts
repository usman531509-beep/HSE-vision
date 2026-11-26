'use client';

import { useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FALLBACK, matchQuestion, type HeatAnswer, type Intent } from '@/lib/heat/ask';
import type { LiveReadings } from '@/lib/heat/engine';

export type Phase = 'idle' | 'thinking' | 'streaming';
export interface Msg {
  id: number;
  role: 'user' | 'agent';
  text: string;
  answer?: HeatAnswer;
  /** Words of the headline shown so far, while it streams. */
  shown?: number;
  stopped?: boolean;
}

/** Mock pacing: long enough to read as work being done, short enough not to annoy. */
const THINK_MS = 1300;
/** Pace of the reply, ms per word: slow enough that the pixel sweep reads left to right, word after word. */
const WORD_MS = 90;

/**
 * The conversation with Shade. Answers are built when asked, from the live readings at that moment,
 * then "thought about" and streamed word by word. Esc or Stop cuts a reply short.
 */
export function useAgent(live: LiveReadings) {
  const still = useReducedMotion() ?? false;
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [phase, setPhase] = useState<Phase>('idle');
  const liveRef = useRef(live);
  const timers = useRef<number[]>([]);
  const nextId = useRef(1);
  useEffect(() => { liveRef.current = live; }, [live]);

  const clear = (): void => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };
  useEffect(() => clear, []);

  const patch = (id: number, p: Partial<Msg>): void => setMsgs((m) => m.map((x) => (x.id === id ? { ...x, ...p } : x)));

  const ask = useCallback((text: string, preset?: Intent) => {
    const q = text.trim();
    if (!q) return;
    clear();
    const found = preset ? { intent: preset, area: undefined } : matchQuestion(q);
    const answer = found.intent ? found.intent.answer(liveRef.current, found.area) : FALLBACK;
    const user: Msg = { id: nextId.current++, role: 'user', text: q };
    const agent: Msg = { id: nextId.current++, role: 'agent', text: q, answer, shown: still ? Infinity : 0 };
    setMsgs((m) => [...m, user, agent]);
    if (still) return setPhase('idle');

    setPhase('thinking');
    const words = answer.headline.split(' ').length;
    timers.current.push(window.setTimeout(() => {
      setPhase('streaming');
      for (let w = 1; w <= words; w++) {
        timers.current.push(window.setTimeout(() => {
          patch(agent.id, { shown: w });
          if (w === words) setPhase('idle');
        }, w * WORD_MS));
      }
    }, THINK_MS));
  }, [still]);

  const stop = useCallback(() => {
    clear();
    setMsgs((m) => m.map((x, i) => (i === m.length - 1 && x.role === 'agent' ? { ...x, stopped: true } : x)));
    setPhase('idle');
  }, []);

  const reset = useCallback(() => {
    clear();
    setMsgs([]);
    setPhase('idle');
  }, []);

  return { msgs, phase, ask, stop, reset };
}
