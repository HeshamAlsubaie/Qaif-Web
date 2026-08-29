/**
 * The case GRAPH view (/graph) — the console's centerpiece: the case as an explorable network,
 * rendered from the REAL, Zod-validated graph payload for the loaded case (never fabricated).
 *
 * Forensic discipline carried here:
 *   - R4 tier separation is rendered in graph-space (solid cyan vs dashed amber; see graphStyle.ts);
 *   - the three data states stay distinct (loading skeleton / error / honest empty), via QueryBoundary;
 *   - the detail panel shows only real fields and flags orphans / missing provenance honestly.
 */
import * as React from 'react';

import { useGraph } from '@/api/queries';
import { CaseScoped } from '@/components/common/CaseScoped';
import { QueryBoundary } from '@/components/common/QueryBoundary';
import { Card } from '@/components/ui/card';
import type { GraphResponse } from '@/types/api';

import { DiamondGraph } from '@/features/diamond/DiamondGraph';

import { GraphCanvas, type GraphCanvasHandle } from './GraphCanvas';
import { GraphDetailPanel, type GraphSelection } from './GraphDetailPanel';
import { GraphLegend } from './GraphLegend';
import { GraphToolbar } from './GraphToolbar';
import { GRAPH_LAYOUTS, type GraphLayoutName } from './graphStyle';

/** Loading skeleton — a framed placeholder, never a frozen empty canvas. */
function GraphSkeleton() {
  return (
    <div className="flex h-[68vh] min-h-[520px] flex-col gap-4 p-6">
      <div className="h-8 w-64 animate-pulse rounded bg-surface-3" />
      <div className="relative flex-1 overflow-hidden rounded-lg border border-border bg-surface-0">
        <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-10 opacity-40">
          <span className="size-12 animate-pulse rounded-full border-[3px] border-confirmed/60 bg-surface-2" />
          <span className="h-0.5 w-24 animate-pulse bg-surface-3" />
          <span className="size-12 animate-pulse rounded-full border-[3px] border-dashed border-probabilistic/60 bg-surface-2" />
        </div>
        <span className="absolute inset-x-0 bottom-6 text-center text-caption text-muted-foreground">
          Loading case graph…
        </span>
      </div>
    </div>
  );
}

function GraphBody({ graph }: { graph: GraphResponse }) {
  const [layout, setLayout] = React.useState<GraphLayoutName>('cose');
  const [selection, setSelection] = React.useState<GraphSelection | null>(null);
  const canvasRef = React.useRef<GraphCanvasHandle>(null);

  const closePanel = React.useCallback(() => {
    setSelection(null);
    canvasRef.current?.clearSelection();
  }, []);

  // "Diamond" is the one layout that also sets node SCOPE: it renders the shared diamond component
  // over the 4-vertex subset (not the full graph). Force/Hierarchy/Grid keep operating on the full
  // graph via the GraphCanvas. The diamond self-fits and shows its own tier legend, so the canvas
  // controls (fit/zoom/re-run) and the graph's detail panel are hidden in that mode.
  const isDiamond = layout === 'diamond';

  return (
    <div className="flex flex-col gap-3">
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 p-3">
          <GraphToolbar
            layout={layout}
            layouts={GRAPH_LAYOUTS}
            onLayoutChange={setLayout}
            onFit={() => canvasRef.current?.fit()}
            onResetZoom={() => canvasRef.current?.resetZoom()}
            onRerun={() => canvasRef.current?.runLayout()}
            showCanvasControls={!isDiamond}
          />
          <span className="text-caption text-muted-foreground">
            {isDiamond ? (
              'Diamond lens — the 4-vertex intrusion subset of this graph'
            ) : (
              <>
                {graph.nodes.length} {graph.nodes.length === 1 ? 'entity' : 'entities'} ·{' '}
                {graph.edges.length} {graph.edges.length === 1 ? 'relationship' : 'relationships'}
              </>
            )}
          </span>
        </div>

        {layout === 'diamond' ? (
          <div className="p-3">
            <DiamondGraph graph={graph} stageClassName="h-[64vh] min-h-[520px]" />
          </div>
        ) : (
          /* The canvas stage. Legend overlays bottom-left; the detail panel slides in from the right. */
          <div className="console-grid relative h-[68vh] min-h-[520px] w-full bg-surface-0">
            <GraphCanvas
              ref={canvasRef}
              graph={graph}
              layout={layout}
              onSelectNode={(node) => setSelection({ kind: 'node', node })}
              onSelectEdge={(edge) => setSelection({ kind: 'edge', edge })}
              onSelectNone={() => setSelection(null)}
            />

            <div className="absolute bottom-4 left-4 z-10">
              <GraphLegend />
            </div>

            {selection && (
              <GraphDetailPanel selection={selection} graph={graph} onClose={closePanel} />
            )}
          </div>
        )}
      </Card>

      {!isDiamond && (
        <p className="px-1 text-micro text-muted-foreground">
          Tier is carried by the element itself — solid cyan (confirmed) vs dashed amber
          (probabilistic) — not by a label, so an inferred link can never be mistaken for a confirmed
          one. Click any node or edge for its real record. Nothing here is fabricated.
        </p>
      )}
    </div>
  );
}

function GraphQuery({ caseId }: { caseId: number }) {
  const graph = useGraph(caseId);
  // A skeleton for the initial load — a framed placeholder, never a frozen empty canvas. Error and
  // empty stay distinct below (QueryBoundary), so "failed to load" is never dressed as "no graph".
  if (graph.isPending) return <GraphSkeleton />;
  return (
    <QueryBoundary
      query={graph}
      loadingMessage="Loading case graph…"
      isEmpty={(d) => d.nodes.length === 0}
      emptyTitle="This case has no graph yet"
      emptyMessage="No entities or relationships have been correlated into a graph for this case. When modules produce entities, they appear here as a network."
    >
      {(data) => <GraphBody graph={data} />}
    </QueryBoundary>
  );
}

/** Graph — the interactive case network. */
export function GraphPage() {
  return (
    <CaseScoped
      kicker="Correlation"
      title="Graph"
      sub="The case as an explorable network — entities and their relationships, tier-styled."
    >
      {(caseId) => <GraphQuery caseId={caseId} />}
    </CaseScoped>
  );
}
