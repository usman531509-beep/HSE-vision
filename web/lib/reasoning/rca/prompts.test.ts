import { describe, expect, it } from 'vitest';
import { FISHBONE_CATEGORIES } from './config';
import { loadMockCase } from './load';
import { buildMessages, repairMessage, SYSTEM_PROMPT } from './prompts';
import { verifyIncident } from './verify';

describe('prompts', () => {
  it('names every fishbone category from config, so the prompt and the schema cannot drift apart', () => {
    for (const c of FISHBONE_CATEGORIES) expect(SYSTEM_PROMPT).toContain(c);
  });

  it('asks for the fishbone at level 2 and the board chain plus fishbone at level 3', async () => {
    const input = await loadMockCase('heat-stress');
    const v = verifyIncident(input);
    const medium = buildMessages(input, v, 'medium')[1].content;
    expect(medium).toMatch(/^Method: fishbone/);
    expect(medium).toContain('"fishbone"');
    expect(medium).not.toContain('"board"');
    expect(medium).not.toContain('"further_harm"');
    const dangerous = buildMessages(input, v, 'dangerous')[1].content;
    expect(dangerous).toMatch(/^Method: board analysis/);
    for (const field of ['"board"', '"what_happened"', '"why_it_happened"', '"further_harm"', '"fishbone"']) expect(dangerous).toContain(field);
  });

  it('never asks for a 5 Whys chain or the old circumstances field', async () => {
    const input = await loadMockCase('heat-stress');
    const v = verifyIncident(input);
    for (const s of ['medium', 'dangerous'] as const) {
      const all = buildMessages(input, v, s).map((m) => m.content).join('\n');
      expect(all).not.toMatch(/why_chain|5 Whys|circumstances/);
    }
  });

  it('gives the model the facts and sensor evidence, but not the internal severe flags', async () => {
    const input = await loadMockCase('boiler-overpressure');
    const user = buildMessages(input, verifyIncident(input), 'dangerous')[1].content;
    const facts = JSON.parse(user.slice(user.indexOf('Facts:\n') + 7));
    expect(facts.incident.id).toBe('BLR-001');
    expect(facts.severity).toBe('dangerous');
    expect(facts.sensor_verification.evidence[0]).toHaveProperty('observed');
    expect(facts.sensor_verification.evidence[0]).not.toHaveProperty('severe');
  });

  it('lists each validation issue in the repair message', () => {
    expect(repairMessage(['a: bad', 'b: missing']).content).toMatch(/- a: bad\n- b: missing/);
  });
});
