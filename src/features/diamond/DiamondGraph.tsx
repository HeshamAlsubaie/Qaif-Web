/**
 * The shared Diamond Model renderer — the ONE implementation used by BOTH entry points (the Overview
 * panel and the Graph view's "Diamond" layout). It builds the Diamond subset from the case graph and
 * draws it via {@link DiamondCanvas}, overlaying the tier legend, a scope disclosure, and Fit.
 *
 * SCOPE RULE (intentional, documented): the Diamond ALWAYS shows the DIAMOND-SCOPED SUBSET — only the
 * high-level entities that map to the four vertices (see diamondModel.ts), NOT the full graph. A
 * diamond of every node would be meaningless: the Diamond Model IS the 4-vertex intrusion picture.
 * The scope badge discloses "N of {total} entities" so the subsetting is explicit, never silent.
 *
 * This is CASE DATA, not external intel — no external-claim badge. The honesty is the TIER: every
 * entity and relationship keeps its confirmed/probabilistic tier in the graph's exact solid-cyan /
 * dashed-amber grammar (survives a grayscale print). Read-only; nothing is fabricated.
 */
import { Gem, Info, Maximize2 } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { GraphLegend } from '@/features/graph/GraphLegend';
import { cn } from '@/lib/utils';
import type { GraphResponse } from '@/types/api';

import { DiamondCanvas, type DiamondCanvasHandle } from './DiamondCanvas';
import { buildDiamondModel } from './diamondModel';

function UnclassifiedNote({ types }: { types: string[] }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-border bg-surface-2 px-3 py-2.5 text-caption text-muted-foreground">
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>
        {types.length} entity {types.length === 1 ? 'type is' : 'types are'} not part of the
        Diamond's four vertices and {types.length === 1 ? 'is' : 'are'} left off it rather than
        forced onto a vertex: <span className="font-mono text-foreground">{types.join(', ')}</span>.
      </span>
    </div>
  );
}

interface DiamondGraphProps {
  graph: GraphResponse;
  /** Height utility for the canvas stage — a graph needs vertical room; callers size it. */
  stageClassName?: string;
}

/** The shared Diamond panel: scoped subset drawn on the four vertices, tier-preserved. */
export function DiamondGraph({ graph, stageClassName }: DiamondGraphProps) {
  const model = React.useMemo(() => buildDiamondModel(graph), [graph]);
  const canvasRef = React.useRef<DiamondCanvasHandle>(null);

  const placed = model.placedIds.size;
  const unclassifiedTypes = React.useMemo(
    () => [...new Set(model.unclassified.map((n) => n.entity_type))].sort(),
    [model.unclassified],
  );

  return (
    <div className="flex flex-col gap-3">
      <div
        className={cn(
          'console-grid relative w-full overflow-hidden rounded-lg border border-border bg-surface-0',
          stageClassName ?? 'h-[62vh] min-h-[480px]',
        )}
      >
        <DiamondCanvas ref={canvasRef} model={model} />

        {/* Scope disclosure (top-left): the Diamond is a SUBSET of the graph, stated explicitly. */}
        <div className="pointer-events-none absolute left-4 top-4 z-10 max-w-[min(90%,40rem)] rounded-md border border-border bg-surface-1/90 px-2.5 py-1.5 text-micro text-muted-foreground backdrop-blur">
          <span className="inline-flex items-center gap-1.5">
            <Gem className="size-3.5" aria-hidden />
            <span className="font-medium text-foreground">Diamond scope</span>
          </span>{' '}
          · {placed} of {graph.nodes.length.toLocaleString()} entities mapped to the 4 vertices ·{' '}
          {model.edges.length} {model.edges.length === 1 ? 'relationship' : 'relationships'}
        </div>

        <div className="absolute right-4 top-4 z-10">
          <Button
            variant="outline"
            size="sm"
            onClick={() => canvasRef.current?.fit()}
            title="Fit the diagram"
          >
            <Maximize2 aria-hidden />
            Fit
          </Button>
        </div>

        <div className="absolute bottom-4 left-4 z-10">
          <GraphLegend />
        </div>
      </div>

      {unclassifiedTypes.length > 0 && <UnclassifiedNote types={unclassifiedTypes} />}

      <p className="px-1 text-micro text-muted-foreground">
        The four vertices of the Diamond Model of Intrusion Analysis, drawn from the case graph — an
        interim mapping of existing entities into Adversary / Capability / Infrastructure / Victim
        (the documented <span className="font-mono">VERTEX_FOR_TYPE</span> table); a type not in it
        is disclosed, never forced onto a vertex. Every entity and relationship keeps its own tier —
        solid cyan (confirmed) vs dashed amber (probabilistic), the same encoding as the correlation
        graph. Attribution (Adversary, Capability) is typically probabilistic while observed
        infrastructure and the named victim are typically confirmed; the diagram lets that show and
        never launders a suspected adversary into a confirmed one. Read-only — nothing is fabricated.
      </p>
    </div>
  );
}
