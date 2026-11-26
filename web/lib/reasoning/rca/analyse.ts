/* Runs the LLM part of RCA (levels 2 and 3) and accepts its answer only if it validates. One repair round is allowed:
   the validation errors go back to the model; a second failure is an RcaAnalysisError, never a guessed result. */
import type { LlmClient } from './llm';
import { buildMessages, repairMessage, type AnalysedSeverity } from './prompts';
import { DangerousAnalysisSchema, MediumAnalysisSchema, type DangerousAnalysis, type MediumAnalysis, type RcaInput, type Verification } from './schema';

export const MAX_REPAIRS = 1;

export class RcaAnalysisError extends Error {
  constructor(message: string, readonly issues: string[], readonly lastReply: string) {
    super(message);
  }
}

export type Analysis = { severity: 'medium'; result: MediumAnalysis } | { severity: 'dangerous'; result: DangerousAnalysis };

/** Pulls the JSON object out of a reply, tolerating code fences or a sentence around it. */
export function extractJson(reply: string): unknown {
  const fenced = reply.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : reply;
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start < 0 || end <= start) throw new SyntaxError('No JSON object in the reply');
  return JSON.parse(body.slice(start, end + 1));
}

function check(severity: AnalysedSeverity, reply: string): { ok: true; analysis: Analysis } | { ok: false; issues: string[] } {
  let raw: unknown;
  try {
    raw = extractJson(reply);
  } catch (err) {
    return { ok: false, issues: [`Not valid JSON: ${err instanceof Error ? err.message : String(err)}`] };
  }
  const r = severity === 'medium' ? MediumAnalysisSchema.safeParse(raw) : DangerousAnalysisSchema.safeParse(raw);
  if (!r.success) return { ok: false, issues: r.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`) };
  return { ok: true, analysis: { severity, result: r.data } as Analysis };
}

export async function analyse(llm: LlmClient, input: RcaInput, verification: Verification, severity: AnalysedSeverity, signal?: AbortSignal): Promise<Analysis> {
  const messages = buildMessages(input, verification, severity);
  let reply = '';
  let issues: string[] = [];
  for (let attempt = 0; attempt <= MAX_REPAIRS; attempt++) {
    if (attempt > 0) messages.push({ role: 'assistant', content: reply }, repairMessage(issues));
    reply = await llm.complete(messages, { json: true, signal });
    const c = check(severity, reply);
    if (c.ok) return c.analysis;
    issues = c.issues;
  }
  throw new RcaAnalysisError(`LLM analysis for ${input.incident.id} failed validation after ${MAX_REPAIRS + 1} attempts`, issues, reply);
}
