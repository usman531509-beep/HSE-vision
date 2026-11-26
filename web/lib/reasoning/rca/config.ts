/* RCA tunables in one place. Every value marked PROVISIONAL is a placeholder until the HSE lead
   confirms it (see docs/rca/PROGRESS.md, Open questions). Code reads these; it never hardcodes them. */

export const RCA_SCHEMA_VERSION = 'rca/v2' as const;

/** The 3 RCA rules: an escalation ladder. Each level does more analysis than the one below.
    1 small → log and note what happened (no LLM) · 2 medium → fishbone · 3 dangerous → board chain + fishbone. */
export const SEVERITIES = ['small', 'medium', 'dangerous'] as const;
export type Severity = (typeof SEVERITIES)[number];
export const LEVEL = { small: 1, medium: 2, dangerous: 3 } as const satisfies Record<Severity, number>;

/** Ishikawa 6M. PROVISIONAL: default set until the team confirms its categories. */
export const FISHBONE_CATEGORIES = ['Man', 'Machine', 'Method', 'Material', 'Measurement', 'Environment'] as const;
export type FishboneCategory = (typeof FISHBONE_CATEGORIES)[number];

/** Incident kinds the RCA module knows how to verify against sensors. */
export const INCIDENT_KINDS = ['gas_leak', 'heat_stress', 'boiler', 'other'] as const;
export type IncidentKind = (typeof INCIDENT_KINDS)[number];

export const VERIFY = {
  /** Readings in a row that must breach a threshold before it counts (filters single-sample noise). */
  minConsecutive: 3,
  gas: {
    /** PROVISIONAL: normal pressure loss along the line between the inlet and outlet meters, bar. */
    expectedDropBar: 0.05,
    /** PROVISIONAL: extra drop beyond the expected one that confirms a leak, bar. */
    leakToleranceBar: 0.1,
    /** A drop this many times the tolerance is treated as a severe loss of containment. */
    severeFactor: 3,
  },
  /** A reading this far past its alarm limit (fraction of the limit) is severe. PROVISIONAL. */
  severeMargin: 0.1,
} as const;

/** PROVISIONAL triage thresholds, pending the trainer's confirmation of where each level starts. */
export const TRIAGE = {
  /** Starting level from the severity reported upstream, on the app's existing scale (Low < 40, Watch 40–69, Act ≥ 70). */
  byReportedSeverity: { Low: 'small', Medium: 'medium', High: 'dangerous' } as const satisfies Record<'Low' | 'Medium' | 'High', Severity>,
  /** Starting level when nothing was reported: analyse rather than only log. */
  whenNotReported: 'medium' as Severity,
  /** Injury outcomes that escalate any incident to dangerous. */
  dangerousInjuries: ['lost_time', 'fatality'] as readonly string[],
} as const;

export const CONFIDENCE = {
  /** Cap on confidence when sensors did not confirm the incident: the analysis rests on the report alone. */
  unverifiedCap: 0.5,
} as const;
