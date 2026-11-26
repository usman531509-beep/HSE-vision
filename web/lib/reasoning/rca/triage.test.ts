import { describe, expect, it } from 'vitest';
import { loadMockCase } from './load';
import type { Evidence, IncidentRecord, Verification } from './schema';
import { triage } from './triage';
import { verifyIncident } from './verify';

const incident = (over: Partial<IncidentRecord> = {}): IncidentRecord => ({
  id: 'T-1', kind: 'other', occurred_at: '2026-11-25T18:00:00+05:00', location: { zone: 'Z' }, title: 't', description: 'd', source: 's', injury: 'none', ...over,
});
const ev = (breaches: boolean, severe: boolean): Evidence => ({
  sensor_id: 'S', metric: 'm', observed: 1, threshold: 1, unit: 'u', from: '2026-11-25T18:00:00+05:00', to: '2026-11-25T18:04:00+05:00', breaches, severe, note: 'n',
});
const verification = (status: Verification['status'], evidence: Evidence[] = []): Verification => ({ verified: status === 'confirmed', status, evidence, summary: 's' });
const none = verification('insufficient_data');

describe('triage: starting level from the reported severity', () => {
  it.each([
    ['Low', 'small', 1],
    ['Medium', 'medium', 2],
    ['High', 'dangerous', 3],
  ] as const)('reported %s → %s (level %i)', (reported_severity, severity, level) => {
    expect(triage(incident({ reported_severity }), none)).toEqual({ severity, level, basis: `Reported ${reported_severity} → ${severity}`, rules_fired: [], provisional: true });
  });

  it('defaults to medium when nothing was reported, so the incident is analysed rather than only logged', () => {
    expect(triage(incident(), none)).toMatchObject({ severity: 'medium', level: 2, basis: 'No reported severity → medium' });
  });
});

describe('triage: escalation to dangerous', () => {
  it.each(['lost_time', 'fatality'] as const)('R1: %s injury escalates a Low report to dangerous', (injury) => {
    expect(triage(incident({ injury, reported_severity: 'Low' }), none)).toMatchObject({ severity: 'dangerous', level: 3, rules_fired: ['R1-injury'] });
  });

  it('R1: first aid and medical treatment do not escalate', () => {
    for (const injury of ['first_aid', 'medical'] as const) expect(triage(incident({ injury, reported_severity: 'Low' }), none).severity).toBe('small');
  });

  it('R2: a confirmed severe reading escalates a Medium report to dangerous', () => {
    expect(triage(incident({ reported_severity: 'Medium' }), verification('confirmed', [ev(true, true)]))).toMatchObject({ severity: 'dangerous', rules_fired: ['R2-severe-reading'] });
  });

  it('R2: a confirmed but not severe reading does not escalate', () => {
    expect(triage(incident({ reported_severity: 'Low' }), verification('confirmed', [ev(true, false)])).severity).toBe('small');
  });

  it('R2: a severe flag on an unconfirmed check does not count', () => {
    expect(triage(incident({ reported_severity: 'Low' }), verification('not_confirmed', [ev(false, true)])).severity).toBe('small');
  });

  it('keeps the basis and lists every rule that fired', () => {
    const t = triage(incident({ injury: 'fatality', reported_severity: 'Low' }), verification('confirmed', [ev(true, true)]));
    expect(t).toMatchObject({ basis: 'Reported Low → small', rules_fired: ['R1-injury', 'R2-severe-reading'], severity: 'dangerous' });
  });

  it('never lowers a level', () => {
    expect(triage(incident({ reported_severity: 'High' }), verification('not_confirmed', [ev(false, false)])).severity).toBe('dangerous');
  });
});

describe('triage: mock cases cover all three levels', () => {
  it.each([
    ['gas-leak-false-alarm', 'small'],
    ['heat-stress', 'medium'],
    ['gas-leak-confirmed', 'dangerous'],
    ['boiler-overpressure', 'dangerous'],
  ])('%s → %s', async (name, severity) => {
    const input = await loadMockCase(name);
    expect(triage(input.incident, verifyIncident(input)).severity).toBe(severity);
  });
});
