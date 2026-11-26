import { describe, expect, it } from 'vitest';
import { DangerousAnalysisSchema, RcaInputSchema, RcaOutputSchema, SmallAnalysisSchema, type RcaOutput } from './schema';

const fishbone = { Man: [], Machine: ['Valve seal worn'], Method: [], Material: [], Measurement: [], Environment: [] };
const evidence = {
  sensor_id: 'GP-IN-01', metric: 'inlet minus outlet pressure', observed: 0.6, threshold: 0.15, unit: 'bar',
  from: '2026-11-25T18:30:00+05:00', to: '2026-11-25T18:36:00+05:00', breaches: true, severe: true, note: 'Drop held for 4 readings',
};

function dangerous(): RcaOutput {
  return {
    schema_version: 'rca/v1', incident_id: 'INC-GAS-001', generated_at: '2026-11-25T18:45:00+05:00', model: 'fake',
    severity: 'dangerous', triage: { rules_fired: ['R3'], provisional: true },
    verified: { value: true, status: 'confirmed', summary: 'Leak confirmed', evidence: [evidence] },
    method: 'board',
    board: { incident_occurred: 'Gas leak', why_it_happened: 'Seal failed', root_cause: 'No seal replacement schedule', circumstances: ['Area evacuated'], secondary_risks: ['Fire'] },
    fishbone, root_cause: 'No seal replacement schedule', confidence: 0.8,
    secondary_risks: [{ risk: 'Fire', likelihood: 'high' }], next_checks: ['Pressure-test the line'],
  };
}

function small(): RcaOutput {
  const { board: _board, ...rest } = dangerous();
  return { ...rest, severity: 'small', method: '5_whys', why_chain: ['a', 'b', 'c'] };
}

describe('RcaOutputSchema', () => {
  it('accepts a valid dangerous output', () => expect(RcaOutputSchema.safeParse(dangerous()).success).toBe(true));
  it('accepts a valid small output', () => expect(RcaOutputSchema.safeParse(small()).success).toBe(true));

  it('rejects a dangerous incident without a board', () => {
    const { board: _board, ...o } = dangerous();
    expect(RcaOutputSchema.safeParse(o).success).toBe(false);
  });

  it('rejects a small incident analysed with the board method', () => {
    expect(RcaOutputSchema.safeParse({ ...small(), method: 'board' }).success).toBe(false);
  });

  it('rejects a board whose root cause disagrees with the top-level one', () => {
    const o = dangerous();
    expect(RcaOutputSchema.safeParse({ ...o, board: { ...o.board!, root_cause: 'Something else' } }).success).toBe(false);
  });

  it('rejects high confidence when sensors did not confirm', () => {
    const o = dangerous();
    const unverified = { ...o, verified: { ...o.verified, value: false, status: 'not_confirmed' as const } };
    expect(RcaOutputSchema.safeParse({ ...unverified, confidence: 0.9 }).success).toBe(false);
    expect(RcaOutputSchema.safeParse({ ...unverified, confidence: 0.4 }).success).toBe(true);
  });

  it('rejects verified.value that disagrees with status', () => {
    const o = dangerous();
    expect(RcaOutputSchema.safeParse({ ...o, verified: { ...o.verified, status: 'not_confirmed' } }).success).toBe(false);
  });

  it('requires all six fishbone categories and no others', () => {
    const { Environment: _e, ...missing } = fishbone;
    expect(RcaOutputSchema.safeParse({ ...dangerous(), fishbone: missing }).success).toBe(false);
    expect(RcaOutputSchema.safeParse({ ...dangerous(), fishbone: { ...fishbone, Money: [] } }).success).toBe(false);
  });

  it('rejects an empty fishbone', () => {
    const empty = { Man: [], Machine: [], Method: [], Material: [], Measurement: [], Environment: [] };
    expect(RcaOutputSchema.safeParse({ ...dangerous(), fishbone: empty }).success).toBe(false);
  });

  it('rejects unknown top-level fields and out-of-range confidence', () => {
    expect(RcaOutputSchema.safeParse({ ...dangerous(), extra: 1 }).success).toBe(false);
    expect(RcaOutputSchema.safeParse({ ...dangerous(), confidence: 1.2 }).success).toBe(false);
  });
});

describe('LLM analysis schemas', () => {
  const common = { fishbone, root_cause: 'x', confidence: 0.5, secondary_risks: [], next_checks: ['y'] };
  it('limits the why chain to 3–7 steps', () => {
    expect(SmallAnalysisSchema.safeParse({ ...common, why_chain: ['a', 'b'] }).success).toBe(false);
    expect(SmallAnalysisSchema.safeParse({ ...common, why_chain: ['a', 'b', 'c'] }).success).toBe(true);
  });
  it('does not let the LLM set fields that code owns', () => {
    const board = { incident_occurred: 'a', why_it_happened: 'b', circumstances: ['c'] };
    expect(DangerousAnalysisSchema.safeParse({ ...common, board }).success).toBe(true);
    expect(DangerousAnalysisSchema.safeParse({ ...common, board, severity: 'small' }).success).toBe(false);
    expect(DangerousAnalysisSchema.safeParse({ ...common, board: { ...board, root_cause: 'z' } }).success).toBe(false);
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

describe('RcaOutputSchema: method consistency', () => {
  it('rejects a small incident that also carries a board', () => {
    expect(RcaOutputSchema.safeParse({ ...small(), board: dangerous().board }).success).toBe(false);
  });
  it('rejects a dangerous incident analysed with 5 Whys', () => {
    expect(RcaOutputSchema.safeParse({ ...dangerous(), method: '5_whys' }).success).toBe(false);
  });
  it('rejects a dangerous incident that also carries a why chain', () => {
    expect(RcaOutputSchema.safeParse({ ...dangerous(), why_chain: ['a', 'b', 'c'] }).success).toBe(false);
  });
  it('rejects a small incident without a why chain', () => {
    const { why_chain: _w, ...o } = small();
    expect(RcaOutputSchema.safeParse(o).success).toBe(false);
  });
  it('requires at least one next check', () => {
    expect(RcaOutputSchema.safeParse({ ...dangerous(), next_checks: [] }).success).toBe(false);
  });
  it('rejects blank text fields', () => {
    expect(RcaOutputSchema.safeParse({ ...dangerous(), root_cause: '   ' }).success).toBe(false);
  });
});
