/* Severity triage onto the 3-level RCA ladder: small (1), medium (2), dangerous (3).
   Rule-based so it is predictable and testable; the LLM never decides severity.
   The reported severity sets the starting level; escalation rules can only raise it to dangerous.
   Thresholds are PROVISIONAL until the trainer confirms where each level starts. */
import { LEVEL, TRIAGE, type Severity } from './config';
import type { IncidentRecord, Verification } from './schema';

export type { Severity } from './config';

export interface EscalationRule { id: string; text: string; fires: (incident: IncidentRecord, v: Verification) => boolean }

/** Any rule firing escalates the incident to dangerous. */
export const ESCALATION_RULES: EscalationRule[] = [
  { id: 'R1-injury', text: 'Lost-time injury or fatality', fires: (i) => TRIAGE.dangerousInjuries.includes(i.injury) },
  { id: 'R2-severe-reading', text: 'Sensors confirm the incident with a reading past the severe line', fires: (_i, v) => v.verified && v.evidence.some((e) => e.breaches && e.severe) },
];

export interface Triage { severity: Severity; level: 1 | 2 | 3; basis: string; rules_fired: string[]; provisional: true }

export function triage(incident: IncidentRecord, verification: Verification): Triage {
  const reported = incident.reported_severity;
  const start = reported ? TRIAGE.byReportedSeverity[reported] : TRIAGE.whenNotReported;
  const basis = reported ? `Reported ${reported} → ${start}` : `No reported severity → ${start}`;
  const rules_fired = ESCALATION_RULES.filter((r) => r.fires(incident, verification)).map((r) => r.id);
  const severity: Severity = rules_fired.length ? 'dangerous' : start;
  return { severity, level: LEVEL[severity], basis, rules_fired, provisional: true };
}
