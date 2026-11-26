'use client';

/* Session state shared by every screen. Held in memory, like the original:
   it survives navigation between screens and resets on reload. */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { actionOverdue, actions, type Range, type Sev } from '@/lib/data';
import type { DayIndex } from '@/lib/heat/data';

export interface HseState {
  range: Range;
  zone: string;
  evFilter: string;
  cam: string;
  incFilter: string;
  inc: string;
  approved: Record<string, boolean>;
  permitDecisions: Record<string, 'yes' | 'no'>;
  answers: Record<number, 'pass' | 'fail' | 'na'>;
  owner: string;
  stage: Record<string, number>;
  std: string;
  gapsOnly: boolean;
  routinesOff: Record<number, boolean>;
  askNote: boolean;
  menuOpen: boolean;
  /** Desktop sidebar shrunk to an icon rail. */
  navCollapsed: boolean;
  heatDay: DayIndex;
  /** Selected heat-map cell, as cellKey() builds it. */
  heatCell: string;
  heatDecisions: Record<string, 'yes' | 'no'>;
}

const initial: HseState = {
  range: 'shift', zone: 'Press 3', evFilter: 'All',
  cam: 'CAM 03',
  incFilter: 'All', inc: 'INC-0412', approved: {},
  permitDecisions: {},
  answers: { 0: 'pass', 1: 'pass', 2: 'fail', 3: 'pass' },
  owner: 'Everyone', stage: {},
  std: 'ISO 45001',
  gapsOnly: false,
  routinesOff: { 3: true },
  askNote: false,
  menuOpen: false,
  navCollapsed: false,
  heatDay: 1,
  heatCell: '1|Compressor|A',
  heatDecisions: {},
};

type Update = Partial<HseState> | ((s: HseState) => Partial<HseState>);
const Ctx = createContext<{ s: HseState; set: (u: Update) => void } | null>(null);

export function HseProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState(initial);
  const set = useCallback((u: Update) => setS((prev) => ({ ...prev, ...(typeof u === 'function' ? u(prev) : u) })), []);
  const value = useMemo(() => ({ s, set }), [s, set]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useHse() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useHse must be used inside <HseProvider>');
  return v;
}

export interface OpenAction { id: string; title: string; source: string; owner: string; due: string; pri: Sev; stage: number; late: boolean }

/** Actions with their live stage (the board can move them forward). */
export function openActions(stage: Record<string, number>): OpenAction[] {
  return actions.map(([id, title, source, owner, due, pri, st0]) => {
    const st = stage[id] ?? st0;
    return { id, title, source, owner, due, pri, stage: st, late: !!actionOverdue[due] && st < 3 };
  });
}
