/* RCA orchestrator: validate input → verify against sensors → triage → LLM analysis → assemble → validate output.
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
  const verification = verifyIncident(input);
  const t = triage(input.incident, verification);
  const { result } = await analyse(opts.llm, input, verification, t.severity, opts.signal);

  const confidence = verification.verified ? result.confidence : Math.min(result.confidence, CONFIDENCE.unverifiedCap);
  const shared = {
    schema_version: RCA_SCHEMA_VERSION,
    incident_id: input.incident.id,
    generated_at: iso(opts.now?.() ?? new Date()),
    model: opts.llm.model,
    severity: t.severity,
    triage: { rules_fired: t.rules_fired, provisional: t.provisional },
    verified: { value: verification.verified, status: verification.status, summary: verification.summary, evidence: verification.evidence },
    fishbone: result.fishbone,
    root_cause: result.root_cause,
    confidence,
    secondary_risks: result.secondary_risks,
    next_checks: result.next_checks,
  };

  const output =
    'why_chain' in result
      ? { ...shared, method: '5_whys' as const, why_chain: result.why_chain }
      : {
          ...shared,
          method: 'board' as const,
          board: { ...result.board, root_cause: result.root_cause, secondary_risks: result.secondary_risks.map((r) => r.risk) },
        };
  // Final gate: Decision never receives an output that breaks the contract.
  return RcaOutputSchema.parse(output);
}
