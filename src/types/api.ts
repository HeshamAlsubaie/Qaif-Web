/**
 * TypeScript types for the QAIF API, derived from the Zod schemas (the single source of truth).
 *
 * Deriving types via `z.infer` guarantees the compile-time types and the runtime validators can
 * never drift apart: change a schema and every consumer's types change with it.
 */
import type { z } from 'zod';

import type {
  caseCountsSchema,
  caseSummaryResponseSchema,
  correlationResponseSchema,
  correlationsResponseSchema,
  custodyEntryResponseSchema,
  evidenceItemResponseSchema,
  evidenceResponseSchema,
  findingResponseSchema,
  findingsResponseSchema,
  graphEdgeSchema,
  graphNodeSchema,
  graphResponseSchema,
  healthResponseSchema,
  reviewRequestSchema,
  reviewResponseSchema,
  suggestionResponseSchema,
  suggestionsResponseSchema,
  timelineAmbiguityResponseSchema,
  timelineEventResponseSchema,
  timelineResponseSchema,
} from '@/types/schemas';

export type { Tier, AmbiguityKind, ReviewDecision } from '@/types/schemas';

export type HealthResponse = z.infer<typeof healthResponseSchema>;
export type CaseCounts = z.infer<typeof caseCountsSchema>;
export type CaseSummaryResponse = z.infer<typeof caseSummaryResponseSchema>;

export type GraphNode = z.infer<typeof graphNodeSchema>;
export type GraphEdge = z.infer<typeof graphEdgeSchema>;
export type GraphResponse = z.infer<typeof graphResponseSchema>;

export type TimelineEventResponse = z.infer<typeof timelineEventResponseSchema>;
export type TimelineAmbiguityResponse = z.infer<typeof timelineAmbiguityResponseSchema>;
export type TimelineResponse = z.infer<typeof timelineResponseSchema>;

export type CustodyEntryResponse = z.infer<typeof custodyEntryResponseSchema>;
export type EvidenceItemResponse = z.infer<typeof evidenceItemResponseSchema>;
export type EvidenceResponse = z.infer<typeof evidenceResponseSchema>;

export type FindingResponse = z.infer<typeof findingResponseSchema>;
export type FindingsResponse = z.infer<typeof findingsResponseSchema>;

export type CorrelationResponse = z.infer<typeof correlationResponseSchema>;
export type CorrelationsResponse = z.infer<typeof correlationsResponseSchema>;

export type SuggestionResponse = z.infer<typeof suggestionResponseSchema>;
export type SuggestionsResponse = z.infer<typeof suggestionsResponseSchema>;

export type ReviewRequest = z.infer<typeof reviewRequestSchema>;
export type ReviewResponse = z.infer<typeof reviewResponseSchema>;
