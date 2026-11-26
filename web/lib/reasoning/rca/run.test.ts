import { describe, expect, it } from 'vitest';
import { incidents } from '@/lib/data';
import { analyse, extractJson, RcaAnalysisError } from './analyse';
import { FakeLlmClient, type LlmClient, type LlmMessage, type LlmRequestOptions } from './llm';
import { fromAppIncident, loadMockCase } from './load';
import { runRca } from './run';
import { RcaOutputSchema } from './schema';
import { verifyIncident } from './verify';

const fishbone = { Man: ['Operator not trained'], Machine: ['Seal worn'], Method: [], Material: [], Measurement: [], Environment: [] };
const cause = { fishbone, root_cause: 'No preventive maintenance for the part', confidence: 0.9, next_checks: ['Inspect the part'] };
const mediumReply = JSON.stringify(cause);
const dangerousReply = JSON.stringify({
  ...cause,
  board: { what_happened: 'Leak at the flange', why_it_happened: 'Seal failed' },
  further_harm: [{ harm: 'Fire', likelihood: 'high' }, { harm: 'Gas builds up in the boiler house', likelihood: 'medium' }],
});

/** Answers whichever method the prompt asks for, like a well-behaved model. */
const byMethod = (messages: LlmMessage[]): string => (messages[1].content.startsWith('Method: fishbone') ? mediumReply : dangerousReply);
const now = () => new Date('2026-11-25T13:50:00Z');

describe('extractJson', () => {
  it('reads plain, fenced and wrapped JSON', () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(extractJson('Here you go: {"a":1} hope it helps')).toEqual({ a: 1 });
  });
  it('throws when there is no object', () => expect(() => extractJson('no idea')).toThrow());
});

describe('analyse', () => {
  it('repairs once with the validation errors, then succeeds', async () => {
    const input = await loadMockCase('heat-stress');
    const llm = new FakeLlmClient(['{"root_cause": "x"}', mediumReply]);
    const a = await analyse(llm, input, verifyIncident(input), 'medium');
    expect(a.severity).toBe('medium');
    expect(llm.calls).toHaveLength(2);
    expect(llm.calls[1].at(-1)!.content).toMatch(/fishbone/);
  });

  it('gives up after one repair instead of guessing', async () => {
    const input = await loadMockCase('heat-stress');
    const llm = new FakeLlmClient(['not json', 'still not json']);
    await expect(analyse(llm, input, verifyIncident(input), 'medium')).rejects.toBeInstanceOf(RcaAnalysisError);
    expect(llm.calls).toHaveLength(2);
  });

  it('sends the facts and the verification, never a preset answer', async () => {
    const input = await loadMockCase('gas-leak-confirmed');
    const llm = new FakeLlmClient([dangerousReply]);
    await analyse(llm, input, verifyIncident(input), 'dangerous');
    const user = llm.calls[0][1].content;
    expect(user).toContain('GAS-001');
    expect(user).toContain('"status": "confirmed"');
    expect(user).toContain('GP-IN-01/GP-OUT-01');
  });

  it('repairs a dangerous analysis that is missing its board and further harm', async () => {
    const input = await loadMockCase('boiler-overpressure');
    const llm = new FakeLlmClient([mediumReply, dangerousReply]);
    const a = await analyse(llm, input, verifyIncident(input), 'dangerous');
    expect(a.severity).toBe('dangerous');
    const repair = llm.calls[1].at(-1)!.content;
    expect(repair).toMatch(/board/);
    expect(repair).toMatch(/further_harm/);
  });

  it('reports a root-level problem when the LLM adds fields of its own', async () => {
    const input = await loadMockCase('heat-stress');
    const extra = JSON.stringify({ ...cause, verdict: 'unsafe' });
    await expect(analyse(new FakeLlmClient([extra, extra]), input, verifyIncident(input), 'medium')).rejects.toMatchObject({ issues: [expect.stringMatching(/^\(root\)/)] });
  });
});

describe('runRca: the 3-level ladder on the mock cases', () => {
  it.each([
    ['gas-leak-false-alarm', 'small', 1, 'log', false],
    ['heat-stress', 'medium', 2, 'fishbone', true],
    ['gas-leak-confirmed', 'dangerous', 3, 'board', true],
    ['boiler-overpressure', 'dangerous', 3, 'board', true],
  ] as const)('%s → level %s (%i) via %s, verified %s', async (name, severity, level, method, verified) => {
    const out = await runRca(await loadMockCase(name), { llm: new FakeLlmClient(byMethod), now });
    expect(RcaOutputSchema.safeParse(out).success).toBe(true);
    expect(out).toMatchObject({ schema_version: 'rca/v2', severity, level, method, verified: { value: verified }, generated_at: '2026-11-25T13:50:00.000+00:00' });
  });
});

describe('runRca: level 1 (small)', () => {
  it('logs the incident with a note and never calls the LLM', async () => {
    const llm = new FakeLlmClient([]);
    const out = await runRca(await loadMockCase('gas-leak-false-alarm'), { llm, now });
    expect(llm.calls).toHaveLength(0);
    expect(out).toMatchObject({ method: 'log', model: null, note: expect.stringMatching(/^Reported gas smell near boiler 2: A contractor reported/) });
    expect(out).not.toHaveProperty('fishbone');
    expect(out).not.toHaveProperty('root_cause');
  });

  it('still records the sensor check', async () => {
    const out = await runRca(await loadMockCase('gas-leak-false-alarm'), { llm: new FakeLlmClient([]), now });
    expect(out.verified).toMatchObject({ value: false, status: 'not_confirmed' });
    expect(out.verified.evidence.length).toBeGreaterThan(0);
  });
});

describe('runRca: level 2 (medium)', () => {
  it('returns the fishbone and root cause, with no board or further harm', async () => {
    const out = await runRca(await loadMockCase('heat-stress'), { llm: new FakeLlmClient(byMethod), now });
    expect(out).toMatchObject({ method: 'fishbone', model: 'fake-llm', root_cause: cause.root_cause, fishbone });
    expect(out).not.toHaveProperty('board');
    expect(out).not.toHaveProperty('further_harm');
  });
});

describe('runRca: level 3 (dangerous)', () => {
  it('returns the board chain in order, plus the fishbone', async () => {
    const out = await runRca(await loadMockCase('boiler-overpressure'), { llm: new FakeLlmClient(byMethod), now });
    if (out.method !== 'board') throw new Error('expected a board');
    expect(Object.keys(out.board)).toEqual(['what_happened', 'why_it_happened', 'root_cause', 'further_harm']);
    expect(out.board).toEqual({
      what_happened: 'Leak at the flange', why_it_happened: 'Seal failed', root_cause: out.root_cause,
      further_harm: ['Fire', 'Gas builds up in the boiler house'],
    });
    expect(out.fishbone).toEqual(fishbone);
    expect(out.further_harm[0]).toEqual({ harm: 'Fire', likelihood: 'high' });
  });

  it('keeps the model confidence when sensors confirm', async () => {
    const out = await runRca(await loadMockCase('gas-leak-confirmed'), { llm: new FakeLlmClient(byMethod), now });
    expect(out.method !== 'log' && out.confidence).toBe(0.9);
  });
});

describe('runRca: dashboard incidents and safeguards', () => {
  it('runs a dashboard incident end to end: reported High → dangerous, unverified so confidence is capped', async () => {
    const out = await runRca(fromAppIncident(incidents[0]), { llm: new FakeLlmClient(byMethod) });
    expect(out).toMatchObject({ incident_id: 'INC-0412', severity: 'dangerous', triage: { basis: 'Reported High → dangerous', rules_fired: [] } });
    expect(out.verified).toMatchObject({ value: false, status: 'insufficient_data', evidence: [] });
    expect(out.method !== 'log' && out.confidence).toBe(0.5);
  });

  it('logs a dashboard incident reported Low without calling the LLM', async () => {
    const low = incidents.find((i) => i.sev === 'Low')!;
    const llm = new FakeLlmClient([]);
    expect(await runRca(fromAppIncident(low), { llm })).toMatchObject({ severity: 'small', method: 'log' });
    expect(llm.calls).toHaveLength(0);
  });

  it('stamps the current time when no clock is given', async () => {
    const before = Date.now();
    const out = await runRca(await loadMockCase('heat-stress'), { llm: new FakeLlmClient(byMethod) });
    expect(Date.parse(out.generated_at)).toBeGreaterThanOrEqual(before - 1000);
  });

  it('passes the cancel signal and JSON mode to the LLM', async () => {
    const seen: LlmRequestOptions[] = [];
    const llm: LlmClient = { model: 'spy', complete: async (m, o = {}) => { seen.push(o); return byMethod(m); } };
    const ctl = new AbortController();
    await runRca(await loadMockCase('heat-stress'), { llm, signal: ctl.signal });
    expect(seen[0]).toEqual({ json: true, signal: ctl.signal });
  });

  it('rejects an LLM answer that tries to set severity or the incident id', async () => {
    const sneaky = JSON.stringify({ ...cause, severity: 'small', incident_id: 'X' });
    await expect(runRca(await loadMockCase('heat-stress'), { llm: new FakeLlmClient([sneaky, sneaky]), now })).rejects.toBeInstanceOf(RcaAnalysisError);
  });

  it('rejects invalid input before calling the LLM', async () => {
    const llm = new FakeLlmClient([]);
    await expect(runRca({ incident: { id: 'X' } }, { llm })).rejects.toThrow(/not a valid RCA input/);
    expect(llm.calls).toHaveLength(0);
  });
});
