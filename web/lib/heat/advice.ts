/* Turns engine scores into the morning briefing: a suggested change for every planned job at risk.
   Advice is structured (from/to slots, scores) so the page can show it visually instead of in sentences. */
import { areas, DAYS, jobs, SHIFTS, type DayIndex, type Job } from './data';
import { futureCells, scoreCell, type Cell, type LiveReadings } from './engine';
import { refTitle } from './refs';
import { workRest } from './wbgt';

/** Below this score a job keeps its slot and gets no advice. */
export const ADVISE_FROM = 40;
/** A move must lower the score by at least this much to be worth the disruption. */
const MIN_GAIN = 20;

export interface Slot { label: string; score: number; wbgt: number }
export interface Advice {
  id: string;
  job: Job;
  title: string;
  cell: Cell;
  from: Slot;
  /** Present when the engine found a cooler slot. */
  to?: Slot;
  /** Present when the job stays: the work-rest cycle to apply at the peak. */
  rest?: string;
  /** Extra care for the job type, one short line. */
  care?: string;
  /** One-line summary, used by Ask. */
  change: string;
}

const KIND_CARE: Record<string, string> = {
  'Confined space': 'Standby checks every 15 min',
  'Hot work': 'Fire watch rests in shade',
  Outdoor: 'Water and shade on site',
};

/** "Tonight 22–06" reads better than "Shift C today" for the next night shift. */
function slotLabel(c: Cell): string {
  const tonight = c.day === 0 && c.shift.id === 'C';
  return `${tonight ? 'Tonight' : DAYS[c.day].label} · ${c.shift.label}`;
}

export function adviseJob(job: Job, live: LiveReadings): Advice | null {
  const area = areas.find((a) => a.zone === job.area);
  const shift = SHIFTS.find((s) => s.id === job.shift);
  if (!area || !shift) throw new Error(`HeatShield job ${job.ref} has an unknown area or shift`);
  const cell = scoreCell(area, job.day, shift, live);
  if (cell.score < ADVISE_FROM) return null;

  const best = cell.time === 'next'
    ? futureCells(area, live).filter((c) => c.score <= cell.score - MIN_GAIN).sort((a, b) => a.score - b.score)[0]
    : undefined;
  const from: Slot = { label: `Shift ${job.shift} · ${job.start}`, score: cell.score, wbgt: cell.wbgt };
  const base = { id: `${job.day}|${job.ref}`, job, title: refTitle(job.ref), cell, from, care: job.kind ? KIND_CARE[job.kind] : undefined };

  if (best) {
    const to: Slot = { label: slotLabel(best), score: best.score, wbgt: best.wbgt };
    return { ...base, to, change: `Move to ${to.label}` };
  }
  const rest = workRest(cell.wbgt).short;
  return { ...base, rest, change: `Keep, with ${rest} work-rest` };
}

const jobsOn = (day: DayIndex): Job[] => jobs.filter((j) => j.day === day);

export function adviseDay(day: DayIndex, live: LiveReadings): Advice[] {
  return jobsOn(day)
    .map((j) => adviseJob(j, live))
    .filter((a): a is Advice => a !== null)
    .sort((a, b) => b.cell.score - a.cell.score);
}
