import { describe, expect, it } from 'vitest';
import { FISHBONE_CATEGORIES } from './config';
import { loadMockCase } from './load';
import { buildMessages, repairMessage, SYSTEM_PROMPT } from './prompts';
import { verifyIncident } from './verify';

describe('prompts', () => {
  it('names every fishbone category from config, so the prompt and the schema cannot drift apart', () => {
    for (const c of FISHBONE_CATEGORIES) expect(SYSTEM_PROMPT).toContain(c);
  });

  it('asks for 5 Whys on a small incident and the board on a dangerous one', async () => {
    const input = await loadMockCase('heat-stress');
    const v = verifyIncident(input);
    expect(buildMessages(input, v, 'small')[1].content).toMatch(/^Method: 5 Whys/);
    const dangerous = buildMessages(input, v, 'dangerous')[1].content;
    expect(dangerous).toMatch(/^Method: board analysis/);
    expect(dangerous).toContain('"circumstances"');
    expect(dangerous).not.toContain('"why_chain"');
  });

  it('gives the model the facts and sensor evidence, but not the internal severe flags', async () => {
    const input = await loadMockCase('boiler-overpressure');
    const user = buildMessages(input, verifyIncident(input), 'dangerous')[1].content;
    const facts = JSON.parse(user.slice(user.indexOf('Facts:\n') + 7));
    expect(facts.incident.id).toBe('BLR-001');
    expect(facts.sensor_verification.evidence[0]).toHaveProperty('observed');
    expect(facts.sensor_verification.evidence[0]).not.toHaveProperty('severe');
  });

  it('lists each validation issue in the repair message', () => {
    expect(repairMessage(['a: bad', 'b: missing']).content).toMatch(/- a: bad\n- b: missing/);
  });
});
