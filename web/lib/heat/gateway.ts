/* Simulated WBGT sensor gateway (server only). Stands in for the LoRa/4G gateway of pilot week 3:
   readings follow the site forecast plus each area's offset, with sensor noise and an optional hot-spot test. */
import { areas, wbgtSensors, type WbgtSensor } from './data';
import { HISTORY_LEN, TICK_MS, type History, type Snapshot } from './feed';
import { forecastWbgt, NOW_HOUR } from './wbgt';

const SPIKE = { rampMs: 8000, holdMs: 60000, fadeMs: 30000, peak: 3.2 } as const;

/* Kept on globalThis so the stream route and the spike route share one clock and one set of tests. */
const g = globalThis as typeof globalThis & { __heatGateway?: { bootMs: number; spikes: Map<string, number> } };
const state = (g.__heatGateway ??= { bootMs: Date.now(), spikes: new Map<string, number>() });

const HOUR_MS = 3_600_000;

/** The demo clock starts at the prototype's "now" (18:42) and runs in real time, looping every hour
    so a long-running server never drifts away from the shift the rest of the prototype shows. */
function demoHour(ms: number): number {
  return NOW_HOUR + ((ms - state.bootMs) % HOUR_MS) / HOUR_MS;
}

function spikeAt(id: string, ms: number): number {
  const t0 = state.spikes.get(id);
  if (t0 === undefined) return 0;
  const t = ms - t0;
  if (t < 0) return 0;
  if (t < SPIKE.rampMs) return SPIKE.peak * (t / SPIKE.rampMs);
  if (t < SPIKE.rampMs + SPIKE.holdMs) return SPIKE.peak;
  const fade = 1 - (t - SPIKE.rampMs - SPIKE.holdMs) / SPIKE.fadeMs;
  if (fade <= 0) state.spikes.delete(id);
  return Math.max(0, SPIKE.peak * fade);
}

export function readingAt(s: WbgtSensor, ms: number): number {
  const area = areas.find((a) => a.zone === s.area);
  if (!area) throw new Error(`Sensor ${s.id} is placed in unknown area "${s.area}"`);
  // Deterministic noise, so every open browser sees the same reading for the same instant.
  const noise = 0.22 * Math.sin(ms / 9000 + s.phase) + 0.12 * Math.sin(ms / 3100 + 2 * s.phase) + 0.05 * Math.sin(ms / 1100 + 3 * s.phase);
  const v = forecastWbgt(demoHour(ms)) + area.offset + s.bias + noise + spikeAt(s.id, ms);
  return Math.round(v * 10) / 10;
}

function clock(ms: number): string {
  const h = demoHour(ms) % 24;
  const total = Math.floor(h * 3600);
  return [Math.floor(total / 3600), Math.floor(total / 60) % 60, total % 60].map((n) => String(n).padStart(2, '0')).join(':');
}

export function snapshot(ms: number): Snapshot {
  return { at: clock(ms), values: Object.fromEntries(wbgtSensors.map((s) => [s.id, readingAt(s, ms)])) };
}

export function history(ms: number): History {
  const times = Array.from({ length: HISTORY_LEN }, (_, i) => ms - (HISTORY_LEN - 1 - i) * TICK_MS);
  return {
    at: times.map(clock),
    values: Object.fromEntries(wbgtSensors.map((s) => [s.id, times.map((t) => readingAt(s, t))])),
  };
}

export function triggerSpike(id: string): boolean {
  if (!wbgtSensors.some((s) => s.id === id)) return false;
  state.spikes.set(id, Date.now());
  return true;
}
