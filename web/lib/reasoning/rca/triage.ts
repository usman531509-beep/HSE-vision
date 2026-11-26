/* Severity triage: small (5-Whys) or dangerous (board analysis). Rule-based so it is predictable and testable;
   the LLM never decides severity. Rules and thresholds are PROVISIONAL until the RCA "3 rules" are confirmed. */
import { TRIAGE } from './config';
import type { IncidentRecord, Verification } from './schema';

export type Severity = 'small' | 'dangerous';

export interface TriageRule { id: string; text: string; fires: (incident: IncidentRecord, v: Verification) => boolean }

export const TRIAGE_RULES: TriageRule[] = [
  { id: 'R1-injury', text: 'Lost-time injury or fatality', fires: (i) => TRIAGE.dangerousInjuries.includes(i.injury) },
  { id: 'R2-reported-high', text: 'Reported as High severity upstream', fires: (i) => i.reported_severity !== undefined && TRIAGE.dangerousReportedSeverities.includes(i.reported_severity) },
  { id: 'R3-severe-reading', text: 'Sensors confirm the incident with a reading past the severe line', fires: (_i, v) => v.verified && v.evidence.some((e) => e.breaches && e.severe) },
];

export interface Triage { severity: Severity; rules_fired: string[]; provisional: true }

/** Any rule firing makes the incident dangerous; otherwise it is small. */
export function triage(incident: IncidentRecord, verification: Verification): Triage {
  const rules_fired = TRIAGE_RULES.filter((r) => r.fires(incident, verification)).map((r) => r.id);
  return { severity: rules_fired.length ? 'dangerous' : 'small', rules_fired, provisional: true };
}
