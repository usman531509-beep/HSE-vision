/* Prompts for the local LLM. They give the facts and the required JSON shape, never the answer:
   the LLM reasons about causes, code owns severity, verification and the final structure. */
import { FISHBONE_CATEGORIES, WHY_CHAIN } from './config';
import type { LlmMessage } from './llm';
import type { RcaInput, Verification } from './schema';
import type { Severity } from './triage';

export const SYSTEM_PROMPT = `You are the root cause analysis (RCA) step of an industrial HSE incident agent.
Rules:
- Use only the facts in the incident report and the sensor verification you are given. Do not invent readings, people, dates or equipment.
- The sensor verification and the severity are already decided by the system. Do not contradict or restate them as your own conclusion.
- If the sensors did not confirm the incident, say what is uncertain and keep confidence at or below 0.5.
- The root cause is the underlying system or management failure that, if fixed, stops recurrence. "Human error" or "operator mistake" alone is not a root cause; ask why it was possible.
- Fishbone: sort contributing causes under exactly these categories: ${FISHBONE_CATEGORIES.join(', ')}. Use an empty list for a category with no cause. Each cause is one short sentence.
- Secondary risks: what else could happen because of this incident or its root cause, each with likelihood low, medium or high.
- Next checks: concrete inspections, tests or data pulls that would confirm or refute the root cause.
- Confidence: a number from 0 to 1 for how well the evidence supports the root cause.
- Reply with one JSON object only, no prose, no code fences.`;

const common = `"fishbone": { ${FISHBONE_CATEGORIES.map((c) => `"${c}": [string]`).join(', ')} },
  "root_cause": string,
  "confidence": number,
  "secondary_risks": [{ "risk": string, "likelihood": "low" | "medium" | "high" }],
  "next_checks": [string]`;

const SHAPES: Record<Severity, string> = {
  small: `Method: 5 Whys. Start from what happened and ask "why" ${WHY_CHAIN.min}–${WHY_CHAIN.max} times; each step answers why the previous one happened, and the last step is the root cause.
JSON shape:
{
  "why_chain": [string],
  ${common}
}`,
  dangerous: `Method: board analysis for a dangerous incident.
- incident_occurred: what happened, in one or two sentences.
- why_it_happened: the direct and contributing reasons.
- circumstances: the conditions and situation that will follow from this incident if nothing changes.
JSON shape:
{
  "board": { "incident_occurred": string, "why_it_happened": string, "circumstances": [string] },
  ${common}
}`,
};

export function buildMessages(input: RcaInput, verification: Verification, severity: Severity): LlmMessage[] {
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
