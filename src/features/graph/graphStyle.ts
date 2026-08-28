/**
 * The Cytoscape stylesheet and layouts — where R4 (tier separation) is rendered IN GRAPH SPACE.
 *
 * Cytoscape paints to a <canvas>, so it cannot read Tailwind/CSS variables the way DOM does. To keep
 * ONE source of truth for the forensic palette, we resolve the design tokens from the document at
 * build time (getComputedStyle) and hand Cytoscape concrete colours. Change a token in globals.css
 * and the graph moves with it — the canvas never forks the palette.
 *
 * The tier grammar, made physical on the canvas:
 *   confirmed     → cyan, SOLID border / SOLID edge line, full opacity      (a grounded fact)
 *   probabilistic → amber, DASHED border / DASHED edge line, reduced weight (a provisional inference)
 *
 * The solid-vs-dashed encoding is deliberate: it survives a grayscale print. An analyst tracing a
 * link can never mistake an inferred (dashed amber) relationship for a confirmed (solid cyan) one.
 */
import type { LayoutOptions, Stylesheet } from 'cytoscape';

export type LayoutName = 'cose' | 'breadthfirst' | 'grid';

/** Read a raw HSL token (`"189 84% 47%"`) from :root. */
function readToken(name: string): string {
  if (typeof window === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/**
 * Resolve a design token to a canvas-parseable `hsl()/hsla()` string. We emit the comma form
 * (`hsl(h, s, l)`) which every canvas implementation parses, rather than the space form.
 */
function token(name: string, alpha = 1): string {
  const raw = readToken(name);
  if (!raw) return alpha < 1 ? 'rgba(0,0,0,0)' : '#0b0f17';
  const [h, s, l] = raw.split(/\s+/);
  return alpha < 1 ? `hsla(${h}, ${s}, ${l}, ${alpha})` : `hsl(${h}, ${s}, ${l})`;
}

/**
 * Build the tier-aware stylesheet. Called after mount so the tokens are resolvable. Selection is
 * shown with a blue OVERLAY halo — never by recolouring a node's border — so the tier colour and
 * solid/dashed treatment stay intact even while an element is selected.
 */
export function buildStylesheet(): Stylesheet[] {
  const bg = token('--surface-0');
  const fg = token('--foreground');
  const muted = token('--muted-foreground');
  const primary = token('--primary');
  const mono = "ui-monospace, 'SFMono-Regular', 'JetBrains Mono', Menlo, Consolas, monospace";

  const confirmed = token('--confirmed');
  const confirmedFill = token('--confirmed-muted');
  const probabilistic = token('--probabilistic');
  const probabilisticFill = token('--probabilistic-muted');

  const sheet: Stylesheet[] = [
    {
      selector: 'node',
      style: {
        shape: 'data(shape)',
        label: 'data(label)',
        width: 46,
        height: 46,
        'background-opacity': 1,
        'border-width': 3,
        color: fg,
        'font-family': mono,
        'font-size': 11,
        'text-valign': 'bottom',
        'text-halign': 'center',
        'text-margin-y': 7,
        'text-max-width': '140px',
        'text-wrap': 'ellipsis',
        'text-outline-color': bg,
        'text-outline-width': 2.5,
        'transition-property': 'border-color, background-color, opacity',
        'transition-duration': 150,
      },
    },
    // R4 — CONFIRMED node: solid cyan border, full opacity, faint cyan fill.
    {
      selector: 'node[tier = "confirmed"]',
      style: {
        'border-color': confirmed,
        'border-style': 'solid',
        'background-color': confirmedFill,
        opacity: 1,
      },
    },
    // R4 — PROBABILISTIC node: DASHED amber border, reduced emphasis, faint amber fill.
    {
      selector: 'node[tier = "probabilistic"]',
      style: {
        'border-color': probabilistic,
        'border-style': 'dashed',
        'background-color': probabilisticFill,
        opacity: 0.92,
      },
    },
    {
      selector: 'edge',
      style: {
        width: 3,
        'curve-style': 'bezier',
        label: 'data(label)',
        'font-family': mono,
        'font-size': 9,
        color: muted,
        'text-background-color': bg,
        'text-background-opacity': 0.85,
        'text-background-padding': '2px',
        'text-rotation': 'autorotate',
        'target-arrow-shape': 'triangle',
        'arrow-scale': 1.1,
        'transition-property': 'line-color, opacity',
        'transition-duration': 150,
      },
    },
    // R4 — CONFIRMED edge: SOLID cyan line, full opacity.
    {
      selector: 'edge[tier = "confirmed"]',
      style: {
        'line-color': confirmed,
        'target-arrow-color': confirmed,
        'line-style': 'solid',
        opacity: 1,
      },
    },
    // R4 — PROBABILISTIC edge: DASHED amber line, thinner, softened — distinguishable AS A LINE.
    {
      selector: 'edge[tier = "probabilistic"]',
      style: {
        'line-color': probabilistic,
        'target-arrow-color': probabilistic,
        'line-style': 'dashed',
        'line-dash-pattern': [8, 4],
        width: 2.5,
        opacity: 0.9,
      },
    },
    // Selection: a blue halo that leaves the tier treatment untouched.
    {
      selector: ':selected',
      style: {
        'overlay-color': primary,
        'overlay-opacity': 0.2,
        'overlay-padding': 7,
      },
    },
  ];

  return sheet;
}

/**
 * Layout options. `cose` (force-directed) self-arranges the network; `breadthfirst` gives a
 * hierarchical read; `grid` is a stable deterministic fallback. All fit + pad on run. Layout is run
 * on data/layout change only (see GraphCanvas) — never on every React render.
 */
export function buildLayout(name: LayoutName): LayoutOptions {
  const base = { fit: true, padding: 48, animate: true, animationDuration: 350 } as const;

  switch (name) {
    case 'grid':
      return { name: 'grid', ...base, avoidOverlap: true, avoidOverlapPadding: 20, spacingFactor: 1.2 } as LayoutOptions;
    case 'breadthfirst':
      return { name: 'breadthfirst', ...base, directed: true, spacingFactor: 1.5, grid: false } as LayoutOptions;
    case 'cose':
    default:
      return {
        name: 'cose',
        ...base,
        randomize: false,
        nodeRepulsion: 12000,
        idealEdgeLength: 150,
        nodeOverlap: 24,
        gravity: 0.6,
        componentSpacing: 120,
        numIter: 1200,
      } as LayoutOptions;
  }
}

export interface LayoutMeta {
  name: LayoutName;
  label: string;
}

/** The layouts offered in the toolbar picker: a force-directed default + two alternatives. */
export const LAYOUTS: LayoutMeta[] = [
  { name: 'cose', label: 'Force' },
  { name: 'breadthfirst', label: 'Hierarchy' },
  { name: 'grid', label: 'Grid' },
];
