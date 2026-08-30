/**
 * Investigation-board model — pure types, per-case localStorage persistence, and helpers that turn a
 * case artifact (evidence / finding / entity) into a board PIN (a reference, never a copy).
 *
 * The board is a CLIENT-ONLY thinking layer: it references evidence that already exists (by a stable
 * `refId`) and stores the investigator's arrangement, groups, notes, connectors, free-drawings,
 * shapes, icons, and text labels in the browser, keyed by case id. It NEVER writes to the backend,
 * never seals evidence, never touches custody — nothing here calls an API. Every element below is the
 * analyst's working hypothesis, not case state; a future backend-persisted board is out of scope.
 */
import type { EvidenceItemResponse, FindingResponse, GraphNode, Tier } from '@/types/api';

export type PinKind = 'evidence' | 'finding' | 'entity';

/** A point in canvas coordinates (px within the sized canvas surface). */
export interface Vec {
  x: number;
  y: number;
}

export interface PinField {
  label: string;
  value: string;
}

export interface BoardPin {
  id: string;
  /** Stable reference to the source artifact (e.g. `evidence:33`) — dedupe key; the board pins THIS. */
  refId: string;
  kind: PinKind;
  title: string;
  subtitle?: string;
  /** R4 tier for findings/entities. Evidence carries `integrity` instead (custody, not a tier). */
  tier?: Tier;
  /** Evidence custody-verified flag — the integrity signal for an evidence pin. */
  integrity?: boolean;
  fields: PinField[];
  x: number;
  y: number;
  /** Stacking order (bring-forward / send-back). Optional for boards saved before z existed. */
  z?: number;
  /** The investigator's free-text annotation on this pin (working note, not case data). */
  note?: string;
}

/** A named, movable/resizable zone for visually clustering pins ("attacker infra", …). */
export interface BoardGroup {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A free-floating sticky note on the canvas. */
export interface BoardNote {
  id: string;
  text: string;
  x: number;
  y: number;
  z?: number;
}

/**
 * A DIRECTED connector between two pins — the analyst's hypothesis about a relationship
 * ("exfiltrated to", "same operator", "occurred before"). It renders from → to with an arrowhead and
 * an editable label. It is NOT a case-graph edge and is never written to correlation or custody.
 */
export interface BoardLink {
  id: string;
  from: string;
  to: string;
  label?: string;
  z?: number;
}

export type ShapeKind = 'box' | 'circle' | 'arrow';

/** A shape used to ring / highlight a region — box, circle, or a standalone arrow. */
export interface BoardShape {
  id: string;
  shape: ShapeKind;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
}

/** A free-hand ink stroke — annotate freely, not anchored to any pin. */
export interface BoardDrawing {
  id: string;
  points: Vec[];
  z: number;
}

/** The small palette of marker/flag icons the analyst can drop to tag elements. */
export const BOARD_ICON_NAMES = [
  'flag',
  'star',
  'alert',
  'target',
  'key',
  'skull',
  'eye',
  'bookmark',
] as const;
export type IconName = (typeof BOARD_ICON_NAMES)[number];

/** A dropped icon/marker. `name` keys into the palette; the glyph is chosen in the view. */
export interface BoardIcon {
  id: string;
  name: IconName;
  x: number;
  y: number;
  size: number;
  z: number;
}

/** A light inline text label on the canvas — distinct from the heavier sticky note. */
export interface BoardText {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  z: number;
}

export interface BoardState {
  pins: BoardPin[];
  groups: BoardGroup[];
  notes: BoardNote[];
  links: BoardLink[];
  shapes: BoardShape[];
  drawings: BoardDrawing[];
  icons: BoardIcon[];
  texts: BoardText[];
}

/** A pin's content before it is placed — the board assigns id + position on add. */
export type PinSeed = Omit<BoardPin, 'id' | 'x' | 'y' | 'z' | 'note'>;

export function emptyBoard(): BoardState {
  return {
    pins: [],
    groups: [],
    notes: [],
    links: [],
    shapes: [],
    drawings: [],
    icons: [],
    texts: [],
  };
}

// -- ids ---------------------------------------------------------------------

let fallbackCounter = 0;
export function newId(prefix: string): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `${prefix}_${crypto.randomUUID()}`;
    }
  } catch {
    /* fall through to the counter */
  }
  fallbackCounter += 1;
  return `${prefix}_${fallbackCounter}_${performance.now().toString(36)}`;
}

// -- stacking order (z) ------------------------------------------------------

/** Default stacking band per element kind, so a board saved before `z` still layers sensibly. */
export const Z_DEFAULT = {
  drawing: 10,
  shape: 20,
  link: 30,
  note: 50,
  pin: 50,
  icon: 60,
  text: 60,
} as const;

/** Every element's effective z (its own, or the default for its band). */
function allZ(board: BoardState): number[] {
  return [
    ...board.drawings.map((d) => d.z ?? Z_DEFAULT.drawing),
    ...board.shapes.map((s) => s.z ?? Z_DEFAULT.shape),
    ...board.links.map((l) => l.z ?? Z_DEFAULT.link),
    ...board.notes.map((n) => n.z ?? Z_DEFAULT.note),
    ...board.pins.map((p) => p.z ?? Z_DEFAULT.pin),
    ...board.icons.map((i) => i.z ?? Z_DEFAULT.icon),
    ...board.texts.map((t) => t.z ?? Z_DEFAULT.text),
  ];
}

/** Next z above everything — a freshly added or brought-forward element sits on top. */
export function nextZ(board: BoardState): number {
  const zs = allZ(board);
  return (zs.length > 0 ? Math.max(...zs) : Z_DEFAULT.pin) + 1;
}

/** Next z below everything — for send-to-back. */
export function backZ(board: BoardState): number {
  const zs = allZ(board);
  return (zs.length > 0 ? Math.min(...zs) : 0) - 1;
}

// -- persistence (client-only; localStorage keyed per case) ------------------

const storageKey = (caseId: number): string => `qaif.board.${caseId}`;

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

/**
 * Load a case's board from localStorage. Any corruption degrades to an empty board, never throws.
 * Missing arrays (a board saved by an earlier version) default to empty, so old boards still open.
 */
export function loadBoard(caseId: number): BoardState {
  try {
    const raw = localStorage.getItem(storageKey(caseId));
    if (!raw) return emptyBoard();
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return emptyBoard();
    return {
      pins: asArray<BoardPin>(parsed.pins),
      groups: asArray<BoardGroup>(parsed.groups),
      notes: asArray<BoardNote>(parsed.notes),
      links: asArray<BoardLink>(parsed.links),
      shapes: asArray<BoardShape>(parsed.shapes),
      drawings: asArray<BoardDrawing>(parsed.drawings),
      icons: asArray<BoardIcon>(parsed.icons),
      texts: asArray<BoardText>(parsed.texts),
    };
  } catch {
    return emptyBoard();
  }
}

export function saveBoard(caseId: number, state: BoardState): void {
  try {
    localStorage.setItem(storageKey(caseId), JSON.stringify(state));
  } catch {
    // Persistence is a convenience, not a requirement — never block the UI on it.
  }
}

// -- pin seeds from case artifacts (references, not copies) -------------------

function shortHash(sha256: string): string {
  return sha256.length > 16 ? `${sha256.slice(0, 12)}…${sha256.slice(-4)}` : sha256;
}

export function pinFromEvidence(item: EvidenceItemResponse): PinSeed {
  const fields: PinField[] = [{ label: 'Type', value: item.evidence_type }];
  if (item.sha256) fields.push({ label: 'SHA-256', value: shortHash(item.sha256) });
  return {
    refId: `evidence:${item.evidence_id}`,
    kind: 'evidence',
    title: item.original_filename,
    subtitle: `E${item.evidence_id}`,
    integrity: item.custody_verified,
    fields,
  };
}

export function pinFromFinding(finding: FindingResponse, tier: Tier): PinSeed {
  return {
    refId: `finding:${finding.finding_id}`,
    kind: 'finding',
    title: finding.title,
    subtitle: `#${finding.finding_id}`,
    tier,
    fields: [{ label: 'Severity', value: finding.severity }],
  };
}

export function pinFromEntity(node: GraphNode): PinSeed {
  return {
    refId: `entity:${node.entity_id}`,
    kind: 'entity',
    title: node.value,
    subtitle: node.entity_type,
    tier: node.tier,
    fields: [{ label: 'Type', value: node.entity_type }],
  };
}
