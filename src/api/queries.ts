/**
 * TanStack Query hooks over the read-only endpoints, plus the single review mutation.
 *
 * Each read hook is enabled only when a case is actually selected, so the shell renders a clean
 * "select a case" state instead of firing calls with a null id. Every endpoint already validates
 * its response with Zod at the boundary (see api/client.ts), so a hook's `data` is fully typed and
 * contract-checked before a component ever sees it.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type UseQueryResult } from '@tanstack/react-query';

import {
  addToCase,
  getCase,
  getCorrelations,
  getCryptoTrace,
  getEvidence,
  getFindings,
  getGraph,
  getHealth,
  getReport,
  getSuggestions,
  getTimeline,
  getWazuhAlerts,
  lookupIndicator,
  matchIndicator,
  openCase,
  reviewSuggestion,
  searchCases,
  type WazuhAlertsParams,
} from '@/api/endpoints';
import {
  type AddToCaseRequest,
  type AddToCaseResponse,
  type CaseSummaryResponse,
  type CorrelationsResponse,
  type CryptoTraceResponse,
  type EvidenceResponse,
  type FindingsResponse,
  type GraphResponse,
  type HealthResponse,
  type LookupResponse,
  type MatchResponse,
  type OpenCaseRequest,
  type OpenCaseResponse,
  type ReportResponse,
  type ReviewDecision,
  type ReviewResponse,
  type SearchResponse,
  type SuggestionsResponse,
  type TimelineResponse,
  type WazuhAlertsResponse,
} from '@/types/api';

export const queryKeys = {
  health: ['health'] as const,
  case: (caseId: number) => ['case', caseId] as const,
  graph: (caseId: number) => ['case', caseId, 'graph'] as const,
  timeline: (caseId: number) => ['case', caseId, 'timeline'] as const,
  evidence: (caseId: number) => ['case', caseId, 'evidence'] as const,
  findings: (caseId: number) => ['case', caseId, 'findings'] as const,
  correlations: (caseId: number) => ['case', caseId, 'correlations'] as const,
  crypto: (caseId: number) => ['case', caseId, 'crypto'] as const,
  suggestions: (caseId: number) => ['case', caseId, 'suggestions'] as const,
  report: (caseId: number) => ['case', caseId, 'report'] as const,
};

/** Liveness poll for the API health dot. Short interval, no retry storm. */
export function useHealth(): UseQueryResult<HealthResponse> {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: ({ signal }) => getHealth(signal),
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
    retry: false,
    staleTime: 5_000,
    gcTime: 60_000,
  });
}

/**
 * The READ-ONLY Wazuh SIEM alert feed. A case-INDEPENDENT read (no selected case needed), so it is
 * always enabled. Polls every 30s for a live feed and does not retry-storm; a `dormant`/`unavailable`
 * source is a normal 200 with an empty list, NOT a query error, so the view distinguishes "source
 * off" (clean state) from a genuine transport failure. The filter params are part of the query key,
 * so changing a filter refetches under its own cache entry.
 */
export function useWazuhAlerts(params: WazuhAlertsParams = {}): UseQueryResult<WazuhAlertsResponse> {
  return useQuery({
    queryKey: ['wazuh', 'alerts', params],
    queryFn: ({ signal }) => getWazuhAlerts(params, signal),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    retry: false,
    staleTime: 10_000,
  });
}

export function useCase(caseId: number | null): UseQueryResult<CaseSummaryResponse> {
  return useQuery({
    queryKey: caseId !== null ? queryKeys.case(caseId) : ['case', 'none'],
    queryFn: ({ signal }) => getCase(caseId as number, signal),
    enabled: caseId !== null,
  });
}

export function useGraph(caseId: number | null): UseQueryResult<GraphResponse> {
  return useQuery({
    queryKey: caseId !== null ? queryKeys.graph(caseId) : ['graph', 'none'],
    queryFn: ({ signal }) => getGraph(caseId as number, signal),
    enabled: caseId !== null,
  });
}

export function useTimeline(caseId: number | null): UseQueryResult<TimelineResponse> {
  return useQuery({
    queryKey: caseId !== null ? queryKeys.timeline(caseId) : ['timeline', 'none'],
    queryFn: ({ signal }) => getTimeline(caseId as number, signal),
    enabled: caseId !== null,
  });
}

export function useEvidence(caseId: number | null): UseQueryResult<EvidenceResponse> {
  return useQuery({
    queryKey: caseId !== null ? queryKeys.evidence(caseId) : ['evidence', 'none'],
    queryFn: ({ signal }) => getEvidence(caseId as number, signal),
    enabled: caseId !== null,
  });
}

export function useFindings(caseId: number | null): UseQueryResult<FindingsResponse> {
  return useQuery({
    queryKey: caseId !== null ? queryKeys.findings(caseId) : ['findings', 'none'],
    queryFn: ({ signal }) => getFindings(caseId as number, signal),
    enabled: caseId !== null,
  });
}

export function useCorrelations(caseId: number | null): UseQueryResult<CorrelationsResponse> {
  return useQuery({
    queryKey: caseId !== null ? queryKeys.correlations(caseId) : ['correlations', 'none'],
    queryFn: ({ signal }) => getCorrelations(caseId as number, signal),
    enabled: caseId !== null,
  });
}

/**
 * The case's stored crypto funds-flow trace. Enabled only with a selected case, like every other
 * case read. The whole payload is probabilistic (R4) and validated at the boundary before a view
 * sees it; an absent trace arrives as a clean `present:false` structure, not an error.
 */
export function useCryptoTrace(caseId: number | null): UseQueryResult<CryptoTraceResponse> {
  return useQuery({
    queryKey: caseId !== null ? queryKeys.crypto(caseId) : ['crypto', 'none'],
    queryFn: ({ signal }) => getCryptoTrace(caseId as number, signal),
    enabled: caseId !== null,
  });
}

export function useSuggestions(caseId: number | null): UseQueryResult<SuggestionsResponse> {
  return useQuery({
    queryKey: caseId !== null ? queryKeys.suggestions(caseId) : ['suggestions', 'none'],
    queryFn: ({ signal }) => getSuggestions(caseId as number, signal),
    enabled: caseId !== null,
  });
}

/**
 * The report is expensive to assemble server-side, so it is fetched on demand: pass
 * `{ enabled: true }` only once the user asks for it (a button), not on page mount.
 */
export function useReport(
  caseId: number | null,
  options: { enabled?: boolean } = {},
): UseQueryResult<ReportResponse> {
  return useQuery({
    queryKey: caseId !== null ? queryKeys.report(caseId) : ['report', 'none'],
    queryFn: ({ signal }) => getReport(caseId as number, signal),
    enabled: caseId !== null && (options.enabled ?? true),
    staleTime: 60_000,
  });
}

/**
 * Case-INDEPENDENT IOC lookup, modelled as a mutation because it is an imperative, user-triggered
 * action with side effects OUTSIDE QAIF (an outbound query to third-party sources) — not cached
 * server state keyed to a case. It writes nothing to QAIF, so there is nothing to invalidate on
 * success. The typed `LookupResponse` is Zod-validated at the boundary before a view sees it.
 */
export function useIocLookup() {
  return useMutation<LookupResponse, Error, string>({
    mutationFn: (indicator) => lookupIndicator(indicator),
  });
}

/**
 * Cross-case case search. A GET read, but modelled as a mutation because it is user-triggered
 * (fired on submit, not on mount) — the same imperative shape as `useIocLookup`. It reads only
 * (SELECT-only on the backend) and writes nothing, so there is nothing to invalidate on success.
 * The typed, R4-validated `SearchResponse` reaches the view only after boundary validation.
 */
export function useCaseSearch() {
  return useMutation<SearchResponse, Error, string>({
    mutationFn: (q) => searchCases(q),
  });
}

/**
 * Cross-case EXACT-match lookup ("have we seen this indicator before?"). Modelled as a mutation for
 * the same reason as {@link useIocLookup}: it is user-triggered (fired on submit alongside the
 * lookup), reads only (SELECT-only on the backend), and writes nothing, so there is nothing to
 * invalidate. The typed `MatchResponse` reaches the view only after boundary validation.
 */
export function useIndicatorMatch() {
  return useMutation<MatchResponse, Error, string>({
    mutationFn: (indicator) => matchIndicator(indicator),
  });
}

/**
 * Open a case — the audited, Investigator-only write. A user-triggered mutation (fired on submit).
 * It creates a brand-new case, so there is no existing case query to invalidate here; the caller
 * selects the returned case and navigates into it. Errors (403 Viewer, 422 blank reason) surface to
 * the view honestly via the typed `Error`.
 */
export function useOpenCase() {
  return useMutation<OpenCaseResponse, Error, OpenCaseRequest>({
    mutationFn: (body) => openCase(body),
  });
}

/**
 * Add ONE looked-up finding to the selected case — the in-case "collecting" write. On success we
 * invalidate this case's evidence (so the newly-sealed intel-snapshot appears in the manifest
 * immediately) and its header counts. Investigator-only; 404 if the case vanished. The typed,
 * boundary-validated response carries the ACQUIRED custody entry the view then shows.
 */
export function useAddToCase(caseId: number | null) {
  const queryClient = useQueryClient();
  return useMutation<AddToCaseResponse, Error, AddToCaseRequest>({
    mutationFn: (body) => addToCase(caseId as number, body),
    onSuccess: () => {
      if (caseId === null) return;
      void queryClient.invalidateQueries({ queryKey: queryKeys.evidence(caseId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.case(caseId) });
    },
  });
}

export interface ReviewInput {
  suggestionId: number;
  decision: ReviewDecision;
  approver?: string;
  note?: string;
}

/**
 * THE ONE WRITE (R6): record a human's approve/reject on a suggestion. On success we invalidate
 * this case's suggestions and its header counts so the console reflects the decision immediately.
 */
export function useReviewSuggestion(caseId: number | null) {
  const queryClient = useQueryClient();
  return useMutation<ReviewResponse, Error, ReviewInput>({
    mutationFn: ({ suggestionId, decision, approver, note }) =>
      reviewSuggestion(caseId as number, suggestionId, {
        decision,
        ...(approver ? { approver } : {}),
        ...(note ? { note } : {}),
      }),
    onSuccess: () => {
      if (caseId === null) return;
      void queryClient.invalidateQueries({ queryKey: queryKeys.suggestions(caseId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.case(caseId) });
    },
  });
}
