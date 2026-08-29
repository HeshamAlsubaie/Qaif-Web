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
    // Edge labels (amount / ×N) kept small so the flow lines dominate, not the text.
    {
      selector: 'edge',
      style: {
        'font-size': 8,
      } as cytoscape.Css.Edge,
    },
  ];

  return [...base, ...extra];
}

/**
 * Crypto layout. `breadthfirst` (directed, rooted at the origin) is the default and the point: it
 * lays the flow out hierarchically — root at the top, hop-1 beneath it, hop-2 below that — so money
 * reads as flowing outward, never a random force blob. `cose`/`grid` reuse the base layouts.
 */
export function buildCryptoLayout(name: LayoutName, rootIds: string[]): LayoutOptions {
  if (name === 'breadthfirst') {
    return {
      name: 'breadthfirst',
      fit: true,
      padding: 48,
      animate: true,
      animationDuration: 350,
      directed: true,
      grid: false,
      spacingFactor: 1.25,
      ...(rootIds.length > 0 ? { roots: rootIds } : {}),
    } as LayoutOptions;
  }
  return buildLayout(name);
}
