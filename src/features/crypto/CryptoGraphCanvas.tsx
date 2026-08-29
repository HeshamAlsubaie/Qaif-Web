/**
 * The crypto funds-flow Cytoscape mount — same architecture as the case GraphCanvas (imperative
 * instance held in a ref; React feeds data + layout and receives taps back), specialised for a
 * PROGRESSIVE, MetaSleuth-style reveal:
 *
 *   - every node/edge of the trace is added ONCE, but only the currently-visible subset is displayed
 *     (`display: element | none`), so expanding a branch never refetches or rebuilds elements;
 *   - a node with hidden children carries a live `+N` affordance and a heavier ring;
 *   - the layout re-runs only when the visible set or the chosen layout changes — never per render.
 *
 * All styling (tier grammar, confidence-decay sizing, root marker) lives in cryptoGraphStyle.ts.
 */
import cytoscape, {
  type Core,
  type ElementDefinition,
  type EventObject,
  type Layouts,
} from 'cytoscape';
import * as React from 'react';

import {
  cryptoNodeId,
  hiddenChildCount,
  type CryptoGraphEdge,
  type CryptoGraphModel,
  type CryptoGraphNode,
} from './cryptoGraph';
import {
  buildCryptoLayout,
  buildCryptoStylesheet,
  buildLayeredLayout,
  computeLayeredPositions,
} from './cryptoGraphStyle';
import { shortenMiddle } from './cryptoModel';
import type { LayoutName } from '@/features/graph/graphStyle';

export interface CryptoGraphCanvasHandle {
  fit: () => void;
  resetZoom: () => void;
  runLayout: () => void;
  clearSelection: () => void;
}

interface CryptoGraphCanvasProps {
  model: CryptoGraphModel;
  /** Node ids to display now (edges show when both endpoints are visible). */
  visibleIds: ReadonlySet<number>;
  layout: LayoutName;
  onNodeTap: (node: CryptoGraphNode) => void;
  onEdgeTap: (edge: CryptoGraphEdge) => void;
  onBackgroundTap: () => void;
}

/** All elements for the trace, built once. Visibility is applied afterwards, never by re-adding. */
function toCryptoElements(model: CryptoGraphModel): ElementDefinition[] {
  const nodes: ElementDefinition[] = model.nodes.map((n) => ({
    group: 'nodes',
    data: {
      id: cryptoNodeId(n.entityId),
      label: shortenMiddle(n.address),
      tier: 'probabilistic',
      root: n.isRoot ? 1 : 0,
      hop: n.hop,
      confidence: n.confidence ?? 0.4,
      shape: n.isRoot ? 'octagon' : 'diamond',
      hiddenChildren: 0,
      node: n,
    },
  }));
  const edges: ElementDefinition[] = model.edges.map((e) => ({
    group: 'edges',
    data: {
      id: e.id,
      source: cryptoNodeId(e.sourceId),
      target: cryptoNodeId(e.targetId),
      tier: 'probabilistic',
      label: e.txCount > 1 ? `×${e.txCount}` : (e.rep.amount ?? ''),
      edge: e,
    },
  }));
  return [...nodes, ...edges];
}

/**
 * Start the right layout for the current mode, tracking it so it can be STOPPED on the next run or on
 * teardown. Stopping the previous layout is what prevents a destroyed instance from still receiving
 * animation ticks (the source of the `isHeadless` error flood). The default ("breadthfirst" in the
 * toolbar = "Hierarchy") is the layered LR-by-hop preset; Force/Grid reuse the base layouts.
 */
function startLayout(
  cy: Core,
  layoutRef: React.MutableRefObject<Layouts | null>,
  model: CryptoGraphModel,
  visibleIds: ReadonlySet<number>,
  layout: LayoutName,
): void {
  layoutRef.current?.stop();
  const options =
    layout === 'breadthfirst'
      ? buildLayeredLayout(computeLayeredPositions(model, visibleIds))
      : buildCryptoLayout(layout);
  const run = cy.layout(options);
  layoutRef.current = run;
  run.run();
}

/** Push display + `+N` labels for the current visible set onto the live instance (no re-add). */
function applyVisibility(cy: Core, model: CryptoGraphModel, visibleIds: ReadonlySet<number>): void {
  cy.batch(() => {
    for (const n of model.nodes) {
      const el = cy.getElementById(cryptoNodeId(n.entityId));
      if (el.empty()) continue;
      const visible = visibleIds.has(n.entityId);
      el.style('display', visible ? 'element' : 'none');
      const hidden = visible ? hiddenChildCount(model, n.entityId, visibleIds) : 0;
      el.data('hiddenChildren', hidden);
      const short = shortenMiddle(n.address);
      el.data('label', hidden > 0 ? `${short}  +${hidden}` : short);
    }
    for (const e of model.edges) {
      const el = cy.getElementById(e.id);
      if (el.empty()) continue;
      const visible = visibleIds.has(e.sourceId) && visibleIds.has(e.targetId);
      el.style('display', visible ? 'element' : 'none');
    }
  });
}

export const CryptoGraphCanvas = React.forwardRef<
  CryptoGraphCanvasHandle,
  CryptoGraphCanvasProps
>(function CryptoGraphCanvas(
  { model, visibleIds, layout, onNodeTap, onEdgeTap, onBackgroundTap },
  ref,
) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const cyRef = React.useRef<Core | null>(null);
  const layoutRef = React.useRef<Layouts | null>(null);

  const handlers = React.useRef({ onNodeTap, onEdgeTap, onBackgroundTap });
  handlers.current = { onNodeTap, onEdgeTap, onBackgroundTap };

  // Keep the latest data/layout in a ref so the mount-only effect and the imperative handle always
  // read current values without re-initialising the instance.
  const state = React.useRef({ model, visibleIds, layout });
  state.current = { model, visibleIds, layout };

  // Skip the update effect's first run — the mount effect already applies visibility + lays out.
  const skipUpdate = React.useRef(true);

  // Init once per model.
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const cy = cytoscape({
      container,
      elements: toCryptoElements(model),
      style: buildCryptoStylesheet(),
      minZoom: 0.15,
      maxZoom: 3,
      wheelSensitivity: 0.2,
      boxSelectionEnabled: false,
    });
    cyRef.current = cy;

    applyVisibility(cy, model, visibleIds);
    startLayout(cy, layoutRef, model, visibleIds, layout);
    skipUpdate.current = true;

    // Guard every handler against a destroyed instance — a late tap must never touch a torn-down cy.
    cy.on('tap', 'node', (evt: EventObject) => {
      if (cy.destroyed()) return;
      handlers.current.onNodeTap(evt.target.data('node') as CryptoGraphNode);
    });
    cy.on('tap', 'edge', (evt: EventObject) => {
      if (cy.destroyed()) return;
      handlers.current.onEdgeTap(evt.target.data('edge') as CryptoGraphEdge);
    });
    cy.on('tap', (evt: EventObject) => {
      if (cy.destroyed()) return;
      if (evt.target === cy) {
        cy.elements().unselect();
        handlers.current.onBackgroundTap();
      }
    });

    return () => {
      // Ordered teardown: stop the running layout (halts its animation ticks), drop all listeners,
      // THEN destroy. Without stopping the layout first, its queued frames fire on a null instance —
      // the `isHeadless` error flood. cyRef is cleared so nothing else re-enters the dead instance.
      layoutRef.current?.stop();
      layoutRef.current = null;
      cy.removeAllListeners();
      cy.destroy();
      cyRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model]);

  // Re-apply visibility (progressive expand/collapse) + re-run layout when the visible set or the
  // chosen layout changes. Not on the mount render, and never on an unrelated re-render.
  React.useEffect(() => {
    const cy = cyRef.current;
    if (!cy || cy.destroyed()) return;
    if (skipUpdate.current) {
      skipUpdate.current = false;
      return;
    }
    applyVisibility(cy, model, visibleIds);
    startLayout(cy, layoutRef, model, visibleIds, layout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleIds, layout]);

  React.useImperativeHandle(ref, () => ({
    fit: () => {
      const cy = cyRef.current;
      if (cy && !cy.destroyed()) {
        cy.animate({ fit: { eles: cy.elements(':visible'), padding: 48 } }, { duration: 250 });
      }
    },
    resetZoom: () => {
      const cy = cyRef.current;
      if (cy && !cy.destroyed()) {
        cy.animate({ zoom: 1, center: { eles: cy.elements(':visible') } }, { duration: 250 });
      }
    },
    runLayout: () => {
      const cy = cyRef.current;
      if (cy && !cy.destroyed()) {
        const { model: m, visibleIds: v, layout: l } = state.current;
        startLayout(cy, layoutRef, m, v, l);
      }
    },
    clearSelection: () => {
      const cy = cyRef.current;
      if (cy && !cy.destroyed()) cy.elements().unselect();
    },
  }));

  return <div ref={containerRef} className="size-full" />;
});
