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

// -- open a case (audited write; POST /cases) -------------------------------

/**
 * The GENESIS custody entry returned by `POST /cases` — a case's first, hash-linked custody event,
 * recorded who/when/why BEFORE any evidence exists (so there is no `evidence_id`). Opening a case is
 * an audited, Investigator-only write; this entry is the custody boundary the response confirms.
 */
export const openCaseCustodyOriginSchema = z.object({
  custody_entry_id: z.number().int(),
  action: z.string(),
  actor: z.string(),
  recorded_at: z.string(),
  details: z.string().nullable(),
  prev_hash: z.string(),
  entry_hash: z.string(),
});

export const openCaseResponseSchema = z.object({
  case_id: z.number().int(),
  title: z.string(),
  opened_by: z.string(),
  opened_at: z.string(),
  reason: z.string(),
  custody_origin: openCaseCustodyOriginSchema,
});

// -- add a finding to a case (audited write; POST /cases/{id}/evidence) ------

/**
 * The single ACQUIRED custody event that "adding = collecting" writes: one looked-up finding sealed
 * as intel-snapshot evidence under the case's chain (R3). Returned with its hash so the caller can
 * confirm the finding is now sealed. Unlike the genesis above, an add carries no `details` field.
 */
export const addToCaseCustodyEntrySchema = z.object({
  custody_entry_id: z.number().int(),
  action: z.string(),
  actor: z.string(),
  recorded_at: z.string(),
  prev_hash: z.string(),
  entry_hash: z.string(),
});

/**
 * The result of adding ONE finding: the sealed intel-snapshot evidence + its ACQUIRED custody event,
 * plus the probabilistic entity and finding(s). Everything sealed is PROBABILISTIC (R4) — a claim
 * record, never confirmed by the act of collecting. `sha256` is the seal over the snapshot (R2).
 */
export const addToCaseResponseSchema = z.object({
  case_id: z.number().int(),
  evidence_id: z.number().int(),
  entity_id: z.number().int(),
  sha256: z.string(),
  finding_ids: z.array(z.number().int()),
  custody_entry: addToCaseCustodyEntrySchema,
});

// -- Wazuh SIEM alert feed (READ-ONLY; GET /wazuh/alerts) -------------------

/**
 * The recent-alerts feed from `GET /wazuh/alerts`. A Wazuh alert is a SIGNAL that LAUNCHES
 * investigation — it is NOT QAIF evidence and NOT under chain of custody. QAIF only READS from the
 * Wazuh Indexer; it never writes back.
 *
 * R8 is preserved at the boundary: `normalized_utc` is the UTC instant (trailing `Z`) and
 * `original_timestamp` keeps the alert's original offset verbatim — both nullable, since a raw alert
 * may lack a parseable time. `status` is a closed enum: a `dormant` (source unconfigured) or
 * `unavailable` (Indexer unreachable) feed still validates — it arrives as a clean, EMPTY list, so
 * the UI shows an honest "source unavailable" state rather than crashing or faking alerts.
 */
export const wazuhRuleSchema = z.object({
  id: z.string(),
  level: z.number().int().nullable(),
  description: z.string(),
  groups: z.array(z.string()),
});

export const wazuhAgentSchema = z.object({
  id: z.string(),
  name: z.string(),
});

/** An indicator `detect.py` extracted from the alert — normalized like search/match, ready to hand off. */
export const wazuhIndicatorSchema = z.object({
  value: z.string(),
  type: z.string(),
});

export const wazuhAlertSchema = z.object({
  id: z.string(),
  index: z.string().nullable(),
  rule: wazuhRuleSchema,
  agent: wazuhAgentSchema,
  full_log: z.string(),
  normalized_utc: z.string().nullable(),
  original_timestamp: z.string().nullable(),
  extracted_indicators: z.array(wazuhIndicatorSchema),
});

export const wazuhAlertsResponseSchema = z.object({
  status: z.enum(['ok', 'dormant', 'unavailable']),
  configured: z.boolean(),
  count: z.number().int(),
  detail: z.string().nullable(),
  alerts: z.array(wazuhAlertSchema),
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

// -- CVE dashboard (a lookup detected_type === 'cve') -----------------------

/**
 * Schemas for the CVE payloads a `POST /lookup` returns when the indicator is a CVE. These are a
 * SECOND, VIEW-LEVEL boundary layered ON the generic lookup boundary above: the outer envelope
 * already pinned `tier: external-source-claim` / `confirmed: false` on every result (so a CVE
 * record — NVD included, authoritative but still a CLAIM — can never render as confirmed evidence).
 * These schemas narrow the per-source `payload.metadata` so the dashboard reads typed fields, and
 * every field is `.optional()` — a missing field degrades to "absent" (the section is omitted),
 * never fabricated. Each CVE source's payload is the serialized report `{ configured, metadata }`.
 */
export const cveSourcePayloadSchema = z.object({
  configured: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const cveCvssSchema = z.object({
  version: z.string().nullish(),
  base_score: z.number().nullish(),
  severity: z.string().nullish(),
  vector: z.string().nullish(),
  source: z.string().nullish(),
  type: z.string().nullish(),
});

export const cveKevSchema = z.object({
  known_exploited: z.boolean(),
  cisa_exploit_add: z.string().nullish(),
  cisa_action_due: z.string().nullish(),
  cisa_vulnerability_name: z.string().nullish(),
  cisa_required_action: z.string().nullish(),
});

export const cveNvdMetadataSchema = z.object({
  cve_id: z.string().nullish(),
  published: z.string().nullish(),
  last_modified: z.string().nullish(),
  vuln_status: z.string().nullish(),
  description: z.string().nullish(),
  cvss: cveCvssSchema.nullish(),
  affected_products: z.array(z.string()).optional().default([]),
  affected_products_total: z.number().optional().default(0),
  references: z.array(z.string()).optional().default([]),
  references_total: z.number().optional().default(0),
  cisa_kev: cveKevSchema.nullish(),
});

/** OTX CVE context — in-the-wild discussion: pulses, the actors and malware families named. */
export const cveOtxContextSchema = z.object({
  pulse_count: z.number().optional(),
  pulses: z.array(z.string()).optional().default([]),
  malware_families: z.array(z.string()).optional().default([]),
  adversaries: z.array(z.string()).optional().default([]),
  references: z.array(z.string()).optional().default([]),
  references_total: z.number().optional(),
});

/** VirusTotal CVE collection context — the human blurb plus VT's relationship counts. */
export const cveVtContextSchema = z.object({
  name: z.string().nullish(),
  description: z.string().nullish(),
  related_counts: z.record(z.string(), z.number()).optional().default({}),
});

// -- case search (cross-case, SELECT-only; GET /search) ---------------------

export const searchCaseHitSchema = z.object({
  case_id: z.number().int(),
  case_number: z.string(),
  title: z.string(),
  classification: z.string(),
  status: z.string(),
  opened_at: z.string(),
  closed_at: z.string().nullable(),
});

export const searchEvidenceHitSchema = z.object({
  case_id: z.number().int(),
  evidence_id: z.number().int(),
  original_filename: z.string(),
  evidence_type: z.string(),
  sha256: z.string(),
  source_description: z.string().nullable(),
  // R8: the UTC instant and its original-tz companion travel together.
  acquired_at: z.string(),
  acquired_at_original_tz: z.string(),
});

export const searchEntityHitSchema = z.object({
  case_id: z.number().int(),
  entity_id: z.number().int(),
  entity_type: z.string(),
  value: z.string(),
  normalized_value: z.string(),
  tier: tierSchema, // per-row tier, derived from confidence server-side (R4)
  confidence: z.number().nullable(),
  first_seen: z.string(),
  first_seen_original_tz: z.string(),
  last_seen: z.string(),
  last_seen_original_tz: z.string(),
});

// R4 ENFORCED AT THE BOUNDARY. The two finding groups are DISTINCT schemas, each pinned to its tier
// literal. A probabilistic row (`tier: 'probabilistic'`) therefore FAILS validation if it appears
// in the `findings_confirmed` array — the confirmed schema accepts only `tier: 'confirmed'`, and
// vice-versa. The R4 separation is thus a runtime contract, not a rendering convention: a payload
// that merges the tiers is rejected before any component sees it.
const searchFindingBase = {
  case_id: z.number().int(),
  finding_id: z.number().int(),
  module_id: z.string(),
  severity: z.string(),
  title: z.string(),
  description: z.string(),
  confidence: z.number().nullable(),
  method_description: z.string().nullable(),
  limitations: z.string().nullable(),
  // R8: observed_at + its original-tz companion.
  observed_at: z.string(),
  observed_at_original_tz: z.string(),
};

export const searchConfirmedFindingSchema = z.object({
  ...searchFindingBase,
  tier: z.literal('confirmed'),
});

export const searchProbabilisticFindingSchema = z.object({
  ...searchFindingBase,
  tier: z.literal('probabilistic'),
});

export const searchCountsSchema = z.object({
  cases: z.number().int(),
  evidence: z.number().int(),
  entities: z.number().int(),
  findings_confirmed: z.number().int(),
  findings_probabilistic: z.number().int(),
});

export const searchResponseSchema = z.object({
  query: z.string(),
  case_id: z.number().int().nullable(),
  counts: searchCountsSchema,
  cases: z.array(searchCaseHitSchema),
  evidence: z.array(searchEvidenceHitSchema),
  entities: z.array(searchEntityHitSchema),
  // Separate arrays, each tier-pinned — never one merged list (R4).
  findings_confirmed: z.array(searchConfirmedFindingSchema),
  findings_probabilistic: z.array(searchProbabilisticFindingSchema),
  truncated: z.record(z.string(), z.boolean()),
});

// -- cross-case EXACT match ("have we seen this before?"; GET /match) --------

/**
 * A single entity whose `normalized_value` EXACTLY equals the normalized indicator, with its case
 * context. `tier` is the entity's R4 tier, so the caller can say "appears in case X as a CONFIRMED
 * FileHash". This is EXACT normalized-value equality only — never substring or fuzzy — so there are
 * no false positives by construction (the backend guarantees it).
 */
export const matchEntityHitSchema = z.object({
  case_id: z.number().int(),
  case_title: z.string(),
  entity_id: z.number().int(),
  entity_type: z.string(),
  matched_value: z.string(),
  normalized_value: z.string(),
  tier: tierSchema,
});

export const matchResponseSchema = z.object({
  indicator: z.string(),
  normalized: z.string(),
  detected_type: z.string().nullable(),
  match_count: z.number().int(),
  matches: z.array(matchEntityHitSchema),
});

// -- crypto funds-flow trace (case read; always probabilistic — R4) ---------

/**
 * A stored crypto funds-flow trace, shaped for a LEGIBLE view of a DENSE trace (hundreds of nodes).
 *
 * The forensic invariant is ENFORCED here, not merely typed: the WHOLE payload is probabilistic — a
 * funds-flow trace is an INDICATOR, never confirmed evidence and never a determination that an
 * address belongs to a person or service (R4). So the envelope `tier` and both the origin's and the
 * findings' `tier` are pinned to the `probabilistic` literal: a trace claiming to be `confirmed`
 * fails validation at the boundary. Per-wallet / per-transaction `tier` stays the open two-value
 * enum only because confidence decays with hop distance and the backend may tier a hop accordingly.
 * `present:false` is a case with no stored trace — a clean empty structure, never an error.
 */
export const cryptoOriginSchema = z.object({
  entity_id: z.number().int(),
  value: z.string(),
  normalized_value: z.string(),
  chain: z.string().nullable(),
  tier: z.literal('probabilistic'),
  confidence: z.number().nullable(),
  // The OFAC/sanction provenance and the crypto-reference evidence the FUNDED edges cite (R2/R9).
  sanction_provenance: z.string().nullable(),
  reference_evidence_id: z.number().int().nullable(),
});

export const cryptoWalletSchema = z.object({
  entity_id: z.number().int(),
  value: z.string(),
  normalized_value: z.string(),
  chain: z.string().nullable(),
  hop: z.number().int(), // distance from origin; confidence decays as this grows
  tier: tierSchema,
  confidence: z.number().nullable(),
});

export const cryptoTransactionSchema = z.object({
  entity_id: z.number().int(),
  txid: z.string(),
  chain: z.string().nullable(),
  amount: z.string().nullable(), // decimal string in the asset's units — kept exact, never a float
  hop: z.number().int(),
  source_addresses: z.array(z.string()),
  target_addresses: z.array(z.string()),
  // R8: the UTC instant and its original-tz companion travel together.
  timestamp: z.string(),
  original_tz: z.string(),
  tier: tierSchema,
  confidence: z.number().nullable(),
});

export const cryptoTraceFindingSchema = z.object({
  finding_id: z.number().int(),
  module_id: z.string(),
  severity: z.string(),
  title: z.string(),
  description: z.string(),
  tier: z.literal('probabilistic'),
  confidence: z.number().nullable(),
  method_description: z.string().nullable(),
  limitations: z.string().nullable(),
  // R8: observed_at + its original-tz companion.
  observed_at: z.string(),
  observed_at_original_tz: z.string(),
  // The honest "fan-out was capped here" disclosures, so the view can count and surface them.
  truncation: z.boolean(),
});

export const cryptoTraceSummarySchema = z.object({
  total_wallets: z.number().int(),
  total_transactions: z.number().int(),
  total_funded_edges: z.number().int(),
  max_hop: z.number().int(),
  truncation_findings: z.number().int(),
  finding_count: z.number().int(),
});

export const cryptoTraceResponseSchema = z.object({
  case_id: z.number().int(),
  present: z.boolean(),
  tier: z.literal('probabilistic'),
  origin: cryptoOriginSchema.nullable(),
  summary: cryptoTraceSummarySchema,
  wallets: z.array(cryptoWalletSchema),
  transactions: z.array(cryptoTransactionSchema),
  findings: z.array(cryptoTraceFindingSchema),
});

// -- report (canonical 6.1 record) ------------------------------------------

/**
 * The report is a large, canonical JSON record-of-record whose full shape is a Stage C concern.
 * We validate only that it is a JSON object here; the Report view (Stage C) will narrow it.
 */
export const reportResponseSchema = z.record(z.string(), z.unknown());

// -- sandbox public free-analysis (NO case, NO custody, NOT evidence) --------

/**
 * The landing "drop a file for analysis" path. A public file goes to the Triage sandbox, OUTSIDE any
 * case: this creates no case, no custody, and no evidence, and the resulting report is PROBABILISTIC
 * observation (R4), never confirmed. `POST /sandbox/submit` acknowledges with a `sample_id` to poll;
 * `GET /sandbox/report/{sample_id}` returns the live `status` and, once `reported`, the full Triage
 * `overview.json`. The report is an opaque JSON object here (the view narrows it); it is `null` while
 * the sample is still running.
 */
export const sandboxSubmitResponseSchema = z.object({
  sample_id: z.string(),
  status: z.string(),
});

export const sandboxReportResponseSchema = z.object({
  sample_id: z.string(),
  status: z.string(),
  report: z.record(z.string(), z.unknown()).nullable(),
});
