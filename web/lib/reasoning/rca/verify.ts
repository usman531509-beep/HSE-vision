/* Sensor-backed verification: is the reported incident real according to the area's IoT data?
   Pure code, no LLM. A threshold only counts as breached when it holds for VERIFY.minConsecutive readings in a row.
   - gas_leak: inlet minus outlet pressure on the same line, beyond the normal line loss; plus gas concentration alarms.
   - heat_stress: WBGT against the sensor's own limit, or the ACGIH band where work-rest becomes "act" (reused from HeatShield).
   - boiler: pressure / temperature high limits and water-level low limit.
   Only sensors in the incident's zone are considered. */
import { WORK_REST } from '@/lib/heat/wbgt';
import { VERIFY, type IncidentKind } from './config';
import type { Evidence, RcaInput, SensorKind, SensorSeries, Verification } from './schema';

type Point = { t: string; v: number };
type Direction = 'high' | 'low';

/** ACGIH moderate-work WBGT bands: first band that needs action, and the "stop non-essential work" band. */
const WBGT_ACT = WORK_REST.find((b) => b.tone === 'act')!.min;
const WBGT_STOP = WORK_REST[WORK_REST.length - 1].min;

/** Sensor kinds that can confirm each incident kind. A sensor confirms an incident only if it measures that hazard:
    an alarm on some other quantity in the same zone is not evidence that the reported incident happened.
    - heat_stress: WBGT only. A "temperature" series may be process temperature (a boiler at 190 °C), which says
      nothing about the people nearby. PENDING: accept air temperature once the IoT contract can tell it apart.
    - other: none. With no known hazard there is no way to tell which sensor relates, so the report stands alone. */
export const RELEVANT: Record<IncidentKind, readonly SensorKind[]> = {
  gas_leak: ['gas_pressure_in', 'gas_pressure_out', 'gas_concentration'],
  heat_stress: ['wbgt'],
  boiler: ['pressure', 'temperature', 'water_level'],
  other: [],
};

const beyond = (v: number, limit: number, dir: Direction): boolean => (dir === 'high' ? v > limit : v < limit);
const worse = (a: number, b: number, dir: Direction): number => (dir === 'high' ? Math.max(a, b) : Math.min(a, b));
const round = (v: number): number => Math.round(v * 1000) / 1000;

/** Longest run of consecutive readings beyond the limit, and the worst value in it (or in the whole series if none). */
export function scan(points: Point[], limit: number, dir: Direction): { run: Point[]; worst: number } {
  let best: Point[] = [];
  let cur: Point[] = [];
  for (const p of points) {
    cur = beyond(p.v, limit, dir) ? [...cur, p] : [];
    if (cur.length > best.length) best = cur;
  }
  const pool = best.length ? best : points;
  return { run: best, worst: pool.reduce((w, p) => worse(w, p.v, dir), pool[0].v) };
}

function evidenceFor(
  sensor_id: string, metric: string, unit: string, points: Point[],
  limit: number, dir: Direction, severeLimit: number, label: string,
): Evidence {
  const { run, worst } = scan(points, limit, dir);
  const breaches = run.length >= VERIFY.minConsecutive;
  const window = run.length ? run : points;
  const severe = breaches && (dir === 'high' ? worst >= severeLimit : worst <= severeLimit);
  const side = dir === 'high' ? 'above' : 'below';
  const note = breaches
    ? `${label} ${side} ${round(limit)} ${unit} for ${run.length} readings in a row (worst ${round(worst)} ${unit})${severe ? `, past the severe line of ${round(severeLimit)} ${unit}` : ''}.`
    : run.length
      ? `${label} went ${side} ${round(limit)} ${unit} for only ${run.length} reading(s); ${VERIFY.minConsecutive} in a row are needed.`
      : `${label} stayed within ${round(limit)} ${unit} (worst ${round(worst)} ${unit}).`;
  return { sensor_id, metric, observed: round(worst), threshold: round(limit), unit, from: window[0].t, to: window[window.length - 1].t, breaches, severe, note };
}

const points = (s: SensorSeries): Point[] => [...s.readings].sort((a, b) => Date.parse(a.t) - Date.parse(b.t));

/** Severe line for an alarm limit: VERIFY.severeMargin further past the limit. */
const severeOf = (limit: number, dir: Direction): number => (dir === 'high' ? limit * (1 + VERIFY.severeMargin) : limit * (1 - VERIFY.severeMargin));

function limitEvidence(s: SensorSeries): Evidence[] {
  const out: Evidence[] = [];
  const hi = s.limits?.alarm_high;
  const lo = s.limits?.alarm_low;
  if (hi !== undefined) out.push(evidenceFor(s.sensor_id, s.kind, s.unit, points(s), hi, 'high', severeOf(hi, 'high'), `${s.sensor_id} ${s.kind.replace(/_/g, ' ')}`));
  if (lo !== undefined) out.push(evidenceFor(s.sensor_id, s.kind, s.unit, points(s), lo, 'low', severeOf(lo, 'low'), `${s.sensor_id} ${s.kind.replace(/_/g, ' ')}`));
  return out;
}

function wbgtEvidence(s: SensorSeries): Evidence[] {
  if (s.limits?.alarm_high !== undefined || s.limits?.alarm_low !== undefined) return limitEvidence(s);
  return [evidenceFor(s.sensor_id, 'wbgt', s.unit, points(s), WBGT_ACT, 'high', WBGT_STOP, `${s.sensor_id} WBGT (ACGIH action band)`)];
}

/** Pairs each inlet meter with the outlet meter on the same line and checks the excess pressure drop.
    Meters without a line id are paired only when they are the zone's single inlet and single outlet; otherwise
    there is no way to know they sit on the same pipe, and comparing the wrong pipes could fake a leak. */
export function gasPressureEvidence(sensors: SensorSeries[]): Evidence[] {
  const inlets = sensors.filter((s) => s.kind === 'gas_pressure_in');
  const outlets = sensors.filter((s) => s.kind === 'gas_pressure_out');
  const out: Evidence[] = [];
  for (const inlet of inlets) {
    const outlet =
      inlet.line !== undefined
        ? outlets.find((o) => o.line === inlet.line)
        : inlets.length === 1 && outlets.length === 1 && outlets[0].line === undefined ? outlets[0] : undefined;
    if (!outlet) continue;
    const outAt = new Map(outlet.readings.map((r) => [Date.parse(r.t), r.v]));
    const drops: Point[] = points(inlet)
      .filter((r) => outAt.has(Date.parse(r.t)))
      .map((r) => ({ t: r.t, v: r.v - outAt.get(Date.parse(r.t))! - VERIFY.gas.expectedDropBar }));
    if (!drops.length) continue;
    const tol = VERIFY.gas.leakToleranceBar;
    out.push(evidenceFor(
      `${inlet.sensor_id}/${outlet.sensor_id}`, 'excess pressure drop (inlet − outlet − normal line loss)', inlet.unit, drops,
      tol, 'high', tol * VERIFY.gas.severeFactor, `Pressure lost between ${inlet.sensor_id} and ${outlet.sensor_id}`,
    ));
  }
  return out;
}

export function verifyIncident(input: RcaInput): Verification {
  const { incident } = input;
  const wanted = RELEVANT[incident.kind];
  const local = input.sensors.filter((s) => s.zone === incident.location.zone && wanted.includes(s.kind));

  const evidence: Evidence[] = [
    ...gasPressureEvidence(local),
    ...local.flatMap((s) => (s.kind === 'wbgt' ? wbgtEvidence(s) : s.kind === 'gas_pressure_in' || s.kind === 'gas_pressure_out' ? [] : limitEvidence(s))),
  ];

  if (!evidence.length) {
    const summary = wanted.length
      ? `No ${wanted.join(', ').replace(/_/g, ' ')} sensor with usable limits in ${incident.location.zone}; the incident rests on the report alone.`
      : `Incident kind "${incident.kind}" has no sensor mapping, so no sensor can confirm it; the incident rests on the report alone.`;
    return { verified: false, status: 'insufficient_data', evidence, summary };
  }
  const breached = evidence.filter((e) => e.breaches);
  if (breached.length) {
    return { verified: true, status: 'confirmed', evidence, summary: `Confirmed by ${breached.length} of ${evidence.length} sensor check(s): ${breached.map((e) => e.sensor_id).join(', ')}.` };
  }
  return { verified: false, status: 'not_confirmed', evidence, summary: `Sensors in ${incident.location.zone} do not show the incident: ${evidence.length} check(s), none breached.` };
}
