/* HeatShield risk engine: one score per area per shift, from forecast WBGT (or the live sensor
   reading during the current shift), the work planned there and the area's heat-incident history. */
import { areas, jobs, SHIFT_HOURS, SHIFTS, forecast, wbgtSensors, type DayIndex, type HeatArea, type Job, type JobKind, type Shift, type Workload } from './data';
import { forecastWbgt, NOW_HOUR } from './wbgt';

/** Latest reading per sensor id, °C WBGT. */
export type LiveReadings = Record<string, number>;
export type SlotTime = 'past' | 'now' | 'next';

/** Score at which an area-shift needs action, the same line as every other risk score in the app. */
export const ACT_FROM = 70;
export const WEIGHTS = { heat: 0.6, work: 0.25, history: 0.15 } as const;
/** WBGT that maps to 0 and to 100 on the heat part of the score. */
const HEAT_RANGE = { floor: 26, ceil: 34 } as const;
const WORKLOAD: Record<Workload, number> = { Light: 30, Moderate: 55, Heavy: 80 };
const KIND_EXTRA: Record<JobKind, number> = { 'Hot work': 15, 'Confined space': 20, Outdoor: 10 };
const HISTORY_PER_EVENT = 20;

export interface Cell {
  area: HeatArea;
  day: DayIndex;
  shift: Shift;
  time: SlotTime;
  wbgt: number;
  peakHour: number;
  source: 'forecast' | 'sensor';
  parts: { heat: number; work: number; history: number };
  score: number;
  jobs: Job[];
}

const clamp = (v: number): number => Math.min(100, Math.max(0, v));

export function slotTime(day: DayIndex, shift: Shift): SlotTime {
  const start = day * 24 + shift.start;
  if (NOW_HOUR >= start + SHIFT_HOURS) return 'past';
  return NOW_HOUR >= start ? 'now' : 'next';
}

/** Forecast hours a slot covers, from now onward for the current shift. */
function slotHours(day: DayIndex, shift: Shift, time: SlotTime): number[] {
  const start = day * 24 + shift.start;
  const from = time === 'now' ? Math.floor(NOW_HOUR) : start;
  const hours: number[] = [];
  for (let h = from; h < start + SHIFT_HOURS && h < forecast.temp.length; h++) hours.push(h);
  return hours;
}

/** Hottest live reading among an area's sensors, if it has any. */
export function areaLive(zone: string, live: LiveReadings): number | undefined {
  const values = wbgtSensors.filter((s) => s.area === zone && live[s.id] !== undefined).map((s) => live[s.id]);
  return values.length ? Math.max(...values) : undefined;
}

export function jobExposure(job: Job): number {
  return clamp(WORKLOAD[job.workload] + (job.kind ? KIND_EXTRA[job.kind] : 0));
}

/** The heat part of a score, 0–100, from a WBGT reading. Also drives the 3D heat field. */
export function heatPart(wbgt: number): number {
  return Math.round(clamp(((wbgt - HEAT_RANGE.floor) / (HEAT_RANGE.ceil - HEAT_RANGE.floor)) * 100));
}

/** Score from a WBGT and the work planned in an area. Shared by the shift grid and the 7-day outlook. */
export function scoreFrom(area: HeatArea, wbgt: number, here: Job[] = []): Pick<Cell, 'parts' | 'score'> {
  const parts = {
    heat: heatPart(wbgt),
    work: Math.round(Math.max(area.routine, ...here.map(jobExposure))),
    history: clamp(area.heatEvents * HISTORY_PER_EVENT),
  };
  return { parts, score: Math.round(parts.heat * WEIGHTS.heat + parts.work * WEIGHTS.work + parts.history * WEIGHTS.history) };
}

export function scoreCell(area: HeatArea, day: DayIndex, shift: Shift, live: LiveReadings): Cell {
  const time = slotTime(day, shift);
  const hours = slotHours(day, shift, time);
  const peakHour = hours.reduce((m, h) => (forecastWbgt(h) > forecastWbgt(m) ? h : m), hours[0]);
  const predicted = forecastWbgt(peakHour) + area.offset;
  // During the current shift the sensor is the truth for now; the forecast still covers the hours left.
  const sensor = time === 'now' ? areaLive(area.zone, live) : undefined;
  const useSensor = sensor !== undefined && sensor >= predicted;
  const wbgt = useSensor ? sensor : predicted;

  const here = jobs.filter((j) => j.area === area.zone && j.day === day && j.shift === shift.id);
  const { parts, score } = scoreFrom(area, wbgt, here);
  return { area, day, shift, time, wbgt, peakHour, source: useSensor ? 'sensor' : 'forecast', parts, score, jobs: here };
}

/** Every area × shift for a day, one row per area. */
export function scoreDay(day: DayIndex, live: LiveReadings): Cell[][] {
  return areas.map((a) => SHIFTS.map((s) => scoreCell(a, day, s, live)));
}

/** All slots still ahead across the 48 h window, for finding a cooler time. */
export function futureCells(area: HeatArea, live: LiveReadings): Cell[] {
  return ([0, 1] as DayIndex[]).flatMap((d) => SHIFTS.map((s) => scoreCell(area, d, s, live))).filter((c) => c.time === 'next');
}

export const cellKey = (c: Pick<Cell, 'day' | 'shift'> & { area: { zone: string } }): string => `${c.day}|${c.area.zone}|${c.shift.id}`;
