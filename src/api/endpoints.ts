/**
 * Typed endpoint functions for the QAIF backend — one per read resource plus the audited writes.
 *
 * Each binds a path to its Zod schema, so a caller gets a fully typed, boundary-validated result for
 * free. The writes (review, openCase, addToCase) mirror the backend's state-changing routes; each
 * carries the Investigator IAM headers, since the backend fail-closes to a read-only Viewer without.
 */
import { apiRequest } from '@/api/client';
import { roleHeaders, type Role } from '@/api/identity';
import {
  addToCaseResponseSchema,
  caseSummaryResponseSchema,
  correlationsResponseSchema,
  cryptoTraceResponseSchema,
  evidenceResponseSchema,
  findingsResponseSchema,
  graphResponseSchema,
  healthResponseSchema,
  lookupResponseSchema,
  matchResponseSchema,
  openCaseResponseSchema,
  reportResponseSchema,
  reviewResponseSchema,
  sandboxReportResponseSchema,
  sandboxSubmitResponseSchema,
  searchResponseSchema,
  suggestionsResponseSchema,
  timelineResponseSchema,
  wazuhAlertsResponseSchema,
} from '@/types/schemas';
import type {
  AddToCaseRequest,
  AddToCaseResponse,
  CaseSummaryResponse,
  CorrelationsResponse,
  CryptoTraceResponse,
  EvidenceResponse,
  FindingsResponse,
  GraphResponse,
  HealthResponse,
  LookupResponse,
  MatchResponse,
  OpenCaseRequest,
  OpenCaseResponse,
  ReportResponse,
  ReviewRequest,
  ReviewResponse,
  SandboxReportResponse,
  SandboxSubmitResponse,
  SearchResponse,
  SuggestionsResponse,
  TimelineResponse,
  WazuhAlertsResponse,
} from '@/types/api';

export function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  return apiRequest('/healthz', healthResponseSchema, { signal });
}

export function getCase(caseId: number, signal?: AbortSignal): Promise<CaseSummaryResponse> {
  return apiRequest(`/cases/${caseId}`, caseSummaryResponseSchema, { signal });
}

export function getGraph(caseId: number, signal?: AbortSignal): Promise<GraphResponse> {
  return apiRequest(`/cases/${caseId}/graph`, graphResponseSchema, { signal });
}

export function getTimeline(caseId: number, signal?: AbortSignal): Promise<TimelineResponse> {
  return apiRequest(`/cases/${caseId}/timeline`, timelineResponseSchema, { signal });
}

export function getEvidence(caseId: number, signal?: AbortSignal): Promise<EvidenceResponse> {
  return apiRequest(`/cases/${caseId}/evidence`, evidenceResponseSchema, { signal });
}

export function getFindings(caseId: number, signal?: AbortSignal): Promise<FindingsResponse> {
  return apiRequest(`/cases/${caseId}/findings`, findingsResponseSchema, { signal });
}

export function getCorrelations(
  caseId: number,
  signal?: AbortSignal,
): Promise<CorrelationsResponse> {
  return apiRequest(`/cases/${caseId}/correlations`, correlationsResponseSchema, { signal });
}

/**
 * The case's stored crypto funds-flow trace (a SELECT-only read). The whole payload is
 * probabilistic (R4) — a trace is an indicator, never confirmed evidence — and an absent trace
 * comes back as a clean `present:false` structure rather than an error.
 */
export function getCryptoTrace(
  caseId: number,
  signal?: AbortSignal,
): Promise<CryptoTraceResponse> {
  return apiRequest(`/cases/${caseId}/crypto`, cryptoTraceResponseSchema, { signal });
}

export function getSuggestions(caseId: number, signal?: AbortSignal): Promise<SuggestionsResponse> {
  return apiRequest(`/cases/${caseId}/suggestions`, suggestionsResponseSchema, { signal });
}

export function getReport(caseId: number, signal?: AbortSignal): Promise<ReportResponse> {
  return apiRequest(`/cases/${caseId}/report`, reportResponseSchema, { signal });
}

/**
 * Case-INDEPENDENT IOC intelligence lookup. Unlike every read above (which SELECTs from the QAIF
 * database), this POST reaches OUTBOUND to third-party sources and returns their claims. It writes
 * NOTHING to QAIF — no case, no custody, no row — and it is lookup only: it never submits, uploads,
 * or detonates a sample (R9). Despite the POST verb, the backend classifies it as a read/query, so
 * the API still exposes exactly one state-changing route (the review below).
 */
export function lookupIndicator(indicator: string, signal?: AbortSignal): Promise<LookupResponse> {
  return apiRequest('/lookup', lookupResponseSchema, {
    method: 'POST',
    body: { indicator },
    ...(signal ? { signal } : {}),
  });
}

/**
 * Cross-case, SELECT-only case search. A GET read (it does NOT count toward the single-write-route
 * budget). Matching is case-insensitive literal substring across cases, evidence, entities, and
 * BOTH finding tables; confirmed and probabilistic findings come back in separate arrays (R4). The
 * response is Zod-validated at the boundary, so a payload that merges the tiers is rejected here.
 */
export function searchCases(
  q: string,
  opts: { caseId?: number; limit?: number } = {},
  signal?: AbortSignal,
): Promise<SearchResponse> {
  const params = new URLSearchParams({ q });
  if (opts.limit !== undefined) params.set('limit', String(opts.limit));
  if (opts.caseId !== undefined) params.set('case_id', String(opts.caseId));
  return apiRequest(`/search?${params.toString()}`, searchResponseSchema, {
    ...(signal ? { signal } : {}),
  });
}

/**
 * Cross-case EXACT match — the "have we seen this indicator before?" read. A GET, SELECT-only, and
 * NOT a write route: it reads entities + their case and writes nothing. Matching is EXACT
 * normalized-value equality (never substring/fuzzy), so a hit is a genuine prior appearance of this
 * exact indicator — no false positives by construction. `match_count` 0 is a clean, expected result.
 */
export function matchIndicator(indicator: string, signal?: AbortSignal): Promise<MatchResponse> {
  const params = new URLSearchParams({ indicator });
  return apiRequest(`/match?${params.toString()}`, matchResponseSchema, {
    ...(signal ? { signal } : {}),
  });
}

/** Optional filters for the Wazuh feed — all narrow the read; none are required. */
export interface WazuhAlertsParams {
  limit?: number;
  minLevel?: number;
  agent?: string;
  since?: string;
  until?: string;
}

/**
 * The READ-ONLY Wazuh SIEM alert feed (newest first). Wazuh is a signal SOURCE only: QAIF reads FROM
 * the Indexer and never writes to it, so despite launching investigations this is a pure read (like
 * `/lookup`) — no case, no custody. A `dormant`/`unavailable` source returns a clean, EMPTY list
 * (HTTP 200), so the caller shows an honest "source unavailable" state rather than treating it as an
 * error. Every alert carries R8 timestamps (UTC + original offset) and any extracted indicators.
 */
export function getWazuhAlerts(
  params: WazuhAlertsParams = {},
  signal?: AbortSignal,
): Promise<WazuhAlertsResponse> {
  const sp = new URLSearchParams();
  if (params.limit !== undefined) sp.set('limit', String(params.limit));
  if (params.minLevel !== undefined) sp.set('min_level', String(params.minLevel));
  if (params.agent) sp.set('agent', params.agent);
  if (params.since) sp.set('since', params.since);
  if (params.until) sp.set('until', params.until);
  const qs = sp.toString();
  return apiRequest(`/wazuh/alerts${qs ? `?${qs}` : ''}`, wazuhAlertsResponseSchema, {
    ...(signal ? { signal } : {}),
  });
}

/**
 * PUBLIC free-analysis: submit an arbitrary file to the Triage sandbox — the landing "drop a file"
 * path. This is the ONE multipart call (field `file`), so it hands the client a `FormData` body
 * instead of JSON; the browser sets the multipart boundary. It reaches OUTBOUND to Triage and writes
 * NOTHING to QAIF — no case, no custody, no evidence. On success it returns a `sample_id` to poll.
 * A refused submission is a 403, an unreachable/unconfigured sandbox a 502 — both surface honestly.
 */
export function submitSandboxSample(
  file: File,
  signal?: AbortSignal,
): Promise<SandboxSubmitResponse> {
  const form = new FormData();
  form.append('file', file);
  return apiRequest('/sandbox/submit', sandboxSubmitResponseSchema, {
    method: 'POST',
    body: form,
    ...(signal ? { signal } : {}),
  });
}

/**
 * Poll a public submission: the live Triage `status` and, once `reported`, the full `overview.json`
 * report (`report` is `null` while the sample is still running). A pure read that writes nothing to
 * QAIF; the report is PROBABILISTIC observation (R4), never confirmed evidence. An unknown sample id
 * is a 404, an unreachable sandbox a 502 — surfaced honestly by the caller.
 */
export function getSandboxReport(
  sampleId: string,
  signal?: AbortSignal,
): Promise<SandboxReportResponse> {
  return apiRequest(
    `/sandbox/report/${encodeURIComponent(sampleId)}`,
    sandboxReportResponseSchema,
    { ...(signal ? { signal } : {}) },
  );
}

/**
 * Open a new, empty attributed case — the deliberate custody boundary (audited, Investigator-only).
 * `reason` is MANDATORY (R10); the backend 422s on a blank one and 403s without the Investigator
 * role. The caller passes the role it is ACTING as; {@link roleHeaders} stamps the IAM headers, so a
 * Viewer genuinely sends `Viewer` and is refused. Custody begins with the genesis entry in the reply.
 */
export function openCase(body: OpenCaseRequest, role: Role): Promise<OpenCaseResponse> {
  return apiRequest('/cases', openCaseResponseSchema, {
    method: 'POST',
    body,
    headers: roleHeaders(role),
  });
}

/**
 * Add ONE looked-up finding to an existing case — "adding = collecting". The single `lookup_result`
 * is sealed as intel-snapshot evidence (PROBABILISTIC, R4) under ONE ACQUIRED custody event (R3).
 * Investigator-only (403 for Viewer); 404 if the case does not exist. Idempotent by (case, sha256).
 */
export function addToCase(
  caseId: number,
  body: AddToCaseRequest,
  role: Role,
): Promise<AddToCaseResponse> {
  return apiRequest(`/cases/${caseId}/evidence`, addToCaseResponseSchema, {
    method: 'POST',
    body,
    headers: roleHeaders(role),
  });
}

/**
 * Record a human's approve/reject decision on a suggestion (R6) — Investigator-only, so it carries
 * the acting role's IAM headers like the other writes (a Viewer is refused 403).
 */
export function reviewSuggestion(
  caseId: number,
  suggestionId: number,
  body: ReviewRequest,
  role: Role,
): Promise<ReviewResponse> {
  return apiRequest(`/cases/${caseId}/suggestions/${suggestionId}/review`, reviewResponseSchema, {
    method: 'POST',
    body,
    headers: roleHeaders(role),
  });
}
