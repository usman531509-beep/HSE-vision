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

describe('triage', () => {
  it('is small when no rule fires', () => {
    expect(triage(incident({ reported_severity: 'Medium', injury: 'first_aid' }), verification('confirmed', [ev(true, false)]))).toEqual({ severity: 'small', rules_fired: [], provisional: true });
  });

  it.each(['lost_time', 'fatality'] as const)('R1: %s injury is dangerous', (injury) => {
    expect(triage(incident({ injury }), verification('insufficient_data')).rules_fired).toEqual(['R1-injury']);
  });

  it('R1: first aid and medical treatment alone stay small', () => {
    expect(triage(incident({ injury: 'medical' }), verification('insufficient_data')).severity).toBe('small');
  });

  it('R2: reported High is dangerous even without sensors', () => {
    expect(triage(incident({ reported_severity: 'High' }), verification('insufficient_data')).severity).toBe('dangerous');
  });

  it('R3: a confirmed severe reading is dangerous', () => {
    expect(triage(incident(), verification('confirmed', [ev(true, true)])).rules_fired).toEqual(['R3-severe-reading']);
  });

  it('R3: a severe flag on an unconfirmed check does not count', () => {
    expect(triage(incident(), verification('not_confirmed', [ev(false, true)])).severity).toBe('small');
  });

  it('lists every rule that fired', () => {
    const t = triage(incident({ injury: 'fatality', reported_severity: 'High' }), verification('confirmed', [ev(true, true)]));
    expect(t.rules_fired).toEqual(['R1-injury', 'R2-reported-high', 'R3-severe-reading']);
  });

  it.each([
    ['gas-leak-confirmed', 'dangerous'],
    ['gas-leak-false-alarm', 'small'],
    ['heat-stress', 'small'],
    ['boiler-overpressure', 'dangerous'],
  ])('mock %s → %s', async (name, severity) => {
    const input = await loadMockCase(name);
    expect(triage(input.incident, verifyIncident(input)).severity).toBe(severity);
  });
});
