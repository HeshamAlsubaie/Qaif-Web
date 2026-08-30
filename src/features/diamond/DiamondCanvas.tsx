/**
 * The Diamond Model canvas — a FIXED four-vertex diagram, so it uses a Cytoscape `preset` layout
 * that drops each entity onto precomputed diamond coordinates (Adversary top, Victim bottom,
 * Capability left, Infrastructure right), never a force layout. It REUSES the correlation graph's
 * tier grammar wholesale (buildStylesheet + token): confirmed = solid cyan, probabilistic = dashed
 * amber, on BOTH nodes and edges — the same "survives a grayscale print" encoding. Zone labels are
 * canvas nodes (so they pan/zoom with the diagram), and a faint frame connects them into the rhombus.
 *
 * Lifecycle follows the crypto-graph fix: destroyed-guarded, listeners removed + destroyed cleanly on
 * unmount, and a ResizeObserver that re-fits — so no ticks ever fire on a torn-down instance.
 */
import cytoscape, { type Core, type ElementDefinition, type EventObject, type Layouts } from 'cytoscape';
import * as React from 'react';

import { entityVisual } from '@/features/graph/graphModel';
import { buildStylesheet, token } from '@/features/graph/graphStyle';
import type { Stylesheet } from 'cytoscape';
import type { GraphNode } from '@/types/api';

import {
  VERTEX_LABEL,
  VERTEX_ORDER,
  type DiamondModel,
  type DiamondVertexKey,
} from './diamondModel';

export interface DiamondCanvasHandle {
  fit: () => void;
  clearSelection: () => void;
}

interface DiamondCanvasProps {
  model: DiamondModel;
  /** Clicking a vertex entity surfaces THAT entity's record in the detail panel. */
  onSelectNode: (node: GraphNode) => void;
  /** Tapping empty canvas clears the selection. */
  onSelectNone: () => void;
}

// Diamond geometry (canvas units; `fit` scales it to the container). Wider than tall because entity
// labels are horizontal, and Infrastructure can stack many nodes down its side.
const WX = 520; // horizontal distance to the Capability/Infrastructure clusters
const HY = 300; // vertical distance to the Adversary/Victim clusters
const ROW = 74; // vertical spacing between stacked entities within a vertex

const CLUSTER: Record<DiamondVertexKey, { x: number; y: number }> = {
  adversary: { x: 0, y: -HY },
  victim: { x: 0, y: HY },
  capability: { x: -WX, y: 0 },
  infrastructure: { x: WX, y: 0 },
};

// Zone-label anchors sit just OUTSIDE their cluster, at the rhombus corners.
const LABEL: Record<DiamondVertexKey, { x: number; y: number }> = {
  adversary: { x: 0, y: -HY - 170 },
  victim: { x: 0, y: HY + 170 },
  capability: { x: -WX - 250, y: 0 },
  infrastructure: { x: WX + 250, y: 0 },
};

// The four rhombus sides, connecting the zone labels into the classic diamond frame.
const FRAME: [DiamondVertexKey, DiamondVertexKey][] = [
  ['adversary', 'capability'],
  ['capability', 'victim'],
  ['victim', 'infrastructure'],
  ['infrastructure', 'adversary'],
];

type Positions = Record<string, { x: number; y: number }>;

/** Build the diagram's elements + the AUTHORITATIVE diamond position map (exported for testing). */
export function buildDiagram(model: DiamondModel): {
  elements: ElementDefinition[];
  positions: Positions;
} {
  const els: ElementDefinition[] = [];
  // The AUTHORITATIVE position map, handed to the `preset` layout explicitly. Baking positions only
  // into element defs is NOT enough — the constructor's default layout can grid the nodes first, and
  // a position-less `preset` would then re-apply THOSE. An explicit `positions` map always wins.
  const positions: Positions = {};

  // Zone label nodes — one per vertex, ALWAYS present (an empty vertex still shows its labelled
  // zone; the model has four vertices even when one is unpopulated). Placed at the rhombus corners.
  for (const vk of VERTEX_ORDER) {
    const id = `zone_${vk}`;
    positions[id] = { ...LABEL[vk] };
    els.push({
      group: 'nodes',
      data: { id, zone: 1, label: VERTEX_LABEL[vk].toUpperCase() },
      position: { ...positions[id] },
      // A region label, not an entity — never selectable (only vertex entities open the panel).
      selectable: false,
    });
  }

  // Entity nodes, stacked vertically and centred within their vertex cluster.
  for (const vk of VERTEX_ORDER) {
    const items = model.vertices[vk];
    const { x: cx, y: cy } = CLUSTER[vk];
    items.forEach((n, i) => {
      const id = `e${n.entity_id}`;
      positions[id] = { x: cx, y: cy + (i - (items.length - 1) / 2) * ROW };
      els.push({
        group: 'nodes',
        data: {
          id,
          label: n.value,
          tier: n.tier,
          etype: n.entity_type,
          shape: entityVisual(n.entity_type).shape,
          node: n,
        },
        position: { ...positions[id] },
      });
    });
  }

  // Decorative rhombus frame (neutral, no arrows, no tier — clearly NOT a data relationship).
  FRAME.forEach(([a, b], i) => {
    els.push({
      group: 'edges',
      data: { id: `frame_${i}`, source: `zone_${a}`, target: `zone_${b}`, frame: 1 },
      selectable: false,
    });
  });

  // The real relationships — the Diamond's connecting axes + internal structure. Directional,
  // labelled with rel_type, and tier-styled exactly like the correlation graph.
  for (const e of model.edges) {
    els.push({
      group: 'edges',
      data: {
        id: `r${e.relationship_id}`,
        source: `e${e.source_entity_id}`,
        target: `e${e.target_entity_id}`,
        tier: e.tier,
        label: e.rel_type,
        edge: e,
      },
      // The diamond surfaces per-VERTEX data on select; relationship edges are drawn, not clickable.
      selectable: false,
    });
  }

  return { elements: els, positions };
}

/** Reuse the graph tier stylesheet, then add the zone-label and frame-edge treatments. */
function buildDiamondStylesheet(): Stylesheet[] {
  const base = buildStylesheet();
  const muted = token('--muted-foreground');
  const fg = token('--foreground');
  const surface2 = token('--surface-2');
  const border = token('--border');

  const extra: Stylesheet[] = [
    // Zone label: a neutral chrome header (NOT a tier hue — it is a region label, not evidence).
    {
      selector: 'node[zone = 1]',
      style: {
        shape: 'round-rectangle',
        'background-color': surface2,
        'background-opacity': 1,
        'border-color': border,
        'border-width': 1,
        'border-style': 'solid',
        width: 'label',
        height: 'label',
        padding: '10px',
        label: 'data(label)',
        color: fg,
        'font-size': 13,
        'font-weight': 'bold',
        'text-valign': 'center',
        'text-halign': 'center',
        'text-max-width': '220px',
      } as cytoscape.Css.Node,
    },
    // Relationship edges (everything that is NOT the frame): bezier curves so parallel edges fan
    // apart, and the rel_type label is nudged off the line so it doesn't sit on top of a node.
    {
      selector: 'edge[frame != 1]',
      style: {
        'curve-style': 'bezier',
        'control-point-step-size': 60,
        'font-size': 10,
        'text-margin-y': -7,
      } as cytoscape.Css.Edge,
    },
    // Decorative rhombus frame — faint, straight, arrowless, unlabelled.
    {
      selector: 'edge[frame = 1]',
      style: {
        'line-color': muted,
        'line-style': 'solid',
        width: 1.5,
        opacity: 0.3,
        'curve-style': 'straight',
        'target-arrow-shape': 'none',
        label: '',
      } as cytoscape.Css.Edge,
    },
  ];

  return [...base, ...extra];
}

export const DiamondCanvas = React.forwardRef<DiamondCanvasHandle, DiamondCanvasProps>(
  function DiamondCanvas({ model, onSelectNode, onSelectNone }, ref) {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const cyRef = React.useRef<Core | null>(null);
    const layoutRef = React.useRef<Layouts | null>(null);

    // Latest callbacks in a ref so the init effect stays keyed only on `model`.
    const handlers = React.useRef({ onSelectNode, onSelectNone });
    handlers.current = { onSelectNode, onSelectNone };

    React.useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const { elements, positions } = buildDiagram(model);
      const cy = cytoscape({
        container,
        elements,
        style: buildDiamondStylesheet(),
        // A FIXED, LOCKED diagram: the four vertices sit at their canonical rhombus positions and the
        // user cannot move, pan, or zoom them out of that arrangement. Only SELECTION is interactive
        // (tap a vertex → its record). autoungrabify = no node dragging; user-panning/zooming off =
        // the frame can't be shoved around; box-selection off. Nothing here re-arranges the diamond.
        autoungrabify: true,
        userPanningEnabled: false,
        userZoomingEnabled: false,
        boxSelectionEnabled: false,
      });
      cyRef.current = cy;

      // Detail-on-select — a tap on a vertex ENTITY (not a zone label / frame) surfaces its record.
      cy.on('tap', 'node', (evt: EventObject) => {
        if (cy.destroyed()) return;
        const node = evt.target.data('node') as GraphNode | undefined;
        if (node) handlers.current.onSelectNode(node);
      });
      cy.on('tap', (evt: EventObject) => {
        if (cy.destroyed()) return;
        if (evt.target === cy) {
          cy.elements().unselect();
          handlers.current.onSelectNone();
        }
      });

      // Run the `preset` layout with an EXPLICIT positions map (the diamond geometry) via a tracked
      // handle. Explicit positions are authoritative — they place each vertex zone + its entities at
      // their rhombus coordinates regardless of any default layout the constructor may have applied
      // (the bug that flattened the diamond into a top row of labels). The tracked handle lets the
      // layout be STOPPED on teardown so no tick fires on a destroyed cy (the crypto-graph fix).
      const layout = cy.layout({ name: 'preset', positions, fit: true, padding: 70 });
      layoutRef.current = layout;
      layout.run();

      const observer = new ResizeObserver(() => {
        if (cy.destroyed()) return;
        cy.resize();
        cy.fit(undefined, 70);
      });
      observer.observe(container);

      return () => {
        // Ordered teardown: stop the layout, drop the observer + all listeners, THEN destroy.
        observer.disconnect();
        layoutRef.current?.stop();
        layoutRef.current = null;
        cy.removeAllListeners();
        cy.destroy();
        cyRef.current = null;
      };
    }, [model]);

    React.useImperativeHandle(ref, () => ({
      fit: () => {
        const cy = cyRef.current;
        if (cy && !cy.destroyed()) {
          cy.animate({ fit: { eles: cy.elements(), padding: 70 } }, { duration: 200 });
        }
      },
      clearSelection: () => {
        const cy = cyRef.current;
        if (cy && !cy.destroyed()) cy.elements().unselect();
      },
    }));

    return <div ref={containerRef} className="size-full" />;
  },
);
