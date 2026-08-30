/**
 * Timeline domain model — the pure logic that turns the reconciled `/timeline` payload into a
 * chronological, ambiguity-aware layout. It is deliberately UI-free so the forensic honesty rules
 * live in one testable place:
 *
 *   - Events are ordered ONLY on their UTC instant (the reconciliation basis, R8). No secondary
 *     ordering is invented for events the backend says cannot be ordered.
 *   - `tie` and `precision_overlap` ambiguities COLLAPSE their events into a single unordered slot
 *     (a band). Two events the backend won't sequence are never rendered as two sequenced dots.
 *   - `assumed_tz` and `clock_skew` stay as PER-EVENT markers: they flag an event's position as
 *     provisional without moving it. Every ambiguity the payload carries is surfaced, never dropped.
 *   - Nothing is fabricated: one slot maps to real event(s); tier is only shown when the event KIND
 *     itself encodes it (finding / probabilistic_finding), never guessed for other kinds.
 */
import type { AmbiguityKind, Tier, TimelineAmbiguityResponse, TimelineEventResponse } from '@/types/api';

/** The four ambiguity kinds Layer 4.2 surfaces. `kind` arrives as a plain string, so we narrow. */
export const AMBIGUITY_KINDS = [
  'assumed_tz',
  'precision_overlap',
  'clock_skew',
  'tie',
] as const satisfies readonly AmbiguityKind[];

export function isAmbiguityKind(kind: string): kind is AmbiguityKind {
  return (AMBIGUITY_KINDS as readonly string[]).includes(kind);
}

/** Ambiguity kinds that mean "these events cannot be reliably ordered" — they collapse into a band. */
const CLUSTERING_KINDS: ReadonlySet<string> = new Set<AmbiguityKind>(['tie', 'precision_overlap']);

/** A resolved entity, looked up from the case graph so a timeline event's ids read as real values. */
export interface ResolvedEntity {
  entity_id: number;
  entity_type: string;
  value: string;
  tier: Tier;
}
export type EntityResolver = (id: number) => ResolvedEntity | undefined;

/** A single event plus the ambiguities that touch it (both band-forming and per-event markers). */
export interface TimelineEventNode {
  event: TimelineEventResponse;
  ambiguities: TimelineAmbiguityResponse[];
  /** Narrowed, de-duplicated ambiguity kinds that apply to this event. */
  kinds: AmbiguityKind[];
}

/**
 * One row on the axis. A `single` slot is one confidently-placed event. A `cluster` slot is 2+
 * events the backend refuses to order — rendered as an unordered/co-occurring band, never a sequence.
 */
export type TimelineSlot =
  | { kind: 'single'; epoch: number; node: TimelineEventNode }
  | {
      kind: 'cluster';
      epoch: number;
      utcMin: string;
      utcMax: string;
      nodes: TimelineEventNode[];
      /** The band-forming ambiguities (tie / precision_overlap) that pulled these together. */
      clusterAmbiguities: TimelineAmbiguityResponse[];
      reason: ClusterReason;
    };

export type ClusterReason = 'tie' | 'indeterminate' | 'mixed';

/** A gap between two consecutive slots, so real elapsed time is visible without fragile scaling. */
export interface TimelineGap {
  ms: number;
  label: string;
}

export interface TimelineLayout {
  slots: TimelineSlot[];
  /** gaps[i] is the elapsed time between slots[i] and slots[i+1]; length = slots.length - 1. */
  gaps: TimelineGap[];
  /** Ambiguity kinds actually present in this case's data (drives an honest "present in this case" key). */
  presentKinds: AmbiguityKind[];
}

// -- union-find over event_keys, so chained overlaps (a~b, b~c) merge into one band --------------

function buildClusters(bandAmbiguities: TimelineAmbiguityResponse[]): Map<string, string> {
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    let root = parent.get(x) ?? x;
    while (root !== (parent.get(root) ?? root)) root = parent.get(root) ?? root;
    parent.set(x, root);
    return root;
  };
  const union = (a: string, b: string): void => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };
  for (const amb of bandAmbiguities) {
    const [first, ...rest] = amb.event_keys;
    if (first === undefined) continue;
    if (!parent.has(first)) parent.set(first, first);
    for (const key of rest) {
      if (!parent.has(key)) parent.set(key, key);
      union(first, key);
    }
  }
  // Collapse to canonical roots.
  const roots = new Map<string, string>();
  for (const key of parent.keys()) roots.set(key, find(key));
  return roots;
}

function epochOf(iso: string): number {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? 0 : t;
}

function clusterReason(kinds: Set<string>): ClusterReason {
  const hasTie = kinds.has('tie');
  const hasOverlap = kinds.has('precision_overlap') || kinds.has('clock_skew');
  if (hasTie && hasOverlap) return 'mixed';
  if (hasOverlap) return 'indeterminate';
  return 'tie';
}

/**
 * Build the ordered, ambiguity-aware layout from a validated timeline payload.
 *
 * Assumes events carry a parseable UTC string (they do — the backend reconciles to UTC at ingest).
 * Does NOT guarantee any order between events inside a cluster: that order is, by definition, unknown.
 */
export function buildTimelineLayout(
  events: TimelineEventResponse[],
  ambiguities: TimelineAmbiguityResponse[],
): TimelineLayout {
  // Index ambiguities by the event_key they touch.
  const byEventKey = new Map<string, TimelineAmbiguityResponse[]>();
  for (const amb of ambiguities) {
    for (const key of amb.event_keys) {
      const list = byEventKey.get(key) ?? [];
      list.push(amb);
      byEventKey.set(key, list);
    }
  }

  const nodeFor = (event: TimelineEventResponse): TimelineEventNode => {
    const ambs = byEventKey.get(event.event_key) ?? [];
    const kinds = Array.from(new Set(ambs.map((a) => a.kind).filter(isAmbiguityKind)));
    return { event, ambiguities: ambs, kinds };
  };

  // Band membership from tie / precision_overlap ambiguities (union-find over their event_keys).
  const bandAmbiguities = ambiguities.filter((a) => CLUSTERING_KINDS.has(a.kind));
  const roots = buildClusters(bandAmbiguities);

  // Group clustered events by their union-find root; keep singletons separate.
  const clusterMembers = new Map<string, TimelineEventResponse[]>();
  const singletons: TimelineEventResponse[] = [];
  for (const event of events) {
    const root = roots.get(event.event_key);
    if (root === undefined) {
      singletons.push(event);
      continue;
    }
    const list = clusterMembers.get(root) ?? [];
    list.push(event);
    clusterMembers.set(root, list);
  }

  const slots: TimelineSlot[] = [];

  for (const event of singletons) {
    // An event whose only ambiguities are per-event markers (assumed_tz / clock_skew) stays a single
    // slot — it is confidently PLACED even if its placement rests on an assumption we flag.
    slots.push({ kind: 'single', epoch: epochOf(event.utc), node: nodeFor(event) });
  }

  for (const [, members] of clusterMembers) {
    // A degenerate "cluster" of one (e.g. a lone-referenced key) is just a single slot.
    if (members.length === 1) {
      const only = members[0];
      slots.push({ kind: 'single', epoch: epochOf(only.utc), node: nodeFor(only) });
      continue;
    }
    const sortedMembers = [...members].sort((a, b) => a.event_key.localeCompare(b.event_key));
    const epochs = sortedMembers.map((m) => epochOf(m.utc));
    const utcMin = sortedMembers[epochs.indexOf(Math.min(...epochs))].utc;
    const utcMax = sortedMembers[epochs.indexOf(Math.max(...epochs))].utc;
    const memberKeys = new Set(sortedMembers.map((m) => m.event_key));
    const clusterAmbiguities = bandAmbiguities.filter((a) =>
      a.event_keys.some((k) => memberKeys.has(k)),
    );
    const reason = clusterReason(new Set(clusterAmbiguities.map((a) => a.kind)));
    slots.push({
      kind: 'cluster',
      epoch: Math.min(...epochs),
      utcMin,
      utcMax,
      nodes: sortedMembers.map(nodeFor),
      clusterAmbiguities,
      reason,
    });
  }

  // Chronological on the UTC axis. Ties between slots keep a stable order via a representative key.
  slots.sort((a, b) => a.epoch - b.epoch || slotKey(a).localeCompare(slotKey(b)));

  const gaps: TimelineGap[] = [];
  for (let i = 0; i < slots.length - 1; i += 1) {
    const ms = slots[i + 1].epoch - slots[i].epoch;
    gaps.push({ ms, label: formatGap(ms) });
  }

  const presentKinds = AMBIGUITY_KINDS.filter((k) => ambiguities.some((a) => a.kind === k));

  return { slots, gaps, presentKinds };
}

function slotKey(slot: TimelineSlot): string {
  return slot.kind === 'single' ? slot.node.event.event_key : slot.nodes[0]?.event.event_key ?? '';
}

// -- display helpers (kept here so the model fully owns "how time reads") ------------------------

/** Human elapsed-time label between two slots. Exact, never rounded away to imply co-occurrence. */
export function formatGap(ms: number): string {
  if (ms <= 0) return 'same instant';
  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const totalMinutes = Math.floor(totalSeconds / 60);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours < 24) return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours === 0 ? `${days}d` : `${days}d ${remHours}h`;
}

const EVENT_KIND_LABELS: Record<string, string> = {
  'evidence.acquired': 'Evidence acquired',
  'entity.first_seen': 'Entity first seen',
  relationship: 'Relationship formed',
  finding: 'Finding',
  probabilistic_finding: 'Probabilistic finding',
};

export function eventKindLabel(kind: string): string {
  return (
    EVENT_KIND_LABELS[kind] ??
    kind
      .replace(/[_.]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim()
  );
}

// -- plain-table projection (presentation change: same data, tabular shape) ----------------------

/**
 * An event's placement is PROVISIONAL when it rests on an assumption we must flag — an assumed
 * timezone or a skewed clock. It is still placed (given a UTC instant), just not a confirmed one.
 * This is the same distinction the vertical view drew with a hollow/dashed marker; in the table it
 * becomes the Time-basis column value.
 */
export function isProvisional(node: TimelineEventNode): boolean {
  return node.kinds.includes('assumed_tz') || node.kinds.includes('clock_skew');
}

/** The Time-basis column value: a provisional instant must still be flagged as such, in text. */
export function timeBasis(node: TimelineEventNode): 'CONFIRMED' | 'PROVISIONAL' {
  return isProvisional(node) ? 'PROVISIONAL' : 'CONFIRMED';
}

/** Plain-text ambiguity labels — no color, no badge, just the word(s). `—` when a row has none. */
export const AMBIGUITY_TEXT: Record<AmbiguityKind, string> = {
  tie: 'TIE',
  precision_overlap: 'INDETERMINATE ORDER',
  assumed_tz: 'ASSUMED TZ',
  clock_skew: 'CLOCK SKEW',
};

// Order-relation kinds (tie / indeterminate order) first — they carry the critical non-order
// assertion — then the per-event provisional markers.
const AMBIGUITY_TEXT_ORDER: readonly AmbiguityKind[] = [
  'tie',
  'precision_overlap',
  'assumed_tz',
  'clock_skew',
];

/** The plain-text ambiguity label(s) that apply to a row, ordered; empty means "no ambiguity". */
export function rowAmbiguityLabels(node: TimelineEventNode): string[] {
  return AMBIGUITY_TEXT_ORDER.filter((k) => node.kinds.includes(k)).map((k) => AMBIGUITY_TEXT[k]);
}

/**
 * One table row. `groupId` binds the rows of a co-occurring / indeterminate-order cluster into ONE
 * unordered set: within a group, `positionInGroup` is a stable render index that carries NO temporal
 * meaning (the bracket + the INDETERMINATE ORDER / TIE label assert that). Singletons have a null
 * group and stand alone.
 */
export interface TimelineRow {
  node: TimelineEventNode;
  groupId: string | null;
  groupSize: number;
  positionInGroup: number;
  reason: ClusterReason | null;
}

/**
 * Flatten the UTC-ordered layout into table rows WITHOUT inventing any order the backend didn't
 * establish: singletons stay singletons; each cluster's members share one group id so the table can
 * bracket them as an unordered set. Row order follows the layout (UTC on the slot axis); a cluster's
 * internal member order is the model's stable, meaning-free order — never a sequence.
 */
export function toTimelineRows(layout: TimelineLayout): TimelineRow[] {
  const rows: TimelineRow[] = [];
  let group = 0;
  for (const slot of layout.slots) {
    if (slot.kind === 'single') {
      rows.push({ node: slot.node, groupId: null, groupSize: 1, positionInGroup: 0, reason: null });
      continue;
    }
    group += 1;
    const groupId = `G${group}`;
    slot.nodes.forEach((node, i) => {
      rows.push({
        node,
        groupId,
        groupSize: slot.nodes.length,
        positionInGroup: i,
        reason: slot.reason,
      });
    });
  }
  return rows;
}
