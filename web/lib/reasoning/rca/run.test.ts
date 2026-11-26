import { describe, expect, it } from 'vitest';
import { incidents } from '@/lib/data';
import { analyse, extractJson, RcaAnalysisError } from './analyse';
import { FakeLlmClient, type LlmClient, type LlmMessage, type LlmRequestOptions } from './llm';
import { fromAppIncident, loadMockCase } from './load';
import { runRca } from './run';
import { RcaOutputSchema } from './schema';
import { verifyIncident } from './verify';

const fishbone = { Man: ['Operator not trained'], Machine: ['Seal worn'], Method: [], Material: [], Measurement: [], Environment: [] };
const common = { fishbone, root_cause: 'No preventive maintenance for the part', confidence: 0.9, secondary_risks: [{ risk: 'Fire', likelihood: 'medium' }], next_checks: ['Inspect the part'] };
const smallReply = JSON.stringify({ ...common, why_chain: ['Part failed', 'Part was worn', 'No maintenance schedule'] });
const dangerousReply = JSON.stringify({ ...common, board: { incident_occurred: 'Leak', why_it_happened: 'Seal failed', circumstances: ['Gas builds up'] } });

/** Answers whichever method the prompt asks for, like a well-behaved model. */
const byMethod = (messages: LlmMessage[]): string => (messages[1].content.startsWith('Method: 5 Whys') ? smallReply : dangerousReply);
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
    const llm = new FakeLlmClient(['{"why_chain": ["only one"]}', smallReply]);
    const a = await analyse(llm, input, verifyIncident(input), 'small');
    expect(a.severity).toBe('small');
    expect(llm.calls).toHaveLength(2);
    const repair = llm.calls[1].at(-1)!.content;
    expect(repair).toMatch(/why_chain/);
    expect(repair).toMatch(/fishbone/);
  });

  it('gives up after one repair instead of guessing', async () => {
    const input = await loadMockCase('heat-stress');
    const llm = new FakeLlmClient(['not json', 'still not json']);
    await expect(analyse(llm, input, verifyIncident(input), 'small')).rejects.toBeInstanceOf(RcaAnalysisError);
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
});

describe('runRca', () => {
  it.each([
    ['gas-leak-confirmed', 'dangerous', 'board', true],
    ['gas-leak-false-alarm', 'small', '5_whys', false],
    ['heat-stress', 'small', '5_whys', true],
    ['boiler-overpressure', 'dangerous', 'board', true],
  ] as const)('%s → %s via %s, verified %s', async (name, severity, method, verified) => {
    const out = await runRca(await loadMockCase(name), { llm: new FakeLlmClient(byMethod), now });
    expect(RcaOutputSchema.safeParse(out).success).toBe(true);
    expect(out).toMatchObject({ severity, method, verified: { value: verified }, model: 'fake-llm', generated_at: '2026-11-25T13:50:00.000+00:00' });
  });

  it('copies the root cause and risks into the board so they cannot disagree', async () => {
    const out = await runRca(await loadMockCase('boiler-overpressure'), { llm: new FakeLlmClient(byMethod), now });
    expect(out.board).toMatchObject({ root_cause: out.root_cause, secondary_risks: ['Fire'] });
  });

  it('caps confidence when sensors did not confirm the incident', async () => {
    const out = await runRca(await loadMockCase('gas-leak-false-alarm'), { llm: new FakeLlmClient(byMethod), now });
    expect(out.verified.status).toBe('not_confirmed');
    expect(out.confidence).toBe(0.5);
  });

  it('keeps the model confidence when sensors confirm', async () => {
    const out = await runRca(await loadMockCase('gas-leak-confirmed'), { llm: new FakeLlmClient(byMethod), now });
    expect(out.confidence).toBe(0.9);
  });

  it('rejects an LLM answer that tries to set severity or the incident id', async () => {
    const sneaky = JSON.stringify({ ...JSON.parse(smallReply), severity: 'dangerous', incident_id: 'X' });
    await expect(runRca(await loadMockCase('heat-stress'), { llm: new FakeLlmClient([sneaky, sneaky]), now })).rejects.toBeInstanceOf(RcaAnalysisError);
  });

  it('rejects invalid input before calling the LLM', async () => {
    const llm = new FakeLlmClient([]);
    await expect(runRca({ incident: { id: 'X' } }, { llm })).rejects.toThrow(/not a valid RCA input/);
    expect(llm.calls).toHaveLength(0);
  });
});

describe('runRca: more paths', () => {
  it('runs a dashboard incident end to end: unverified, so confidence is capped', async () => {
    const out = await runRca(fromAppIncident(incidents[0]), { llm: new FakeLlmClient(byMethod) });
    expect(out).toMatchObject({ incident_id: 'INC-0412', severity: 'dangerous', triage: { rules_fired: ['R2-reported-high'] } });
    expect(out.verified).toMatchObject({ value: false, status: 'insufficient_data', evidence: [] });
    expect(out.confidence).toBe(0.5);
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

  it('repairs a dangerous analysis that is missing its board', async () => {
    const input = await loadMockCase('boiler-overpressure');
    const llm = new FakeLlmClient([JSON.stringify(common), dangerousReply]);
    const a = await analyse(llm, input, verifyIncident(input), 'dangerous');
    expect(a.severity).toBe('dangerous');
    expect(llm.calls[1].at(-1)!.content).toMatch(/board/);
  });

  it('reports a root-level problem when the LLM adds fields of its own', async () => {
    const input = await loadMockCase('heat-stress');
    const extra = JSON.stringify({ ...JSON.parse(smallReply), verdict: 'unsafe' });
    await expect(analyse(new FakeLlmClient([extra, extra]), input, verifyIncident(input), 'small')).rejects.toMatchObject({ issues: [expect.stringMatching(/^\(root\)/)] });
  });
});
