import { describe, expect, it } from 'vitest';
import { loadMockCase } from './load';
import type { RcaInput, SensorSeries } from './schema';
import { gasPressureEvidence, scan, verifyIncident } from './verify';

const at = (i: number): string => `2026-11-25T18:${String(i * 2).padStart(2, '0')}:00+05:00`;
const series = (sensor_id: string, kind: SensorSeries['kind'], vals: number[], extra: Partial<SensorSeries> = {}): SensorSeries => ({
  sensor_id, kind, unit: kind === 'wbgt' ? '°C WBGT' : 'bar', zone: 'Boiler house', readings: vals.map((v, i) => ({ t: at(i), v })), ...extra,
});
const input = (kind: RcaInput['incident']['kind'], sensors: SensorSeries[]): RcaInput => ({
  incident: { id: 'T-1', kind, occurred_at: at(0), location: { zone: 'Boiler house' }, title: 't', description: 'd', source: 's', injury: 'none' },
  sensors,
});

describe('scan', () => {
  it('finds the longest consecutive run beyond the limit', () => {
    const pts = [1, 5, 1, 5, 6, 7, 1].map((v, i) => ({ t: at(i), v }));
    const r = scan(pts, 4, 'high');
    expect(r.run.map((p) => p.v)).toEqual([5, 6, 7]);
    expect(r.worst).toBe(7);
  });
  it('handles low limits', () => {
    expect(scan([50, 38, 35, 36].map((v, i) => ({ t: at(i), v })), 40, 'low').worst).toBe(35);
  });
});

describe('gas leak: inlet vs outlet pressure', () => {
  const inlet = (vals: number[]) => series('IN', 'gas_pressure_in', vals, { line: 'L1' });
  const outlet = (vals: number[]) => series('OUT', 'gas_pressure_out', vals, { line: 'L1' });

  it('confirms a leak when the excess drop holds for 3 readings', () => {
    const v = verifyIncident(input('gas_leak', [inlet([4, 4, 4, 4, 4]), outlet([3.95, 3.95, 3.6, 3.5, 3.5])]));
    expect(v.status).toBe('confirmed');
    expect(v.verified).toBe(true);
    expect(v.evidence[0]).toMatchObject({ sensor_id: 'IN/OUT', breaches: true, severe: true, observed: 0.45, threshold: 0.1 });
  });

  it('does not confirm normal line loss', () => {
    const v = verifyIncident(input('gas_leak', [inlet([4, 4, 4, 4]), outlet([3.95, 3.96, 3.94, 3.95])]));
    expect(v.status).toBe('not_confirmed');
    expect(v.verified).toBe(false);
  });

  it('ignores a one- or two-sample blip', () => {
    const v = verifyIncident(input('gas_leak', [inlet([4, 4, 4, 4, 4]), outlet([3.95, 3.5, 3.5, 3.95, 3.95])]));
    expect(v.status).toBe('not_confirmed');
    expect(v.evidence[0].note).toMatch(/only 2 reading/);
  });

  it('marks a drop under 3× tolerance as a breach but not severe', () => {
    const [e] = gasPressureEvidence([inlet([4, 4, 4]), outlet([3.8, 3.8, 3.8])]);
    expect(e).toMatchObject({ breaches: true, severe: false });
  });

  it('pairs meters by line, not by order', () => {
    const ev = gasPressureEvidence([
      inlet([4, 4, 4]), series('IN2', 'gas_pressure_in', [4, 4, 4], { line: 'L2' }),
      series('OUT2', 'gas_pressure_out', [3.95, 3.95, 3.95], { line: 'L2' }), outlet([3.5, 3.5, 3.5]),
    ]);
    expect(ev.map((e) => [e.sensor_id, e.breaches])).toEqual([['IN/OUT', true], ['IN2/OUT2', false]]);
  });

  it('only compares readings taken at the same time', () => {
    const shifted = { ...outlet([3.5, 3.5, 3.5]), readings: [3.5, 3.5, 3.5].map((v, i) => ({ t: at(i + 10), v })) };
    expect(gasPressureEvidence([inlet([4, 4, 4]), shifted])).toEqual([]);
  });

  it('has insufficient data with only an inlet meter', () => {
    expect(verifyIncident(input('gas_leak', [inlet([4, 4, 4])])).status).toBe('insufficient_data');
  });

  it('confirms from a gas concentration alarm alone', () => {
    const v = verifyIncident(input('gas_leak', [series('GL', 'gas_concentration', [2, 12, 13, 14], { unit: '% LEL', limits: { alarm_high: 10 } })]));
    expect(v.status).toBe('confirmed');
  });
});

describe('heat stress: WBGT', () => {
  it('uses the ACGIH action band (30 °C) when the sensor has no limit', () => {
    const v = verifyIncident(input('heat_stress', [series('WB', 'wbgt', [29, 30.2, 30.4, 30.3])]));
    expect(v.evidence[0]).toMatchObject({ threshold: 30, breaches: true, severe: false });
  });
  it('is severe in the stop-work band (31 °C)', () => {
    expect(verifyIncident(input('heat_stress', [series('WB', 'wbgt', [30.5, 31.2, 31.4, 31.1])])).evidence[0].severe).toBe(true);
  });
  it('prefers the sensor own limit', () => {
    expect(verifyIncident(input('heat_stress', [series('WB', 'wbgt', [29, 29, 29], { limits: { alarm_high: 28 } })])).evidence[0].threshold).toBe(28);
  });
});

describe('boiler', () => {
  it('checks both high and low limits', () => {
    const v = verifyIncident(input('boiler', [
      series('BP', 'pressure', [9, 10.5, 10.8, 11.2], { limits: { alarm_high: 10 } }),
      series('BL', 'water_level', [50, 45, 44, 43], { unit: '%', limits: { alarm_low: 40 } }),
    ]));
    expect(v.evidence.map((e) => [e.sensor_id, e.breaches, e.severe])).toEqual([['BP', true, true], ['BL', false, false]]);
    expect(v.status).toBe('confirmed');
  });
});

describe('scope', () => {
  it('ignores sensors in other zones', () => {
    const elsewhere = series('GL', 'gas_concentration', [20, 20, 20], { zone: 'Tank farm', limits: { alarm_high: 10 } });
    expect(verifyIncident(input('gas_leak', [elsewhere])).status).toBe('insufficient_data');
  });
  it('ignores sensor kinds unrelated to the incident', () => {
    const wb = series('WB', 'wbgt', [35, 35, 35]);
    expect(verifyIncident(input('gas_leak', [wb])).status).toBe('insufficient_data');
  });
  it('ignores sensors without limits', () => {
    expect(verifyIncident(input('boiler', [series('BP', 'pressure', [20, 20, 20])])).status).toBe('insufficient_data');
  });
});

describe('mock cases', () => {
  it.each([
    ['gas-leak-confirmed', 'confirmed', true],
    ['gas-leak-false-alarm', 'not_confirmed', false],
    ['heat-stress', 'confirmed', false],
    ['boiler-overpressure', 'confirmed', true],
  ])('%s → %s (severe evidence: %s)', async (name, status, severe) => {
    const v = verifyIncident(await loadMockCase(name));
    expect(v.status).toBe(status);
    expect(v.evidence.some((e) => e.severe)).toBe(severe);
  });
});

/* Regression: a sensor confirms an incident only if it measures that incident's hazard.
   Before the fix, kind "other" accepted every sensor kind and heat_stress accepted any "temperature" series. */
describe('regression: unrelated sensors never confirm an incident', () => {
  const gasAlarm = series('GL', 'gas_concentration', [20, 20, 20], { unit: '% LEL', limits: { alarm_high: 10 } });
  const boilerTemp = series('BT', 'temperature', [195, 196, 197], { unit: '°C', limits: { alarm_high: 190 } });
  const boilerPressure = series('BP', 'pressure', [12, 12, 12], { limits: { alarm_high: 10 } });
  const hotWbgt = series('WB', 'wbgt', [32, 32, 32]);

  it('kind "other": an alarming gas sensor in the zone does not confirm it', () => {
    const v = verifyIncident(input('other', [gasAlarm, boilerTemp, boilerPressure, hotWbgt]));
    expect(v).toMatchObject({ verified: false, status: 'insufficient_data', evidence: [] });
    expect(v.summary).toMatch(/no sensor mapping/);
  });

  it('heat stress: a boiler process temperature alarm does not confirm it', () => {
    const v = verifyIncident(input('heat_stress', [boilerTemp]));
    expect(v).toMatchObject({ verified: false, status: 'insufficient_data', evidence: [] });
  });

  it('heat stress: only the WBGT reading is used when both are present', () => {
    const v = verifyIncident(input('heat_stress', [boilerTemp, series('WB', 'wbgt', [26, 26, 26])]));
    expect(v.evidence.map((e) => e.sensor_id)).toEqual(['WB']);
    expect(v.status).toBe('not_confirmed');
  });

  it('gas leak: a boiler pressure alarm does not confirm it', () => {
    expect(verifyIncident(input('gas_leak', [boilerPressure])).status).toBe('insufficient_data');
  });

  it('boiler: a hot WBGT reading or a gas alarm does not confirm it', () => {
    expect(verifyIncident(input('boiler', [hotWbgt, gasAlarm])).status).toBe('insufficient_data');
  });
});

describe('verification edge cases', () => {
  it('marks a low-limit breach severe once 10 % below the limit', () => {
    const v = verifyIncident(input('boiler', [series('BL', 'water_level', [38, 35, 33], { unit: '%', limits: { alarm_low: 40 } })]));
    expect(v.evidence[0]).toMatchObject({ breaches: true, severe: true, observed: 33 });
  });

  it('never confirms from a series shorter than the consecutive-reading rule', () => {
    const v = verifyIncident(input('boiler', [series('BP', 'pressure', [15, 15], { limits: { alarm_high: 10 } })]));
    expect(v.status).toBe('not_confirmed');
  });

  it('sorts readings by time before looking for a run', () => {
    const s = series('BP', 'pressure', [11, 9, 11, 11], { limits: { alarm_high: 10 } });
    // Delivered out of order: by time the values are 9, 11, 11, 11, a run of 3.
    s.readings = [{ t: at(3), v: 11 }, { t: at(0), v: 9 }, { t: at(2), v: 11 }, { t: at(1), v: 11 }];
    expect(verifyIncident(input('boiler', [s])).status).toBe('confirmed');
  });

  it('does not guess a pairing when two unlabelled inlets share one outlet', () => {
    const ev = gasPressureEvidence([
      series('IN1', 'gas_pressure_in', [4, 4, 4]), series('IN2', 'gas_pressure_in', [4, 4, 4]), series('OUT', 'gas_pressure_out', [3, 3, 3]),
    ]);
    expect(ev).toEqual([]);
  });

  it('regression: never pairs meters labelled with different lines, even when each is the only one', () => {
    expect(gasPressureEvidence([series('IN', 'gas_pressure_in', [4, 4, 4], { line: 'L1' }), series('OUT', 'gas_pressure_out', [3, 3, 3], { line: 'L2' })])).toEqual([]);
  });

  it('does not pair a labelled inlet with an unlabelled outlet', () => {
    expect(gasPressureEvidence([series('IN', 'gas_pressure_in', [4, 4, 4], { line: 'L1' }), series('OUT', 'gas_pressure_out', [3, 3, 3])])).toEqual([]);
  });

  it('pairs a single unlabelled inlet with a single unlabelled outlet', () => {
    expect(gasPressureEvidence([series('IN', 'gas_pressure_in', [4, 4, 4]), series('OUT', 'gas_pressure_out', [3.5, 3.5, 3.5])])).toHaveLength(1);
  });

  it.todo('treats a long time gap between readings as breaking a run (PENDING: maximum gap not yet agreed)');
});
