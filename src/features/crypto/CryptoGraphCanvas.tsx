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
import cytoscape, { type Core, type ElementDefinition, type EventObject } from 'cytoscape';
import * as React from 'react';

import {
  cryptoNodeId,
  hiddenChildCount,
  type CryptoGraphEdge,
  type CryptoGraphModel,
  type CryptoGraphNode,
} from './cryptoGraph';
import { buildCryptoLayout, buildCryptoStylesheet } from './cryptoGraphStyle';
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

  const handlers = React.useRef({ onNodeTap, onEdgeTap, onBackgroundTap });
  handlers.current = { onNodeTap, onEdgeTap, onBackgroundTap };

  const rootIds = React.useMemo(() => model.rootIds.map(cryptoNodeId), [model]);

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
    cy.layout(buildCryptoLayout(layout, rootIds)).run();
    skipUpdate.current = true;

    cy.on('tap', 'node', (evt: EventObject) => {
      handlers.current.onNodeTap(evt.target.data('node') as CryptoGraphNode);
    });
    cy.on('tap', 'edge', (evt: EventObject) => {
      handlers.current.onEdgeTap(evt.target.data('edge') as CryptoGraphEdge);
    });
    cy.on('tap', (evt: EventObject) => {
      if (evt.target === cy) {
        cy.elements().unselect();
        handlers.current.onBackgroundTap();
      }
    });

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model]);

  // Re-apply visibility (progressive expand/collapse) + re-run layout when the visible set or the
  // chosen layout changes. Not on the mount render, and never on an unrelated re-render.
  React.useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    if (skipUpdate.current) {
      skipUpdate.current = false;
      return;
    }
    applyVisibility(cy, model, visibleIds);
    cy.layout(buildCryptoLayout(layout, rootIds)).run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleIds, layout]);

  React.useImperativeHandle(ref, () => ({
    fit: () => {
      const cy = cyRef.current;
      if (cy) cy.animate({ fit: { eles: cy.elements(':visible'), padding: 48 } }, { duration: 250 });
    },
    resetZoom: () => {
      const cy = cyRef.current;
      if (cy) cy.animate({ zoom: 1, center: { eles: cy.elements(':visible') } }, { duration: 250 });
    },
    runLayout: () => {
      cyRef.current?.layout(buildCryptoLayout(layout, rootIds)).run();
    },
    clearSelection: () => {
      cyRef.current?.elements().unselect();
    },
  }));

  return <div ref={containerRef} className="size-full" />;
});
