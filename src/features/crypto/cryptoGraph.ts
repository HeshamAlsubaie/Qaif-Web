/**
 * Crypto funds-flow GRAPH model — derived ENTIRELY from the already-loaded `/crypto` payload (no new
 * API call). It turns the flat trace (origin + hop-tagged wallets + FUNDED transactions) into a
 * directed wallet→wallet graph with the adjacency the MetaSleuth-style view needs:
 *   - directional edges: each edge keeps its REAL money direction (source→target);
 *   - `childrenOf`/`parentsOf` (the two directions) — the DRAWN graph and the reveal use the
 *     PARENT→CHILD funding tree ({@link outwardChildrenOf} / {@link parentChildEdges}: edges whose
 *     target sits at a greater hop than its source), so the view reads as a clean top-down/left-right
 *     flow. Lateral (same-hop) and back-edges toward the origin are kept in the model but NOT drawn —
 *     they are the reciprocal cross-links that otherwise turn the picture into a web;
 *   - in/out counts and the incoming funding transactions (for the detail panel).
 *
 * Nothing is fabricated: edges exist only where a real transaction's input and output addresses BOTH
 * resolve to wallets the trace already returned. An address that doesn't resolve (e.g. an untraced
 * exchange) simply yields no edge — it is never invented.
 */
import type { CryptoTraceResponse } from '@/types/api';

export interface CryptoGraphNode {
  entityId: number;
  address: string;
  hop: number;
  confidence: number | null;
  isRoot: boolean;
  chain: string | null;
  sanctionProvenance: string | null;
  referenceEvidenceId: number | null;
}

export interface CryptoGraphTx {
  txid: string;
  amount: string | null;
  timestamp: string;
  originalTz: string;
  confidence: number | null;
  chain: string | null;
}

export interface CryptoGraphEdge {
  id: string;
  sourceId: number;
  targetId: number;
  txCount: number;
  /** A representative transaction for the edge label/summary; the full list lives per-wallet. */
  rep: CryptoGraphTx;
}

export interface CryptoGraphModel {
  /** Origin (hop-0) wallet ids — the graph's roots and the seed of the initial reveal. */
  rootIds: number[];
  /** The single OFAC/Lazarus origin, when present, for the sanction marker. */
  originId: number | null;
  nodes: CryptoGraphNode[];
  edges: CryptoGraphEdge[];
  nodeById: Map<number, CryptoGraphNode>;
  /** Outward links (source→target) — kept for the drawn arrows and the "money out" direction. */
  childrenOf: Map<number, number[]>;
  /** Inward links (target←source) — kept for the drawn arrows and the "money in" direction. */
  parentsOf: Map<number, number[]>;
  /**
   * Direction-AGNOSTIC counterparties: `childrenOf ∪ parentsOf`, deduped. Retained as a derived
   * view of the trace; the DRAWN graph and the reveal use the parent→child funding tree
   * ({@link outwardChildrenOf}) instead, so the picture stays a flow rather than a reciprocal web.
   */
  neighborsOf: Map<number, number[]>;
  inCount: Map<number, number>;
  outCount: Map<number, number>;
  /** Incoming (funding) transactions per wallet — "how this address was funded". */
  fundingTxsOf: Map<number, CryptoGraphTx[]>;
  maxHop: number;
}

const norm = (addr: string): string => addr.trim().toLowerCase();

const CY_NODE_PREFIX = 'cw';
export const cryptoNodeId = (entityId: number): string => `${CY_NODE_PREFIX}${entityId}`;

function pushUnique(map: Map<number, number[]>, key: number, value: number): void {
  const arr = map.get(key);
  if (arr === undefined) {
    map.set(key, [value]);
  } else if (!arr.includes(value)) {
    arr.push(value);
  }
}

/**
 * Build the directed funds-flow graph from a validated, present trace. A directed edge is created
 * for EVERY resolved (source, target) pair (only self-transfers are skipped), keeping the real money
 * direction on each edge. Both inflow (counterparty→origin) and outflow (origin→counterparty) edges
 * are kept — the sanctioned origin is mostly the TARGET of inflows, so dropping back-edges would
 * hide most of its counterparties and leave the initial reveal an empty single node.
 */
export function buildCryptoGraph(data: CryptoTraceResponse): CryptoGraphModel {
  const nodeById = new Map<number, CryptoGraphNode>();
  const idByAddr = new Map<string, number>();

  const register = (node: CryptoGraphNode, aliases: string[]): void => {
    if (!nodeById.has(node.entityId)) nodeById.set(node.entityId, node);
    for (const a of aliases) if (a) idByAddr.set(norm(a), node.entityId);
  };

  const originId = data.origin?.entity_id ?? null;

  if (data.origin) {
    register(
      {
        entityId: data.origin.entity_id,
        address: data.origin.value,
        hop: 0,
        confidence: data.origin.confidence,
        isRoot: true,
        chain: data.origin.chain,
        sanctionProvenance: data.origin.sanction_provenance,
        referenceEvidenceId: data.origin.reference_evidence_id,
      },
      [data.origin.value, data.origin.normalized_value],
    );
  }

  for (const w of data.wallets) {
    register(
      {
        entityId: w.entity_id,
        address: w.value,
        hop: w.hop,
        confidence: w.confidence,
        isRoot: w.entity_id === originId,
        chain: w.chain,
        sanctionProvenance: null,
        referenceEvidenceId: null,
      },
      [w.value, w.normalized_value],
    );
  }

  const edgeById = new Map<string, CryptoGraphEdge>();
  const childrenOf = new Map<number, number[]>();
  const parentsOf = new Map<number, number[]>();
  const inCount = new Map<number, number>();
  const outCount = new Map<number, number>();
  const fundingTxsOf = new Map<number, CryptoGraphTx[]>();

  const resolve = (addresses: string[]): number[] => {
    const ids = new Set<number>();
    for (const a of addresses) {
      const id = idByAddr.get(norm(a));
      if (id !== undefined) ids.add(id);
    }
    return [...ids];
  };

  for (const t of data.transactions) {
    const tx: CryptoGraphTx = {
      txid: t.txid,
      amount: t.amount,
      timestamp: t.timestamp,
      originalTz: t.original_tz,
      confidence: t.confidence,
      chain: t.chain,
    };
    const sources = resolve(t.source_addresses);
    const targets = resolve(t.target_addresses);
    for (const s of sources) {
      const sn = nodeById.get(s);
      if (!sn) continue;
      for (const tg of targets) {
        const tn = nodeById.get(tg);
        // Keep BOTH directions of real flow (money in and money out); skip only self-transfers. The
        // edge stays directional (source→target) — only the reveal traversal is direction-agnostic.
        if (!tn || s === tg) continue;

        const key = `${s}->${tg}`;
        const existing = edgeById.get(key);
        if (existing) existing.txCount += 1;
        else edgeById.set(key, { id: `ce_${s}_${tg}`, sourceId: s, targetId: tg, txCount: 1, rep: tx });

        pushUnique(childrenOf, s, tg);
        pushUnique(parentsOf, tg, s);
        outCount.set(s, (outCount.get(s) ?? 0) + 1);
        inCount.set(tg, (inCount.get(tg) ?? 0) + 1);
        const funding = fundingTxsOf.get(tg);
        if (funding) funding.push(tx);
        else fundingTxsOf.set(tg, [tx]);
      }
    }
  }

  // Direction-agnostic counterparties: union childrenOf ∪ parentsOf (deduped). The reveal walks
  // this so a wallet surfaces every counterparty it transacted with, inflow OR outflow.
  const neighborsOf = new Map<number, number[]>();
  for (const id of nodeById.keys()) {
    const union = new Set<number>([...(childrenOf.get(id) ?? []), ...(parentsOf.get(id) ?? [])]);
    if (union.size > 0) neighborsOf.set(id, [...union]);
  }

  const nodes = [...nodeById.values()];
  return {
    rootIds: nodes.filter((n) => n.hop === 0).map((n) => n.entityId),
    originId,
    nodes,
    edges: [...edgeById.values()],
    nodeById,
    childrenOf,
    parentsOf,
    neighborsOf,
    inCount,
    outCount,
    fundingTxsOf,
    maxHop: data.summary.max_hop,
  };
}

/**
 * Parent→child (outward-by-hop) children of a wallet: the counterparties it funded that sit at a
 * GREATER hop from the origin. This is the funding-flow TREE — the direction money moves away from
 * the sanctioned origin. Same-hop (lateral) and back-edges (toward the origin) are excluded, so the
 * graph reads as a clean parent→child flow instead of a reciprocal web. Derived from the real edges
 * the trace already returned — nothing is fabricated.
 */
export function outwardChildrenOf(model: CryptoGraphModel, entityId: number): number[] {
  const self = model.nodeById.get(entityId);
  if (self === undefined) return [];
  const children = model.childrenOf.get(entityId);
  if (children === undefined) return [];
  return children.filter((c) => {
    const cn = model.nodeById.get(c);
    return cn !== undefined && cn.hop > self.hop;
  });
}

/**
 * The DRAWABLE funding edges: every real transaction edge whose target sits at a GREATER hop than its
 * source — the money's real direction, oriented outward from the origin. Reciprocal, back-, and
 * same-hop edges (the cross-links that made the old graph a web) are dropped. This is a SUBSET of the
 * trace's real edges, never an invented one.
 */
export function parentChildEdges(model: CryptoGraphModel): CryptoGraphEdge[] {
  return model.edges.filter((e) => {
    const s = model.nodeById.get(e.sourceId);
    const t = model.nodeById.get(e.targetId);
    return s !== undefined && t !== undefined && t.hop > s.hop;
  });
}

/**
 * The set of node ids currently VISIBLE given which nodes are expanded. Progressive reveal down the
 * FUNDING TREE: the roots (and, since roots start expanded, their hop-1 children) are shown; a deeper
 * node appears only once a visible node is expanded. The walk follows the parent→child funding
 * direction ({@link outwardChildrenOf}), so every revealed wallet hangs off a drawn parent→child
 * edge — the graph stays a flow, never a web, and no node is ever revealed as an orphan. This keeps a
 * 275-node trace legible: you explore it hop by hop instead of dumping every node at once.
 */
export function computeVisibleNodes(
  model: CryptoGraphModel,
  expanded: ReadonlySet<number>,
): Set<number> {
  const visible = new Set<number>();
  const stack = [...model.rootIds];
  for (const r of model.rootIds) visible.add(r);
  while (stack.length > 0) {
    const n = stack.pop() as number;
    if (!expanded.has(n)) continue;
    for (const c of outwardChildrenOf(model, n)) {
      if (!visible.has(c)) {
        visible.add(c);
        stack.push(c);
      }
    }
  }
  return visible;
}

/** How many of a node's parent→child (outward funding) children are hidden — drives `+N`. */
export function hiddenChildCount(
  model: CryptoGraphModel,
  entityId: number,
  visible: ReadonlySet<number>,
): number {
  return outwardChildrenOf(model, entityId).reduce(
    (acc, c) => (visible.has(c) ? acc : acc + 1),
    0,
  );
}
