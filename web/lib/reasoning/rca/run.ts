/* RCA orchestrator: validate input → verify against sensors → triage onto the 3-level ladder → analyse → validate output.
   Level 1 (small) is logged without the LLM; level 2 (medium) gets a fishbone; level 3 (dangerous) the board chain plus fishbone.
   Code owns incident_id, severity, verification, the method and the confidence cap; the LLM supplies the reasoning. */
import { analyse } from './analyse';
import { CONFIDENCE, RCA_SCHEMA_VERSION } from './config';
import type { LlmClient } from './llm';
import { parseRcaInput } from './load';
import { RcaOutputSchema, type RcaOutput } from './schema';
import { triage } from './triage';
import { verifyIncident } from './verify';

export interface RunRcaOptions { llm: LlmClient; now?: () => Date; signal?: AbortSignal }

/** UTC timestamp written with an explicit +00:00 offset, the same format the schema requires of incident times. */
const iso = (d: Date): string => d.toISOString().replace('Z', '+00:00');

export async function runRca(rawInput: unknown, opts: RunRcaOptions): Promise<RcaOutput> {
  const input = parseRcaInput(rawInput);
  const { incident } = input;
  const verification = verifyIncident(input);
  const t = triage(incident, verification);

  const base = {
    schema_version: RCA_SCHEMA_VERSION,
    incident_id: incident.id,
    generated_at: iso(opts.now?.() ?? new Date()),
    triage: { basis: t.basis, rules_fired: t.rules_fired, provisional: t.provisional },
    verified: { value: verification.verified, status: verification.status, summary: verification.summary, evidence: verification.evidence },
  };

  let output: unknown;
  if (t.severity === 'small') {
    output = { ...base, severity: 'small', level: 1, method: 'log', model: null, note: `${incident.title}: ${incident.description}` };
  } else {
    const a = await analyse(opts.llm, input, verification, t.severity, opts.signal);
    const r = a.result;
    const cause = {
      model: opts.llm.model,
      fishbone: r.fishbone,
      root_cause: r.root_cause,
      confidence: verification.verified ? r.confidence : Math.min(r.confidence, CONFIDENCE.unverifiedCap),
      next_checks: r.next_checks,
    };
    output =
      a.severity === 'medium'
        ? { ...base, severity: 'medium', level: 2, method: 'fishbone', ...cause }
        : {
            ...base, severity: 'dangerous', level: 3, method: 'board', ...cause,
            board: { ...a.result.board, root_cause: a.result.root_cause, further_harm: a.result.further_harm.map((h) => h.harm) },
            further_harm: a.result.further_harm,
          };
  }
  // Final gate: Decision never receives an output that breaks the contract.
  return RcaOutputSchema.parse(output);
}
