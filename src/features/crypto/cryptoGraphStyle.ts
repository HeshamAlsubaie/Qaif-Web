/**
 * The crypto funds-flow graph's Cytoscape styling — it REUSES the case graph's tier grammar
 * (`buildStylesheet` + `token`, imported from graphStyle) so the forensic palette has one source of
 * truth, then layers the crypto-specific encoding on top:
 *   - ROOT (the OFAC/Lazarus origin): larger, an octagon, a strong solid amber ring + a sanction
 *     marker drawn inside it — the investigation subject, unmistakable as the graph's root;
 *   - WALLET nodes: size AND opacity mapped to confidence, so the 0.60→0.51→0.43 per-hop decay is
 *     SPATIALLY visible — nodes literally fade and shrink the further money gets from the origin;
 *   - EXPANDABLE nodes (hidden children): a brighter, heavier ring signalling "click to reveal".
 *
 * Everything stays amber/probabilistic (R4) — a trace is an indicator, never confirmed styling.
 */
import type cytoscape from 'cytoscape';
import type { LayoutOptions, Stylesheet } from 'cytoscape';

import { buildLayout, buildStylesheet, token, type LayoutName } from '@/features/graph/graphStyle';

import { cryptoNodeId, type CryptoGraphModel } from './cryptoGraph';

/** An amber sanction marker (a ban circle) drawn inside the root node — resolves the amber token. */
function sanctionMarker(): string {
  const amber = token('--probabilistic');
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='${amber}' stroke-width='2.4' stroke-linecap='round'><circle cx='12' cy='12' r='9'/><line x1='5.8' y1='5.8' x2='18.2' y2='18.2'/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Build the crypto stylesheet: the shared tier grammar first, then the crypto overrides. Later
 * selectors win, so the root/confidence/expand rules refine the base probabilistic treatment.
 */
export function buildCryptoStylesheet(): Stylesheet[] {
  const base = buildStylesheet();
  const amber = token('--probabilistic');

  const extra: Stylesheet[] = [
    // Wallet nodes (non-root): confidence drives BOTH size and opacity — decay made spatial.
    {
      selector: 'node[root = 0]',
      style: {
        width: 'mapData(confidence, 0, 1, 24, 52)',
        height: 'mapData(confidence, 0, 1, 24, 52)',
        opacity: 'mapData(confidence, 0, 1, 0.4, 1)',
        'font-size': 9,
      } as cytoscape.Css.Node,
    },
    // Root = the sanctioned origin: bigger, octagon, strong solid amber ring, sanction marker inside.
    {
      selector: 'node[root = 1]',
      style: {
        width: 80,
        height: 80,
        opacity: 1,
        'border-width': 5,
        'border-style': 'solid',
        'border-color': amber,
        'background-image': sanctionMarker(),
        'background-fit': 'none',
        'background-width': '44%',
        'background-height': '44%',
        'background-clip': 'none',
        'font-size': 11,
        'font-weight': 'bold',
      } as cytoscape.Css.Node,
    },
    // Expandable: a heavier, full-opacity amber ring says "there is more flow behind this node".
    {
      selector: 'node[hiddenChildren > 0]',
      style: {
        'border-width': 4,
        'border-color': amber,
        'border-opacity': 1,
      } as cytoscape.Css.Node,
    },
    // Edges: bezier curves so parallel and RECIPROCAL transfers fan into their own lane instead of
    // stacking into one band; a step size spreads multi-edges. Labels are OFF by default (they'd
    // fragment over each other) — the amount/×N shows only when an edge is selected. Direction is
    // carried by the arrow, separation by LANE GEOMETRY — never by colour (amber stays the one tier
    // hue). The base probabilistic edge style already makes every edge dashed amber (R4).
    {
      selector: 'edge',
      style: {
        'curve-style': 'bezier',
        'control-point-step-size': 34,
        'font-size': 8,
        label: '',
        'target-arrow-shape': 'triangle',
        'arrow-scale': 1.05,
      } as cytoscape.Css.Edge,
    },
    // A selected edge reveals its amount/txid label and thickens — readable, on demand, not always-on.
    {
      selector: 'edge:selected',
      style: {
        label: 'data(label)',
        width: 3.4,
        'text-background-opacity': 0.9,
      } as cytoscape.Css.Edge,
    },
  ];

  return [...base, ...extra];
}

// -- layered LR layout (hop = column) ---------------------------------------

// Spacing, chosen so the confidence-sized nodes (24–52px) + labels don't collide and the graph
// trends toward a ~2:1 landscape at fit zoom (not the tall single-file column a 20-wide hop would be).
const COL_GAP = 420; // between hops (x) — the primary axis: distance from the origin
const ROW_GAP = 76; //  between stacked nodes within a lane (y)
const LANE_GAP = 130; // between sub-lanes of the SAME hop (x) — kept < COL_GAP so hops stay distinct
const MAX_ROWS = 6; //  a hop deeper than this wraps into extra sub-lanes instead of one tall line

/**
 * Deterministic LR-by-hop positions for the CURRENTLY VISIBLE nodes. `x` is driven by the node's
 * `hop` field straight from `/crypto` (NOT graph BFS depth) — hop 0 at the left, each hop a column to
 * the right — so horizontal position IS distance from the sanctioned origin and the confidence decay
 * reads left→right. Same-hop nodes stack vertically; a hop with more than `MAX_ROWS` nodes wraps into
 * a few TIGHT sub-lanes (a small x offset < COL_GAP) so a wide fan of counterparties stays a readable
 * ~2:1 band rather than an unreadable vertical line — the hop still occupies one horizontal region.
 * Only visible nodes are placed; a revealed hop-2 node gets a position the next time this runs.
 */
export function computeLayeredPositions(
  model: CryptoGraphModel,
  visibleIds: ReadonlySet<number>,
): Record<string, { x: number; y: number }> {
  const byHop = new Map<number, number[]>();
  for (const n of model.nodes) {
    if (!visibleIds.has(n.entityId)) continue;
    const col = byHop.get(n.hop);
    if (col) col.push(n.entityId);
    else byHop.set(n.hop, [n.entityId]);
  }
  const positions: Record<string, { x: number; y: number }> = {};
  for (const [hop, ids] of byHop) {
    ids.sort((a, b) => a - b); // stable order → the layout doesn't jump between runs
    const count = ids.length;
    const lanes = Math.max(1, Math.ceil(count / MAX_ROWS));
    const perLane = Math.ceil(count / lanes);
    ids.forEach((id, i) => {
      const lane = Math.floor(i / perLane);
      const rowInLane = i % perLane;
      const rowsHere = Math.min(perLane, count - lane * perLane);
      positions[cryptoNodeId(id)] = {
        x: hop * COL_GAP + (lane - (lanes - 1) / 2) * LANE_GAP,
        y: (rowInLane - (rowsHere - 1) / 2) * ROW_GAP,
      };
    });
  }
  return positions;
}

/** A `preset` layout that drops each node onto its precomputed LR-by-hop position, then fits. */
export function buildLayeredLayout(
  positions: Record<string, { x: number; y: number }>,
): LayoutOptions {
  return {
    name: 'preset',
    positions,
    fit: true,
    padding: 56,
    animate: true,
    animationDuration: 300,
  } as LayoutOptions;
}

/**
 * The ALTERNATIVE crypto layouts offered by the toolbar's Force/Grid options. The DEFAULT
 * ("Hierarchy") is the layered LR-by-hop preset above (`buildLayeredLayout`), computed from the
 * visible set in the canvas; this just reuses the base force/grid layouts for the other two.
 */
export function buildCryptoLayout(name: LayoutName): LayoutOptions {
  return buildLayout(name);
}
