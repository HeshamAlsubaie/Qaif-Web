/**
 * Investigation-board model — pure types, per-case localStorage persistence, and helpers that turn a
 * case artifact (evidence / finding / entity) into a board PIN (a reference, never a copy).
 *
 * The board is a CLIENT-ONLY thinking layer: it references evidence that already exists (by a stable
 * `refId`) and stores the investigator's arrangement, groups, notes, and hypothesis links in the
 * browser, keyed by case id. It NEVER writes to the backend, never seals evidence, never touches
 * custody — nothing here calls an API. A future backend-persisted board is out of scope.
 */
import type { EvidenceItemResponse, FindingResponse, GraphNode, Tier } from '@/types/api';

export type PinKind = 'evidence' | 'finding' | 'entity';

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
}

/** A hand-drawn hypothesis link between two pins — the analyst's reasoning, NOT a case relationship. */
export interface BoardLink {
  id: string;
  from: string;
  to: string;
  label?: string;
}

export interface BoardState {
  pins: BoardPin[];
  groups: BoardGroup[];
  notes: BoardNote[];
  links: BoardLink[];
}

/** A pin's content before it is placed — the board assigns id + position on add. */
export type PinSeed = Omit<BoardPin, 'id' | 'x' | 'y' | 'note'>;

export function emptyBoard(): BoardState {
  return { pins: [], groups: [], notes: [], links: [] };
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

// -- persistence (client-only; localStorage keyed per case) ------------------

const storageKey = (caseId: number): string => `qaif.board.${caseId}`;

function isBoardState(value: unknown): value is BoardState {
  if (value === null || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    Array.isArray(v.pins) &&
    Array.isArray(v.groups) &&
    Array.isArray(v.notes) &&
    Array.isArray(v.links)
  );
}

/** Load a case's board from localStorage. Any corruption degrades to an empty board, never throws. */
export function loadBoard(caseId: number): BoardState {
  try {
    const raw = localStorage.getItem(storageKey(caseId));
    if (!raw) return emptyBoard();
    const parsed = JSON.parse(raw) as unknown;
    if (!isBoardState(parsed)) return emptyBoard();
    // Take only the known arrays, so a partial/older shape still loads cleanly.
    return {
      pins: parsed.pins,
      groups: parsed.groups,
      notes: parsed.notes,
      links: parsed.links,
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
