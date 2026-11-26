/* Prompts for the local LLM, used at levels 2 (medium) and 3 (dangerous) of the RCA ladder only.
   They give the facts and the required JSON shape, never the answer: the LLM reasons about causes,
   code owns severity, verification and the final structure. */
import { FISHBONE_CATEGORIES } from './config';
import type { LlmMessage } from './llm';
import type { RcaInput, Verification } from './schema';

/** Levels that need cause analysis. Level 1 (small) is logged without the LLM. */
export type AnalysedSeverity = 'medium' | 'dangerous';

export const SYSTEM_PROMPT = `You are the root cause analysis (RCA) step of an industrial HSE incident agent.
Rules:
- Use only the facts in the incident report and the sensor verification you are given. Do not invent readings, people, dates or equipment.
- The sensor verification and the severity are already decided by the system. Do not contradict or restate them as your own conclusion.
- If the sensors did not confirm the incident, say what is uncertain and keep confidence at or below 0.5.
- The root cause is the underlying system or management failure that, if fixed, stops recurrence. "Human error" or "operator mistake" alone is not a root cause; ask why it was possible.
- Fishbone: check each of these cause categories in turn: ${FISHBONE_CATEGORIES.join(', ')}. List the contributing causes under each; use an empty list for a category with no cause. Each cause is one short sentence.
- Next checks: concrete inspections, tests or data pulls that would confirm or refute the root cause.
- Confidence: a number from 0 to 1 for how well the evidence supports the root cause.
- Reply with one JSON object only, no prose, no code fences.`;

const causes = `"fishbone": { ${FISHBONE_CATEGORIES.map((c) => `"${c}": [string]`).join(', ')} },
  "root_cause": string,
  "confidence": number,
  "next_checks": [string]`;

const SHAPES: Record<AnalysedSeverity, string> = {
  medium: `Method: fishbone (medium incident). Why did the incident happen? Check each cause category, then name the root cause.
JSON shape:
{
  ${causes}
}`,
  dangerous: `Method: board analysis (dangerous incident). First sort the causes with the fishbone, then write the board chain:
- what_happened: what happened, in one or two sentences.
- why_it_happened: the direct and contributing reasons.
- root_cause: the underlying cause.
- further_harm: what further harm this incident or its root cause can cause if nothing changes, each with likelihood low, medium or high.
JSON shape:
{
  "board": { "what_happened": string, "why_it_happened": string },
  "further_harm": [{ "harm": string, "likelihood": "low" | "medium" | "high" }],
  ${causes}
}`,
};

export function buildMessages(input: RcaInput, verification: Verification, severity: AnalysedSeverity): LlmMessage[] {
  const facts = {
    incident: input.incident,
    severity,
    sensor_verification: {
      status: verification.status,
      summary: verification.summary,
      evidence: verification.evidence.map(({ sensor_id, metric, observed, threshold, unit, from, to, breaches, note }) => ({ sensor_id, metric, observed, threshold, unit, from, to, breaches, note })),
    },
  };
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `${SHAPES[severity]}\n\nFacts:\n${JSON.stringify(facts, null, 2)}` },
  ];
}

export function repairMessage(issues: string[]): LlmMessage {
  return { role: 'user', content: `Your reply did not match the required JSON shape:\n${issues.map((i) => `- ${i}`).join('\n')}\nReply again with the corrected JSON object only.` };
}
