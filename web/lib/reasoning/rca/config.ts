/* RCA tunables in one place. Every value marked PROVISIONAL is a placeholder until the HSE lead
   confirms it (see docs/rca/PROGRESS.md, Open questions). Code reads these; it never hardcodes them. */

export const RCA_SCHEMA_VERSION = 'rca/v1' as const;

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

/** PROVISIONAL triage thresholds, pending the "3 rules" and the small/dangerous line from the RCA notes. */
export const TRIAGE = {
  /** Injury outcomes that alone make an incident dangerous. */
  dangerousInjuries: ['lost_time', 'fatality'] as readonly string[],
  /** Reported severities that alone make an incident dangerous (the app's own High = score ≥ 70). */
  dangerousReportedSeverities: ['High'] as readonly string[],
} as const;

export const CONFIDENCE = {
  /** Cap on confidence when sensors did not confirm the incident: the analysis rests on the report alone. */
  unverifiedCap: 0.5,
} as const;

export const WHY_CHAIN = { min: 3, max: 7 } as const;
