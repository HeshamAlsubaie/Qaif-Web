/**
 * The GRAPH MODE of the Crypto view — a MetaSleuth/Chainalysis-style interactive funds-flow graph
 * over the SAME `/crypto` payload the story mode reads (no refetch). It reuses the case graph's
 * engine wholesale: the reused GraphToolbar for layout/zoom, the shared Cytoscape stylesheet + token
 * palette (via cryptoGraphStyle), and the same detail-panel grammar.
 *
 * The interaction is progressive reveal: the initial render is the sanctioned origin + its direct
 * (hop-1) counterparties only; hop-2's hundreds of nodes stay hidden until a node is clicked, which
 * reveals ITS children from the already-loaded data and opens its details. Click again to collapse.
 */
import { ListTree } from 'lucide-react';
import * as React from 'react';

import { GraphToolbar } from '@/features/graph/GraphToolbar';
import { type LayoutName } from '@/features/graph/graphStyle';
import { EmptyState } from '@/components/common/States';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { CryptoTraceResponse } from '@/types/api';

import {
  buildCryptoGraph,
  computeVisibleNodes,
  type CryptoGraphEdge,
  type CryptoGraphNode,
} from './cryptoGraph';
import { CryptoGraphCanvas, type CryptoGraphCanvasHandle } from './CryptoGraphCanvas';
import { CryptoGraphDetailPanel, type CryptoGraphSelection } from './CryptoGraphDetailPanel';
import { CryptoGraphLegend } from './CryptoGraphLegend';

export function CryptoGraphView({ data }: { data: CryptoTraceResponse }) {
  const model = React.useMemo(() => buildCryptoGraph(data), [data]);

  const [layout, setLayout] = React.useState<LayoutName>('breadthfirst');
  const [expanded, setExpanded] = React.useState<Set<number>>(() => new Set(model.rootIds));
  const [selection, setSelection] = React.useState<CryptoGraphSelection | null>(null);
  const canvasRef = React.useRef<CryptoGraphCanvasHandle>(null);

  // New case → new model: reset the reveal to origin + hop-1 and drop any open panel.
  React.useEffect(() => {
    setExpanded(new Set(model.rootIds));
    setSelection(null);
  }, [model]);

  const visibleIds = React.useMemo(() => computeVisibleNodes(model, expanded), [model, expanded]);

  const toggleExpand = React.useCallback((id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleNodeTap = React.useCallback(
    (node: CryptoGraphNode) => {
      setSelection({ kind: 'node', node });
      // Expandable if it has counterparties in EITHER direction (matches the canvas `+N`).
      if ((model.neighborsOf.get(node.entityId)?.length ?? 0) > 0) toggleExpand(node.entityId);
    },
    [model, toggleExpand],
  );

  const handleEdgeTap = React.useCallback(
    (edge: CryptoGraphEdge) => setSelection({ kind: 'edge', edge }),
    [],
  );

  const closePanel = React.useCallback(() => {
    setSelection(null);
    canvasRef.current?.clearSelection();
  }, []);

  const resetReveal = React.useCallback(() => {
    setExpanded(new Set(model.rootIds));
  }, [model]);

  if (model.nodes.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={ListTree}
          title="Nothing to graph"
          message="This trace resolved no wallets to plot. The story view above still shows the raw trace."
        />
      </Card>
    );
  }

  const visibleEdgeCount = model.edges.reduce(
    (acc, e) => (visibleIds.has(e.sourceId) && visibleIds.has(e.targetId) ? acc + 1 : acc),
    0,
  );

  return (
    <div className="flex flex-col gap-3">
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <GraphToolbar
              layout={layout}
              onLayoutChange={setLayout}
              onFit={() => canvasRef.current?.fit()}
              onResetZoom={() => canvasRef.current?.resetZoom()}
              onRerun={() => canvasRef.current?.runLayout()}
            />
            <div className="mx-1 h-5 w-px bg-border" aria-hidden />
            <Button variant="outline" size="sm" onClick={resetReveal} title="Collapse back to origin + hop-1">
              <ListTree aria-hidden />
              Reset reveal
            </Button>
          </div>
          <span className="text-caption text-muted-foreground">
            {visibleIds.size.toLocaleString()} of {model.nodes.length.toLocaleString()} wallets shown
            · {visibleEdgeCount.toLocaleString()} flows
          </span>
        </div>

        {/* The canvas stage. Legend overlays bottom-left; the detail panel slides in from the right. */}
        <div className="console-grid relative h-[68vh] min-h-[520px] w-full bg-surface-0">
          <CryptoGraphCanvas
            ref={canvasRef}
            model={model}
            visibleIds={visibleIds}
            layout={layout}
            onNodeTap={handleNodeTap}
            onEdgeTap={handleEdgeTap}
            onBackgroundTap={() => setSelection(null)}
          />

          <div className="absolute bottom-4 left-4 z-10">
            <CryptoGraphLegend />
          </div>

          {selection && (
            <CryptoGraphDetailPanel
              selection={selection}
              model={model}
              expanded={expanded}
              onToggleExpand={toggleExpand}
              onClose={closePanel}
            />
          )}
        </div>
      </Card>

      <p className="px-1 text-micro text-muted-foreground">
        Progressive reveal: the origin and its direct (hop-1) counterparties are shown; deeper hops
        stay hidden until you click a node to reveal the wallets it funded — from the trace already
        loaded, never a new fetch. Node size and fade encode confidence (it decays per hop); arrows
        show money flowing outward. Everything is probabilistic (R4) — a trace is an indicator, not
        confirmed evidence.
      </p>
    </div>
  );
}
