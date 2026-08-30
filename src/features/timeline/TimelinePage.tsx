/**
 * The case TIMELINE view (/timeline) — the forensically most careful screen in the console. It
 * renders the REAL, Zod-validated `/timeline` payload on a UTC axis and refuses to draw a clean lie:
 * uncertain order looks uncertain (unordered bands), assumed timezones are flagged, clock skew is
 * marked, and R8's original-vs-UTC distinction is one click away. Nothing is fabricated.
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
  type TimelineEventNode,
} from './timelineModel';
import { TimelineDetailPanel } from './TimelineDetailPanel';
import { TimelineLegend } from './TimelineLegend';
import { TimelineView } from './TimelineView';

/** Loading skeleton — a framed rail with pulsing rows, never a blank frame or a fake sequence. */
function TimelineSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="h-6 w-64 animate-pulse rounded bg-surface-3" />
      <div className="flex flex-col gap-6">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-start gap-4">
            <div className="h-8 w-[8.5rem] shrink-0 animate-pulse rounded bg-surface-2" />
            <div className="relative flex w-8 shrink-0 justify-center">
              <span className="absolute inset-y-0 w-px bg-border" />
              <span className="relative mt-1.5 size-3 animate-pulse rounded-full bg-surface-3" />
            </div>
            <div className="h-16 flex-1 animate-pulse rounded-lg bg-surface-2" />
          </div>
        ))}
      </div>
      <span className="text-center text-caption text-muted-foreground">
        Loading case timeline…
      </span>
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
  const [selectedKey, setSelectedKey] = React.useState<string | null>(null);

  // Flatten every slot's nodes so the detail panel can resolve the selected key to its live node.
  const nodeByKey = React.useMemo(() => {
    const map = new Map<string, TimelineEventNode>();
    for (const slot of layout.slots) {
      if (slot.kind === 'single') map.set(slot.node.event.event_key, slot.node);
      else for (const node of slot.nodes) map.set(node.event.event_key, node);
    }
    return map;
  }, [layout]);

  const selected = selectedKey ? nodeByKey.get(selectedKey) ?? null : null;

  const ambiguityCount = timeline.ambiguities.length;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_19rem]">
      <Card className="order-2 overflow-hidden lg:order-1">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 p-3">
          <span className="text-caption text-muted-foreground">
            {timeline.events.length} {timeline.events.length === 1 ? 'event' : 'events'} on the UTC
            axis · {ambiguityCount} {ambiguityCount === 1 ? 'ambiguity' : 'ambiguities'} surfaced
          </span>
          {layout.presentKinds.length === 0 && (
            <span className="rounded border border-border bg-surface-2 px-2 py-0.5 text-micro text-muted-foreground">
              No timing ambiguity in this case's events
            </span>
          )}
        </div>

        <div className="relative">
          <div className="max-h-[72vh] overflow-y-auto p-4 pr-6">
            <TimelineView
              layout={layout}
              resolver={resolver}
              selectedKey={selectedKey}
              onSelect={(node) => setSelectedKey(node.event.event_key)}
            />
          </div>
          {selected && (
            <TimelineDetailPanel
              node={selected}
              resolver={resolver}
              onClose={() => setSelectedKey(null)}
            />
          )}
        </div>
      </Card>

      <div className="order-1 flex flex-col gap-3 lg:sticky lg:top-4 lg:order-2 lg:self-start">
        <TimelineLegend presentKinds={layout.presentKinds} />
      </div>
    </div>
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
      emptyMessage="No events have been reconciled onto a UTC axis for this case. When modules emit dated events, they appear here in chronological order with any timing ambiguity surfaced."
    >
      {(data) => <TimelineBody timeline={data} graph={graph.data} />}
    </QueryBoundary>
  );
}

/** Timeline — the case's events on a UTC axis, with timing uncertainty rendered visibly. */
export function TimelinePage() {
  return (
    <CaseScoped kicker="Correlation" title="Timeline">
      {(caseId) => <TimelineQuery caseId={caseId} />}
    </CaseScoped>
  );
}
