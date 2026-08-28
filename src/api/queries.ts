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
  getCase,
  getCorrelations,
  getEvidence,
  getFindings,
  getGraph,
  getHealth,
  getReport,
  getSuggestions,
  getTimeline,
  reviewSuggestion,
} from '@/api/endpoints';
import {
  type CaseSummaryResponse,
  type CorrelationsResponse,
  type EvidenceResponse,
  type FindingsResponse,
  type GraphResponse,
  type HealthResponse,
  type ReportResponse,
  type ReviewDecision,
  type ReviewResponse,
  type SuggestionsResponse,
  type TimelineResponse,
} from '@/types/api';

export const queryKeys = {
  health: ['health'] as const,
  case: (caseId: number) => ['case', caseId] as const,
  graph: (caseId: number) => ['case', caseId, 'graph'] as const,
  timeline: (caseId: number) => ['case', caseId, 'timeline'] as const,
  evidence: (caseId: number) => ['case', caseId, 'evidence'] as const,
  findings: (caseId: number) => ['case', caseId, 'findings'] as const,
  correlations: (caseId: number) => ['case', caseId, 'correlations'] as const,
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

export function useSuggestions(caseId: number | null): UseQueryResult<SuggestionsResponse> {
  return useQuery({
    queryKey: caseId !== null ? queryKeys.suggestions(caseId) : ['suggestions', 'none'],
    queryFn: ({ signal }) => getSuggestions(caseId as number, signal),
    enabled: caseId !== null,
  });
}

export function useReport(caseId: number | null): UseQueryResult<ReportResponse> {
  return useQuery({
    queryKey: caseId !== null ? queryKeys.report(caseId) : ['report', 'none'],
    queryFn: ({ signal }) => getReport(caseId as number, signal),
    enabled: caseId !== null,
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
