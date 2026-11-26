import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { incidents } from '@/lib/data';
import { fromAppIncident, listMockCases, loadMockCase, loadRcaInput, RcaInputError } from './load';

describe('mock cases', () => {
  it('ships gas, heat and boiler cases', async () => {
    expect(await listMockCases()).toEqual(['boiler-overpressure', 'gas-leak-confirmed', 'gas-leak-false-alarm', 'heat-stress']);
  });

  it('every mock case is a valid RCA input', async () => {
    for (const name of await listMockCases()) {
      const input = await loadMockCase(name);
      expect(input.sensors.length).toBeGreaterThan(0);
    }
  });

  it('refuses path-like case names', () => {
    expect(() => loadMockCase('../schema')).toThrow(RcaInputError);
  });
});

describe('loadRcaInput', () => {
  it('reports which field is wrong', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'rca-'));
    const file = path.join(dir, 'bad.json');
    await writeFile(file, JSON.stringify({ incident: { id: 'X' } }));
    await expect(loadRcaInput(file)).rejects.toThrow(/incident\.kind/);
  });

  it('reports unreadable JSON', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'rca-'));
    const file = path.join(dir, 'broken.json');
    await writeFile(file, '{ not json');
    await expect(loadRcaInput(file)).rejects.toThrow(RcaInputError);
  });
});

describe('fromAppIncident', () => {
  it('converts every dashboard incident into a valid RCA input', () => {
    for (const inc of incidents) expect(fromAppIncident(inc).incident.id).toBe(inc.id);
  });

  it('builds an ISO timestamp with the site offset', () => {
    const r = fromAppIncident(incidents[0]);
    expect(r.incident.occurred_at).toBe('2026-11-25T18:42:00+05:00');
    expect(r.incident.reported_severity).toBe('High');
  });
});

describe('input error messages and adapter edge cases', () => {
  it('names the root when the input is not an object', async () => {
    const { parseRcaInput } = await import('./load');
    expect(() => parseRcaInput('just text')).toThrow(/\(root\)/);
  });

  it('leaves reported severity empty for Off and Info, which have no incident meaning', () => {
    for (const sev of ['Off', 'Info'] as const) expect(fromAppIncident({ ...incidents[0], sev }).incident.reported_severity).toBeUndefined();
  });

  it('rejects a dashboard date it cannot read', () => {
    expect(() => fromAppIncident({ ...incidents[0], date: '25 Foo' })).toThrow(RcaInputError);
  });

  it('accepts a different year and site offset', () => {
    expect(fromAppIncident(incidents[0], { year: 2027, utcOffset: '+00:00' }).incident.occurred_at).toBe('2027-11-25T18:42:00+00:00');
  });

  it('maps dashboard incidents to kind "other", which sensors cannot confirm', () => {
    expect(new Set(incidents.map((i) => fromAppIncident(i).incident.kind))).toEqual(new Set(['other']));
  });
});
