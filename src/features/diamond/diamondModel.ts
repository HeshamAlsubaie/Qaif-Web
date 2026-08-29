/**
 * The Diamond Model of Intrusion Analysis — pure, tier-preserving mapping from the case's
 * high-level entities (GET /cases/{id}/graph, already crypto-filtered) onto the four vertices.
 *
 * The vertex mapping is an EXPLICIT, DOCUMENTED forensic table (below), not a magic switch: each
 * canonical entity type is assigned to exactly one vertex. A type NOT in the table is never forced
 * onto a vertex — it becomes `unclassified` and is disclosed, never hidden or crashed on. Nothing is
 * fabricated: every entity and every relationship keeps the tier the graph gave it (R4), so a
 * suspected adversary renders probabilistic (amber/dashed) and can never be laundered into a
 * confirmed one.
 */
import type { GraphEdge, GraphNode, GraphResponse } from '@/types/api';

export type DiamondVertexKey = 'adversary' | 'capability' | 'infrastructure' | 'victim';

export const VERTEX_ORDER: DiamondVertexKey[] = [
  'adversary',
  'capability',
  'infrastructure',
  'victim',
];

export const VERTEX_LABEL: Record<DiamondVertexKey, string> = {
  adversary: 'Adversary',
  capability: 'Capability',
  infrastructure: 'Infrastructure',
  victim: 'Victim',
};

/**
 * entity_type → Diamond vertex. THE forensic model, made explicit:
 *   - ADVERSARY (top) — who is behind the intrusion (attribution; typically probabilistic).
 *   - CAPABILITY (left) — the tooling/malware they use.
 *   - INFRASTRUCTURE (right) — the network reach observed in the evidence.
 *   - VICTIM (bottom) — the target organisation.
 * Any type omitted here is intentionally NOT mapped (it lands in `unclassified`).
 */
export const VERTEX_FOR_TYPE: Readonly<Record<string, DiamondVertexKey>> = {
  ThreatActor: 'adversary',
  Alias: 'adversary',
  MalwareFamily: 'capability',
  FileHash: 'capability',
  Domain: 'infrastructure',
  IP: 'infrastructure',
  URL: 'infrastructure',
  OnionAddress: 'infrastructure',
  VictimOrg: 'victim',
};

/** The vertex for a type, or `null` when the type is not part of the Diamond mapping. */
export function vertexForType(entityType: string): DiamondVertexKey | null {
  return VERTEX_FOR_TYPE[entityType] ?? null;
}

export interface DiamondModel {
  vertices: Record<DiamondVertexKey, GraphNode[]>;
  /** Entities whose type is not in the mapping table — disclosed, never forced onto a vertex. */
  unclassified: GraphNode[];
  /** Relationships whose BOTH endpoints are placed entities — the drawable Diamond edges. */
  edges: GraphEdge[];
  /** Ids of every entity placed on a vertex. */
  placedIds: Set<number>;
}

/**
 * Group the graph's entities onto the four vertices by the mapping table, and keep only the
 * relationships whose both endpoints are placed (so no edge dangles at an unmapped node). Cross- and
 * within-vertex edges are both retained — they are the Diamond's connecting axes and internal
 * structure. Order within each vertex follows the graph's node order (stable).
 */
export function buildDiamondModel(graph: GraphResponse): DiamondModel {
  const vertices: Record<DiamondVertexKey, GraphNode[]> = {
    adversary: [],
    capability: [],
    infrastructure: [],
    victim: [],
  };
  const unclassified: GraphNode[] = [];
  const placedIds = new Set<number>();

  for (const node of graph.nodes) {
    const vk = vertexForType(node.entity_type);
    if (vk === null) {
      unclassified.push(node);
      continue;
    }
    vertices[vk].push(node);
    placedIds.add(node.entity_id);
  }

  const edges = graph.edges.filter(
    (e) => placedIds.has(e.source_entity_id) && placedIds.has(e.target_entity_id),
  );

  return { vertices, unclassified, edges, placedIds };
}
