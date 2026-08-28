/**
 * Typed endpoint functions for the QAIF backend — one per read resource plus the single write.
 *
 * SCAFFOLD ONLY in stage A: these are defined and type-checked but not invoked anywhere yet. Each
 * binds a path to its Zod schema, so a caller in a later stage gets a fully typed, boundary-
 * validated result for free. The one write (review) mirrors the backend's only state-changing route.
 */
import { apiRequest } from '@/api/client';
import {
  caseSummaryResponseSchema,
  correlationsResponseSchema,
  evidenceResponseSchema,
  findingsResponseSchema,
  graphResponseSchema,
  healthResponseSchema,
  reviewResponseSchema,
  suggestionsResponseSchema,
  timelineResponseSchema,
} from '@/types/schemas';
import type {
  CaseSummaryResponse,
  CorrelationsResponse,
  EvidenceResponse,
  FindingsResponse,
  GraphResponse,
  HealthResponse,
  ReviewRequest,
  ReviewResponse,
  SuggestionsResponse,
  TimelineResponse,
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

export function getSuggestions(caseId: number, signal?: AbortSignal): Promise<SuggestionsResponse> {
  return apiRequest(`/cases/${caseId}/suggestions`, suggestionsResponseSchema, { signal });
}

/** The one state-changing call: record a human's approve/reject decision on a suggestion (R6). */
export function reviewSuggestion(
  caseId: number,
  suggestionId: number,
  body: ReviewRequest,
): Promise<ReviewResponse> {
  return apiRequest(`/cases/${caseId}/suggestions/${suggestionId}/review`, reviewResponseSchema, {
    method: 'POST',
    body,
  });
}
