/* RCA contracts, as zod schemas so every boundary is checked at runtime:
   - RcaInput: what Perception (incident) and IoT (sensor series) hand to RCA. Provisional, see docs/rca/CONTRACT.md.
   - LLM analysis: the only part the local LLM writes; validated before use.
   - RcaOutput: what the Decision stage (predictive risk engine) consumes. */
import { z } from 'zod';
import { CONFIDENCE, FISHBONE_CATEGORIES, INCIDENT_KINDS, RCA_SCHEMA_VERSION } from './config';

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

/* ---------- LLM analysis (the only part the LLM writes; levels 2 and 3 only) ---------- */

const fishboneShape = Object.fromEntries(FISHBONE_CATEGORIES.map((c) => [c, z.array(text)])) as Record<(typeof FISHBONE_CATEGORIES)[number], z.ZodArray<typeof text>>;
export const FishboneSchema = z
  .object(fishboneShape)
  .strict()
  .refine((f) => Object.values(f).some((causes) => causes.length > 0), { message: 'Fishbone needs at least one contributing cause' });
export type Fishbone = z.infer<typeof FishboneSchema>;

/** Further harm: what else this incident or its root cause can cause (the forward-looking last step of the board). */
export const FurtherHarmSchema = z.object({ harm: text, likelihood: z.enum(['low', 'medium', 'high']) }).strict();

const causeAnalysis = {
  fishbone: FishboneSchema,
  root_cause: text,
  confidence: z.number().min(0).max(1),
  next_checks: z.array(text).min(1),
};

/** Level 2, medium: fishbone. Why did it happen? Check each cause category. */
export const MediumAnalysisSchema = z.object(causeAnalysis).strict();
export type MediumAnalysis = z.infer<typeof MediumAnalysisSchema>;

/** Level 3, dangerous: board chain plus fishbone. board.root_cause and board.further_harm are copied in by code. */
export const DangerousAnalysisSchema = z
  .object({
    ...causeAnalysis,
    board: z.object({ what_happened: text, why_it_happened: text }).strict(),
    further_harm: z.array(FurtherHarmSchema).min(1),
  })
  .strict();
export type DangerousAnalysis = z.infer<typeof DangerousAnalysisSchema>;

/* ---------- Output (what Decision consumes) ---------- */

/** The board chain, in order: what happened → why → root cause → what further harm it can cause. */
export const BoardSchema = z
  .object({ what_happened: text, why_it_happened: text, root_cause: text, further_harm: z.array(text).min(1) })
  .strict();

const outputBase = {
  schema_version: z.literal(RCA_SCHEMA_VERSION),
  incident_id: text,
  generated_at: timestamp,
  triage: z.object({ basis: text, rules_fired: z.array(text), provisional: z.boolean() }).strict(),
  verified: z.object({ value: z.boolean(), status: VerificationSchema.shape.status, summary: text, evidence: z.array(EvidenceSchema) }).strict(),
};

/** Level 1, small: logged with a note of what happened. No cause analysis and no LLM call. */
const LogOutputSchema = z
  .object({ ...outputBase, severity: z.literal('small'), level: z.literal(1), method: z.literal('log'), model: z.null(), note: text })
  .strict();

const FishboneOutputSchema = z
  .object({ ...outputBase, severity: z.literal('medium'), level: z.literal(2), method: z.literal('fishbone'), model: text, ...causeAnalysis })
  .strict();

const BoardOutputSchema = z
  .object({
    ...outputBase, severity: z.literal('dangerous'), level: z.literal(3), method: z.literal('board'), model: text, ...causeAnalysis,
    board: BoardSchema, further_harm: z.array(FurtherHarmSchema).min(1),
  })
  .strict();

export const RcaOutputSchema = z
  .discriminatedUnion('method', [LogOutputSchema, FishboneOutputSchema, BoardOutputSchema])
  .superRefine((o, ctx) => {
    const issue = (path: string, message: string): void => ctx.addIssue({ code: 'custom', path: [path], message });
    if (o.verified.value !== (o.verified.status === 'confirmed')) issue('verified', 'verified.value must be true exactly when status is confirmed');
    if (o.method !== 'log' && !o.verified.value && o.confidence > CONFIDENCE.unverifiedCap)
      issue('confidence', `Confidence above ${CONFIDENCE.unverifiedCap} needs sensor confirmation`);
    if (o.method === 'board') {
      if (o.board.root_cause !== o.root_cause) issue('board', 'board.root_cause must match root_cause');
      const harms = o.further_harm.map((h) => h.harm);
      if (harms.length !== o.board.further_harm.length || harms.some((h, i) => h !== o.board.further_harm[i]))
        issue('board', 'board.further_harm must list the further_harm entries in order');
    }
  });
export type RcaOutput = z.infer<typeof RcaOutputSchema>;
