/**
 * The case TIMELINE view (/timeline) — the forensically most careful screen in the console. It
 * renders the REAL, Zod-validated `/timeline` payload as a plain table on a UTC axis and refuses to
 * draw a clean lie: rows are fixed in UTC order (no order-breaking column sort), and events the
 * backend will not sequence are bracketed into a shared Group so row position asserts NO order.
 *
 * The case graph is fetched alongside as a BEST-EFFORT enrichment only: it resolves linked entity
 * ids to real values. If the graph fails or is empty the timeline still renders fully (ids show raw),
 * so a graph problem can never take down the timeline.
 */
import * as React from 'react';

import { useGraph, useTimeline } from '@/api/queries';
import { CaseScoped } from '@/components/common/CaseScoped';
import { QueryBoundary } from '@/components/common/QueryBoundary';
import { Card } from '@/components/ui/card';
import type { GraphResponse, TimelineResponse } from '@/types/api';

import {
  buildTimelineLayout,
  type EntityResolver,
  type ResolvedEntity,
} from './timelineModel';
import { TimelineTable } from './TimelineTable';

/** Loading skeleton — a framed table shell with pulsing rows, never a blank frame or a fake order. */
function TimelineSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="h-6 w-64 animate-pulse rounded bg-surface-3" />
      <div className="overflow-hidden rounded-md border border-border">
        <div className="h-9 w-full animate-pulse bg-surface-2" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-11 w-full animate-pulse border-t border-border/50 bg-surface-1/40" />
        ))}
      </div>
      <span className="text-center text-caption text-muted-foreground">Loading case timeline…</span>
    </div>
  );
}

/** Build an entity-id → real-entity resolver from the (best-effort) graph projection. */
function useEntityResolver(graph: GraphResponse | undefined): EntityResolver {
  return React.useMemo(() => {
    const byId = new Map<number, ResolvedEntity>();
    for (const n of graph?.nodes ?? []) {
      byId.set(n.entity_id, {
        entity_id: n.entity_id,
        entity_type: n.entity_type,
        value: n.value,
        tier: n.tier,
      });
    }
    return (id: number) => byId.get(id);
  }, [graph]);
}

function TimelineBody({
  timeline,
  graph,
}: {
  timeline: TimelineResponse;
  graph: GraphResponse | undefined;
}) {
  const layout = React.useMemo(
    () => buildTimelineLayout(timeline.events, timeline.ambiguities),
    [timeline.events, timeline.ambiguities],
  );
  const resolver = useEntityResolver(graph);

  return (
    <Card className="p-4">
      <TimelineTable layout={layout} resolver={resolver} />
    </Card>
  );
}

function TimelineQuery({ caseId }: { caseId: number }) {
  const timeline = useTimeline(caseId);
  const graph = useGraph(caseId); // best-effort entity resolution; failures degrade gracefully

  if (timeline.isPending) return <TimelineSkeleton />;
  return (
    <QueryBoundary
      query={timeline}
      loadingMessage="Loading case timeline…"
      isEmpty={(d) => d.events.length === 0}
      emptyTitle="No timeline events for this case yet"
      emptyMessage="No events have been reconciled onto a UTC axis for this case. When modules emit dated events, they appear here in UTC order with any timing ambiguity surfaced."
    >
      {(data) => <TimelineBody timeline={data} graph={graph.data} />}
    </QueryBoundary>
  );
}

/** Timeline — the case's events as a plain table on a UTC axis, with timing uncertainty surfaced. */
export function TimelinePage() {
  return (
    <CaseScoped kicker="Correlation" title="Timeline">
      {(caseId) => <TimelineQuery caseId={caseId} />}
    </CaseScoped>
  );
}
