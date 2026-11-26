import { describe, expect, it } from 'vitest';
import { DangerousAnalysisSchema, MediumAnalysisSchema, RcaInputSchema, RcaOutputSchema } from './schema';

const fishbone = { Man: [], Machine: ['Valve seal worn'], Method: [], Material: [], Measurement: [], Environment: [] };
const evidence = {
  sensor_id: 'GP-IN-01', metric: 'inlet minus outlet pressure', observed: 0.6, threshold: 0.15, unit: 'bar',
  from: '2026-11-25T18:30:00+05:00', to: '2026-11-25T18:36:00+05:00', breaches: true, severe: true, note: 'Drop held for 4 readings',
};
const base = {
  schema_version: 'rca/v2', incident_id: 'INC-GAS-001', generated_at: '2026-11-25T18:45:00+05:00',
  triage: { basis: 'Reported Medium → medium', rules_fired: ['R2-severe-reading'], provisional: true },
  verified: { value: true, status: 'confirmed', summary: 'Leak confirmed', evidence: [evidence] },
};

/** Level 1: logged, no cause analysis, no LLM. */
const small = () => ({ ...base, severity: 'small', level: 1, method: 'log', model: null, note: 'Gas smell: contractor reported a faint smell' });
/** Level 2: fishbone. */
const medium = () => ({
  ...base, severity: 'medium', level: 2, method: 'fishbone', model: 'fake',
  fishbone, root_cause: 'No seal replacement schedule', confidence: 0.8, next_checks: ['Pressure-test the line'],
});
/** Level 3: board chain plus fishbone. */
const dangerous = () => ({
  ...medium(), severity: 'dangerous', level: 3, method: 'board',
  board: { what_happened: 'Gas leak at F3', why_it_happened: 'Seal failed', root_cause: 'No seal replacement schedule', further_harm: ['Fire', 'Explosion'] },
  further_harm: [{ harm: 'Fire', likelihood: 'high' }, { harm: 'Explosion', likelihood: 'medium' }],
});
const ok = (o: unknown) => RcaOutputSchema.safeParse(o).success;

describe('RcaOutputSchema: the 3-level ladder', () => {
  it('accepts a valid output at each level', () => {
    expect(ok(small())).toBe(true);
    expect(ok(medium())).toBe(true);
    expect(ok(dangerous())).toBe(true);
  });

  it('level 1 carries no cause analysis', () => {
    expect(ok({ ...small(), fishbone })).toBe(false);
    expect(ok({ ...small(), root_cause: 'x' })).toBe(false);
    expect(ok({ ...small(), model: 'fake' })).toBe(false);
  });

  it('level 2 carries no board and no further harm', () => {
    const d = dangerous();
    expect(ok({ ...medium(), board: d.board })).toBe(false);
    expect(ok({ ...medium(), further_harm: d.further_harm })).toBe(false);
  });

  it('level 3 needs the board, further harm and the fishbone', () => {
    const { board: _b, ...noBoard } = dangerous();
    const { further_harm: _h, ...noHarm } = dangerous();
    const { fishbone: _f, ...noFishbone } = dangerous();
    expect(ok(noBoard)).toBe(false);
    expect(ok(noHarm)).toBe(false);
    expect(ok(noFishbone)).toBe(false);
    expect(ok({ ...dangerous(), further_harm: [] })).toBe(false);
  });

  it('keeps severity, level and method in step', () => {
    expect(ok({ ...medium(), severity: 'dangerous' })).toBe(false);
    expect(ok({ ...medium(), level: 3 })).toBe(false);
    expect(ok({ ...small(), level: 2 })).toBe(false);
    expect(ok({ ...dangerous(), method: 'fishbone' })).toBe(false);
  });

  it('has no 5 Whys any more', () => {
    expect(ok({ ...medium(), why_chain: ['a', 'b', 'c'] })).toBe(false);
    expect(ok({ ...medium(), method: '5_whys' })).toBe(false);
  });

  it('rejects a board whose root cause disagrees with the top-level one', () => {
    const d = dangerous();
    expect(ok({ ...d, board: { ...d.board, root_cause: 'Something else' } })).toBe(false);
  });

  it('rejects a board whose further harm differs from the further_harm list', () => {
    const d = dangerous();
    expect(ok({ ...d, board: { ...d.board, further_harm: ['Fire'] } })).toBe(false);
    expect(ok({ ...d, board: { ...d.board, further_harm: ['Explosion', 'Fire'] } })).toBe(false);
  });

  it('rejects high confidence when sensors did not confirm, at levels 2 and 3', () => {
    for (const o of [medium(), dangerous()]) {
      const unverified = { ...o, verified: { ...o.verified, value: false, status: 'not_confirmed' } };
      expect(ok({ ...unverified, confidence: 0.9 })).toBe(false);
      expect(ok({ ...unverified, confidence: 0.4 })).toBe(true);
    }
  });

  it('rejects verified.value that disagrees with status', () => {
    for (const o of [small(), medium()]) expect(ok({ ...o, verified: { ...o.verified, status: 'not_confirmed' } })).toBe(false);
  });

  it('requires all six fishbone categories, no others, and at least one cause', () => {
    const { Environment: _e, ...missing } = fishbone;
    const empty = { Man: [], Machine: [], Method: [], Material: [], Measurement: [], Environment: [] };
    expect(ok({ ...medium(), fishbone: missing })).toBe(false);
    expect(ok({ ...medium(), fishbone: { ...fishbone, Money: [] } })).toBe(false);
    expect(ok({ ...medium(), fishbone: empty })).toBe(false);
  });

  it('rejects unknown fields, out-of-range confidence, blank text and empty next checks', () => {
    expect(ok({ ...dangerous(), extra: 1 })).toBe(false);
    expect(ok({ ...medium(), confidence: 1.2 })).toBe(false);
    expect(ok({ ...medium(), root_cause: '   ' })).toBe(false);
    expect(ok({ ...small(), note: ' ' })).toBe(false);
    expect(ok({ ...medium(), next_checks: [] })).toBe(false);
  });

  it('rejects the old rca/v1 version', () => {
    expect(ok({ ...medium(), schema_version: 'rca/v1' })).toBe(false);
  });
});

describe('LLM analysis schemas', () => {
  const cause = { fishbone, root_cause: 'x', confidence: 0.5, next_checks: ['y'] };
  const board = { what_happened: 'a', why_it_happened: 'b' };
  const further_harm = [{ harm: 'Fire', likelihood: 'high' }];

  it('medium: fishbone analysis only', () => {
    expect(MediumAnalysisSchema.safeParse(cause).success).toBe(true);
    expect(MediumAnalysisSchema.safeParse({ ...cause, board }).success).toBe(false);
  });

  it('dangerous: board and further harm are required', () => {
    expect(DangerousAnalysisSchema.safeParse({ ...cause, board, further_harm }).success).toBe(true);
    expect(DangerousAnalysisSchema.safeParse({ ...cause, board }).success).toBe(false);
    expect(DangerousAnalysisSchema.safeParse({ ...cause, further_harm }).success).toBe(false);
  });

  it('does not let the LLM set fields that code owns', () => {
    expect(DangerousAnalysisSchema.safeParse({ ...cause, board, further_harm, severity: 'small' }).success).toBe(false);
    expect(DangerousAnalysisSchema.safeParse({ ...cause, board: { ...board, root_cause: 'z' }, further_harm }).success).toBe(false);
    expect(DangerousAnalysisSchema.safeParse({ ...cause, board, further_harm: [{ harm: 'Fire', likelihood: 'certain' }] }).success).toBe(false);
  });
});

describe('RcaInputSchema', () => {
  const incident = {
    id: 'INC-1', kind: 'gas_leak', occurred_at: '2026-11-25T18:30:00+05:00', location: { zone: 'Boiler house' },
    title: 'Gas smell', description: 'Operator reported gas smell', source: 'Leak sensor GL-02',
  };
  it('defaults injury to none and sensors to an empty list', () => {
    const r = RcaInputSchema.parse({ incident });
    expect(r.incident.injury).toBe('none');
    expect(r.sensors).toEqual([]);
  });
  it('rejects timestamps without a timezone offset', () => {
    expect(RcaInputSchema.safeParse({ incident: { ...incident, occurred_at: '2026-11-25 18:30' } }).success).toBe(false);
  });
  it('rejects an unknown incident kind', () => {
    expect(RcaInputSchema.safeParse({ incident: { ...incident, kind: 'flood' } }).success).toBe(false);
  });
});
