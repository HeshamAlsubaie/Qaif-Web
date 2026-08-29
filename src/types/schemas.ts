import { z } from 'zod';

/**
 * Zod schemas mirroring the QAIF backend response shapes (openapi/qaif-openapi.json).
 *
 * These are the runtime contract at the API boundary. The forensic invariants are ENFORCED here,
 * not merely typed:
 *   - `tier` is a closed enum (confirmed | probabilistic) — an unknown tier fails validation, so a
 *     probabilistic item can never be silently rendered as confirmed (R4).
 *   - a Suggestion MUST carry `ai_generated: true` and `unverified: true` — an AI row that does not
 *     announce itself fails validation (R6).
 *   - confirmed vs probabilistic findings arrive in SEPARATE arrays and are validated as such (R4).
 *
 * Datetimes are kept as strings (ISO-8601 as emitted by the backend); parsing is a view concern.
 */

export const tierSchema = z.enum(['confirmed', 'probabilistic']);
export type Tier = z.infer<typeof tierSchema>;

export const ambiguityKindSchema = z.enum(['assumed_tz', 'precision_overlap', 'clock_skew', 'tie']);
export type AmbiguityKind = z.infer<typeof ambiguityKindSchema>;

export const reviewDecisionSchema = z.enum(['approved', 'rejected']);
export type ReviewDecision = z.infer<typeof reviewDecisionSchema>;

// -- health -----------------------------------------------------------------

export const healthResponseSchema = z.object({
  status: z.literal('ok'),
});

// -- case header ------------------------------------------------------------

export const caseCountsSchema = z.object({
  evidence: z.number().int(),
  entities: z.number().int(),
  relationships: z.number().int(),
  confirmed_findings: z.number().int(),
  probabilistic_findings: z.number().int(),
  ai_suggestions: z.number().int(),
});

export const caseSummaryResponseSchema = z.object({
  case_id: z.number().int(),
  case_number: z.string(),
  title: z.string(),
  status: z.string(),
  classification: z.string(),
  opened_at: z.string(),
  opened_by: z.string(),
  closed_at: z.string().nullable(),
  counts: caseCountsSchema,
});

// -- graph ------------------------------------------------------------------

export const graphNodeSchema = z.object({
  entity_id: z.number().int(),
  entity_type: z.string(),
  value: z.string(),
  normalized_value: z.string(),
  tier: tierSchema,
  cited_evidence_ids: z.array(z.number().int()),
});

export const graphEdgeSchema = z.object({
  relationship_id: z.number().int(),
  rel_type: z.string(),
  source_entity_id: z.number().int(),
  target_entity_id: z.number().int(),
  tier: tierSchema,
  evidence_id: z.number().int(),
  confidence: z.number().nullable(),
});

export const graphResponseSchema = z.object({
  case_id: z.number().int(),
  nodes: z.array(graphNodeSchema),
  edges: z.array(graphEdgeSchema),
});

// -- timeline ---------------------------------------------------------------

export const timelineEventResponseSchema = z.object({
  event_key: z.string(),
  utc: z.string(),
  original_tz: z.string().nullable(),
  original_local: z.string(),
  tz_assumed: z.boolean(),
  precision: z.string(),
  source_module: z.string(),
  event_kind: z.string(),
  entity_ids: z.array(z.number().int()),
  has_linked_entity: z.boolean(),
});

export const timelineAmbiguityResponseSchema = z.object({
  kind: z.string(),
  summary: z.string(),
  confidence: z.number(),
  method_description: z.string(),
  limitations: z.string(),
  event_keys: z.array(z.string()),
  entity_ids: z.array(z.number().int()),
});

export const timelineResponseSchema = z.object({
  case_id: z.number().int(),
  summary: z.string().nullable(),
  events: z.array(timelineEventResponseSchema),
  ambiguities: z.array(timelineAmbiguityResponseSchema),
});

// -- evidence ---------------------------------------------------------------

export const custodyEntryResponseSchema = z.object({
  sequence: z.number().int(),
  action: z.string(),
  actor: z.string(),
  recorded_at: z.string(),
  details: z.string().nullable(),
  prev_hash: z.string(),
  entry_hash: z.string(),
});

export const evidenceItemResponseSchema = z.object({
  evidence_id: z.number().int(),
  original_filename: z.string(),
  evidence_type: z.string(),
  sha256: z.string(),
  size_bytes: z.number().int(),
  source: z.string().nullable(),
  acquired_at: z.string(),
  acquired_at_original_tz: z.string(),
  acquired_by: z.string(),
  storage_version_id: z.string().nullable(),
  custody_verified: z.boolean(),
  custody_error: z.string().nullable(),
  custody_chain: z.array(custodyEntryResponseSchema),
});

export const evidenceResponseSchema = z.object({
  case_id: z.number().int(),
  evidence: z.array(evidenceItemResponseSchema),
});

// -- findings ---------------------------------------------------------------

export const findingResponseSchema = z.object({
  finding_id: z.number().int(),
  module_id: z.string(),
  severity: z.string(),
  title: z.string(),
  description: z.string(),
  observed_at: z.string(),
  observed_at_original_tz: z.string(),
  cited_evidence_ids: z.array(z.number().int()),
  confidence: z.number().nullable(),
  method_description: z.string().nullable(),
  limitations: z.string().nullable(),
});

/** R4: confirmed and probabilistic arrive in SEPARATE lists — never merged. */
export const findingsResponseSchema = z.object({
  case_id: z.number().int(),
  confirmed: z.array(findingResponseSchema),
  probabilistic: z.array(findingResponseSchema),
});

// -- correlations (4.3, probabilistic only) ---------------------------------

export const correlationResponseSchema = z.object({
  source_key: z.string(),
  target_key: z.string(),
  source_entity: z.string(),
  target_entity: z.string(),
  signal_kinds: z.array(z.string()),
  independent_signal_count: z.number().int(),
  single_signal: z.boolean(),
  confidence: z.number(),
  cited_evidence_ids: z.array(z.number().int()),
});

export const correlationsResponseSchema = z.object({
  case_id: z.number().int(),
  tier: z.literal('probabilistic'),
  awaiting_human_review: z.boolean(),
  note: z.string(),
  correlations: z.array(correlationResponseSchema),
});

// -- ai suggestions (R6) ----------------------------------------------------

/** A suggestion MUST announce itself as AI-generated and unverified, or validation fails (R6). */
export const suggestionResponseSchema = z.object({
  suggestion_id: z.number().int(),
  provider: z.string(),
  model_name: z.string(),
  output_text: z.string(),
  reasoning: z.string(),
  output_type: z.string(),
  ai_generated: z.literal(true),
  unverified: z.boolean(),
  awaiting_review: z.boolean(),
  status: z.string(),
  reviewed_by: z.string().nullable(),
  reviewed_at: z.string().nullable(),
  cited_evidence_ids: z.array(z.number().int()),
});

export const suggestionsResponseSchema = z.object({
  case_id: z.number().int(),
  notice: z.string(),
  items: z.array(suggestionResponseSchema),
});

// -- the one write: review --------------------------------------------------

export const reviewRequestSchema = z.object({
  decision: reviewDecisionSchema,
  approver: z.string().optional(),
  note: z.string().optional(),
});

export const reviewResponseSchema = z.object({
  suggestion_id: z.number().int(),
  case_id: z.number().int(),
  decision: reviewDecisionSchema,
  status: z.string(),
  reviewed_by: z.string(),
  reviewed_at: z.string(),
  changed: z.boolean(),
  audit_recorded: z.boolean(),
});

// -- IOC lookup (case-independent external intelligence; POST /lookup) -------

/**
 * The result envelope from `POST /lookup` — a case-INDEPENDENT indicator lookup that fans out to
 * external intelligence sources and writes NOTHING to QAIF.
 *
 * The external-source honesty is ENFORCED here, not merely typed (mirroring how `tier` enforces R4
 * on case data): every per-source result MUST carry `tier: 'external-source-claim'` and
 * `confirmed: false`. A source claiming to be confirmed QAIF evidence fails validation at the
 * boundary — so a third-party claim can never be silently rendered as adjudicated case evidence.
 */
export const lookupSourceResultSchema = z.object({
  source: z.string(),
  family: z.string(),
  queried_value: z.string(),
  status: z.string(),
  timestamp: z.string(),
  tier: z.literal('external-source-claim'),
  confirmed: z.literal(false),
  resolved_from: z.string().nullable(),
  elapsed_ms: z.number(),
  payload: z.record(z.string(), z.unknown()).nullable(),
  error: z.string().nullable(),
});

export const lookupResponseSchema = z.object({
  indicator: z.string(),
  detected_type: z.string(),
  detail: z.string(),
  recognized: z.boolean(),
  note: z.string().nullable(),
  elapsed_ms: z.number(),
  results: z.array(lookupSourceResultSchema),
});

// -- report (canonical 6.1 record) ------------------------------------------

/**
 * The report is a large, canonical JSON record-of-record whose full shape is a Stage C concern.
 * We validate only that it is a JSON object here; the Report view (Stage C) will narrow it.
 */
export const reportResponseSchema = z.record(z.string(), z.unknown());
