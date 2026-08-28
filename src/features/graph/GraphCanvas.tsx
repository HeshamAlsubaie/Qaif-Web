/**
 * The Cytoscape mount. Cytoscape is imperative (it owns a <canvas>), so this component keeps the
 * instance in a ref and talks to it directly; React only feeds it data + the chosen layout and
 * receives selection events back. The graph is laid out ONCE on data change and ONCE on layout
 * change — never on every render — so panning/selecting never triggers a re-layout.
 *
 * Selection is Cytoscape-owned (`:selected`); React mirrors only the picked record for the panel.
 */
import cytoscape, { type Core, type EventObject } from 'cytoscape';
import * as React from 'react';

import type { GraphEdge, GraphNode, GraphResponse } from '@/types/api';

import { toElements } from './graphModel';
import { buildLayout, buildStylesheet, type LayoutName } from './graphStyle';

export interface GraphCanvasHandle {
  fit: () => void;
  resetZoom: () => void;
  runLayout: () => void;
  clearSelection: () => void;
}

interface GraphCanvasProps {
  graph: GraphResponse;
  layout: LayoutName;
  onSelectNode: (node: GraphNode) => void;
  onSelectEdge: (edge: GraphEdge) => void;
  onSelectNone: () => void;
}

export const GraphCanvas = React.forwardRef<GraphCanvasHandle, GraphCanvasProps>(
  function GraphCanvas({ graph, layout, onSelectNode, onSelectEdge, onSelectNone }, ref) {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const cyRef = React.useRef<Core | null>(null);

    // Keep the latest callbacks in a ref so the init effect can stay mount-only.
    const handlers = React.useRef({ onSelectNode, onSelectEdge, onSelectNone });
    handlers.current = { onSelectNode, onSelectEdge, onSelectNone };

    // Skip the layout effect's first run — the data effect already lays out on mount.
    const skipLayoutEffect = React.useRef(true);

    // Init once.
    React.useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const cy = cytoscape({
        container,
        elements: toElements(graph),
        style: buildStylesheet(),
        layout: buildLayout(layout),
        minZoom: 0.2,
        maxZoom: 3,
        wheelSensitivity: 0.2,
        boxSelectionEnabled: false,
      });
      cyRef.current = cy;

      cy.on('tap', 'node', (evt: EventObject) => {
        handlers.current.onSelectNode(evt.target.data('node') as GraphNode);
      });
      cy.on('tap', 'edge', (evt: EventObject) => {
        handlers.current.onSelectEdge(evt.target.data('edge') as GraphEdge);
      });
      cy.on('tap', (evt: EventObject) => {
        if (evt.target === cy) {
          cy.elements().unselect();
          handlers.current.onSelectNone();
        }
      });

      return () => {
        cy.destroy();
        cyRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Replace elements + re-layout when the graph itself changes (new case). Not on every render.
    React.useEffect(() => {
      const cy = cyRef.current;
      if (!cy) return;
      cy.batch(() => {
        cy.elements().remove();
        cy.add(toElements(graph));
      });
      cy.layout(buildLayout(layout)).run();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [graph]);

    // Re-run layout when the user picks a different layout (skip the mount run).
    React.useEffect(() => {
      const cy = cyRef.current;
      if (!cy) return;
      if (skipLayoutEffect.current) {
        skipLayoutEffect.current = false;
        return;
      }
      cy.layout(buildLayout(layout)).run();
    }, [layout]);

    React.useImperativeHandle(ref, () => ({
      fit: () => {
        const cy = cyRef.current;
        if (cy) cy.animate({ fit: { eles: cy.elements(), padding: 48 } }, { duration: 250 });
      },
      resetZoom: () => {
        const cy = cyRef.current;
        if (cy) cy.animate({ zoom: 1, center: { eles: cy.elements() } }, { duration: 250 });
      },
      runLayout: () => {
        cyRef.current?.layout(buildLayout(layout)).run();
      },
      clearSelection: () => {
        cyRef.current?.elements().unselect();
      },
    }));

    return <div ref={containerRef} className="size-full" />;
  },
);
