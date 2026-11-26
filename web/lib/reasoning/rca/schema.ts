/* RCA contracts, as zod schemas so every boundary is checked at runtime:
   - RcaInput: what Perception (incident) and IoT (sensor series) hand to RCA. Provisional, see docs/rca/CONTRACT.md.
   - LLM analysis: the only part the local LLM writes; validated before use.
   - RcaOutput: what the Decision stage (predictive risk engine) consumes. */
import { z } from 'zod';
import { CONFIDENCE, FISHBONE_CATEGORIES, INCIDENT_KINDS, RCA_SCHEMA_VERSION, WHY_CHAIN } from './config';

const text = z.string().trim().min(1);
const timestamp = z.iso.datetime({ offset: true });

/* ---------- Input ---------- */

export const SENSOR_KINDS = ['gas_pressure_in', 'gas_pressure_out', 'gas_concentration', 'wbgt', 'temperature', 'pressure', 'water_level'] as const;
export type SensorKind = (typeof SENSOR_KINDS)[number];

export const SensorSeriesSchema = z.object({
  sensor_id: text,
  kind: z.enum(SENSOR_KINDS),
  unit: text,
  zone: text,
  /** Pipe or circuit id; pairs a gas inlet meter with its outlet meter. */
  line: text.optional(),
  limits: z.object({ alarm_high: z.number().optional(), alarm_low: z.number().optional() }).optional(),
  readings: z.array(z.object({ t: timestamp, v: z.number().finite() })).min(1),
});
export type SensorSeries = z.infer<typeof SensorSeriesSchema>;

export const INJURY_LEVELS = ['none', 'first_aid', 'medical', 'lost_time', 'fatality'] as const;

export const IncidentRecordSchema = z.object({
  id: text,
  kind: z.enum(INCIDENT_KINDS),
  occurred_at: timestamp,
  location: z.object({ zone: text, asset: text.optional() }),
  title: text,
  description: text,
  /** Who or what reported it, e.g. "Vision-AI, CAM 03" or "Leak sensor GL-02". */
  source: text,
  /** Severity as reported upstream, on the app's existing scale. */
  reported_severity: z.enum(['High', 'Medium', 'Low']).optional(),
  injury: z.enum(INJURY_LEVELS).default('none'),
  people_exposed: z.number().int().min(0).optional(),
});
export type IncidentRecord = z.infer<typeof IncidentRecordSchema>;

export const RcaInputSchema = z.object({
  incident: IncidentRecordSchema,
  sensors: z.array(SensorSeriesSchema).default([]),
});
export type RcaInput = z.infer<typeof RcaInputSchema>;

/* ---------- Verification (computed by code, never by the LLM) ---------- */

export const EvidenceSchema = z.object({
  sensor_id: text,
  metric: text,
  /** Worst value seen in the window (largest for a high limit, smallest for a low one). */
  observed: z.number(),
  threshold: z.number(),
  unit: text,
  from: timestamp,
  to: timestamp,
  /** Threshold breached for at least the configured number of consecutive readings. */
  breaches: z.boolean(),
  severe: z.boolean(),
  note: text,
});
export type Evidence = z.infer<typeof EvidenceSchema>;

export const VerificationSchema = z.object({
  verified: z.boolean(),
  status: z.enum(['confirmed', 'not_confirmed', 'insufficient_data']),
  evidence: z.array(EvidenceSchema),
  summary: text,
});
export type Verification = z.infer<typeof VerificationSchema>;

/* ---------- LLM analysis (the only part the LLM writes) ---------- */

const fishboneShape = Object.fromEntries(FISHBONE_CATEGORIES.map((c) => [c, z.array(text)])) as Record<(typeof FISHBONE_CATEGORIES)[number], z.ZodArray<typeof text>>;
export const FishboneSchema = z
  .object(fishboneShape)
  .strict()
  .refine((f) => Object.values(f).some((causes) => causes.length > 0), { message: 'Fishbone needs at least one contributing cause' });
export type Fishbone = z.infer<typeof FishboneSchema>;

export const SecondaryRiskSchema = z.object({ risk: text, likelihood: z.enum(['low', 'medium', 'high']) });

const analysisCommon = {
  fishbone: FishboneSchema,
  root_cause: text,
  confidence: z.number().min(0).max(1),
  secondary_risks: z.array(SecondaryRiskSchema),
  next_checks: z.array(text).min(1),
};

/** Small incident: 5-Whys style chain, from the event to the root cause. */
export const SmallAnalysisSchema = z.object({ ...analysisCommon, why_chain: z.array(text).min(WHY_CHAIN.min).max(WHY_CHAIN.max) }).strict();
export type SmallAnalysis = z.infer<typeof SmallAnalysisSchema>;

/** Dangerous incident: board fields the LLM writes. root_cause and secondary_risks are copied in by code. */
export const DangerousAnalysisSchema = z
  .object({
    ...analysisCommon,
    board: z.object({ incident_occurred: text, why_it_happened: text, circumstances: z.array(text).min(1) }).strict(),
  })
  .strict();
export type DangerousAnalysis = z.infer<typeof DangerousAnalysisSchema>;

/* ---------- Output (what Decision consumes) ---------- */

export const BoardSchema = z.object({
  incident_occurred: text,
  why_it_happened: text,
  root_cause: text,
  circumstances: z.array(text).min(1),
  secondary_risks: z.array(text),
});

export const RcaOutputSchema = z
  .object({
    schema_version: z.literal(RCA_SCHEMA_VERSION),
    incident_id: text,
    generated_at: timestamp,
    model: text,
    severity: z.enum(['small', 'dangerous']),
    triage: z.object({ rules_fired: z.array(text), provisional: z.boolean() }),
    verified: z.object({ value: z.boolean(), status: VerificationSchema.shape.status, summary: text, evidence: z.array(EvidenceSchema) }),
    method: z.enum(['5_whys', 'board']),
    why_chain: z.array(text).min(WHY_CHAIN.min).max(WHY_CHAIN.max).optional(),
    board: BoardSchema.optional(),
    fishbone: FishboneSchema,
    root_cause: text,
    confidence: z.number().min(0).max(1),
    secondary_risks: z.array(SecondaryRiskSchema),
    next_checks: z.array(text).min(1),
  })
  .strict()
  .superRefine((o, ctx) => {
    const issue = (path: string, message: string): void => ctx.addIssue({ code: 'custom', path: [path], message });
    if (o.severity === 'small') {
      if (o.method !== '5_whys') issue('method', 'A small incident uses the 5_whys method');
      if (!o.why_chain) issue('why_chain', 'A small incident needs a why_chain');
      if (o.board) issue('board', 'A small incident has no board');
    } else {
      if (o.method !== 'board') issue('method', 'A dangerous incident uses the board method');
      if (!o.board) issue('board', 'A dangerous incident needs a board');
      if (o.why_chain) issue('why_chain', 'A dangerous incident has no why_chain');
      if (o.board && o.board.root_cause !== o.root_cause) issue('board', 'board.root_cause must match root_cause');
    }
    if (!o.verified.value && o.confidence > CONFIDENCE.unverifiedCap)
      issue('confidence', `Confidence above ${CONFIDENCE.unverifiedCap} needs sensor confirmation`);
    if (o.verified.value !== (o.verified.status === 'confirmed')) issue('verified', 'verified.value must be true exactly when status is confirmed');
  });
export type RcaOutput = z.infer<typeof RcaOutputSchema>;
