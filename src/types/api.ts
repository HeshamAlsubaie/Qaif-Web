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
  cryptoOriginSchema,
  cryptoTraceFindingSchema,
  cryptoTraceResponseSchema,
  cryptoTraceSummarySchema,
  cryptoTransactionSchema,
  cryptoWalletSchema,
  cveNvdMetadataSchema,
  cveOtxContextSchema,
  cveVtContextSchema,
  custodyEntryResponseSchema,
  evidenceItemResponseSchema,
  evidenceResponseSchema,
  findingResponseSchema,
  findingsResponseSchema,
  graphEdgeSchema,
  graphNodeSchema,
  graphResponseSchema,
  healthResponseSchema,
  lookupResponseSchema,
  lookupSourceResultSchema,
  matchEntityHitSchema,
  matchResponseSchema,
  reportResponseSchema,
  reviewRequestSchema,
  reviewResponseSchema,
  searchResponseSchema,
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

export type CryptoOrigin = z.infer<typeof cryptoOriginSchema>;
export type CryptoWallet = z.infer<typeof cryptoWalletSchema>;
export type CryptoTransaction = z.infer<typeof cryptoTransactionSchema>;
export type CryptoTraceFinding = z.infer<typeof cryptoTraceFindingSchema>;
export type CryptoTraceSummary = z.infer<typeof cryptoTraceSummarySchema>;
export type CryptoTraceResponse = z.infer<typeof cryptoTraceResponseSchema>;

export type SuggestionResponse = z.infer<typeof suggestionResponseSchema>;
export type SuggestionsResponse = z.infer<typeof suggestionsResponseSchema>;

export type ReviewRequest = z.infer<typeof reviewRequestSchema>;
export type ReviewResponse = z.infer<typeof reviewResponseSchema>;

export type ReportResponse = z.infer<typeof reportResponseSchema>;

export type LookupSourceResult = z.infer<typeof lookupSourceResultSchema>;
export type LookupResponse = z.infer<typeof lookupResponseSchema>;

export type MatchEntityHit = z.infer<typeof matchEntityHitSchema>;
export type MatchResponse = z.infer<typeof matchResponseSchema>;

export type CveNvdMetadata = z.infer<typeof cveNvdMetadataSchema>;
export type CveOtxContext = z.infer<typeof cveOtxContextSchema>;
export type CveVtContext = z.infer<typeof cveVtContextSchema>;

export type SearchResponse = z.infer<typeof searchResponseSchema>;
export type SearchCaseHit = SearchResponse['cases'][number];
export type SearchEvidenceHit = SearchResponse['evidence'][number];
export type SearchEntityHit = SearchResponse['entities'][number];
// A confirmed and a probabilistic hit differ only by their pinned `tier` literal; the union is the
// row type shared by the two rendering groups.
export type SearchFindingHit =
  SearchResponse['findings_confirmed'][number] | SearchResponse['findings_probabilistic'][number];
