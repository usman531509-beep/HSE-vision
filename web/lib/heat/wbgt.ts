/* WBGT maths and work-rest guidance. Pure functions, shared by the engine, the sensor gateway and the UI. */
import type { Tone } from '@/lib/data';
import { forecast, NOW } from './data';

/** Australian Bureau of Meteorology approximation of WBGT from air temperature (°C) and relative humidity (%). */
export function wbgtFromWeather(temp: number, rh: number): number {
  const vapourPressure = (rh / 100) * 6.105 * Math.exp((17.27 * temp) / (237.7 + temp));
  return 0.567 * temp + 0.393 * vapourPressure + 3.94;
}

/** Site forecast WBGT for an hour index (0–47), linearly interpolated so sensor readings drift smoothly. */
export function forecastWbgt(hour: number): number {
  const last = forecast.temp.length - 1;
  const h = Math.min(Math.max(hour, 0), last);
  const lo = Math.floor(h), hi = Math.min(lo + 1, last), f = h - lo;
  const at = (i: number): number => wbgtFromWeather(forecast.temp[i], forecast.rh[i]);
  return at(lo) * (1 - f) + at(hi) * f;
}

export const NOW_HOUR = NOW.day * 24 + NOW.hour + NOW.minute / 60;

export interface WorkRest { min: number; label: string; short: string; tone: Tone }

/** ACGIH TLV bands for moderate work by acclimatised workers. Lower bound in °C WBGT. */
export const WORK_REST: WorkRest[] = [
  { min: -Infinity, label: 'Continuous work', short: 'Normal', tone: 'low' },
  { min: 28, label: '45 min work · 15 min rest', short: '45 / 15', tone: 'watch' },
  { min: 29, label: '30 min work · 30 min rest', short: '30 / 30', tone: 'watch' },
  { min: 30, label: '15 min work · 45 min rest', short: '15 / 45', tone: 'act' },
  { min: 31, label: 'Stop non-essential work', short: 'Stop', tone: 'act' },
];

export function workRest(wbgt: number): WorkRest {
  return [...WORK_REST].reverse().find((b) => wbgt >= b.min) ?? WORK_REST[0];
}

export const fmtWbgt = (v: number): string => v.toFixed(1);
export const fmtHour = (h: number): string => `${String(Math.floor(h) % 24).padStart(2, '0')}:00`;
