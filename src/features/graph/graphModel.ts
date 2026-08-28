/**
 * Graph domain model: maps the API graph payload to Cytoscape elements, and each canonical entity
 * type to a node SHAPE (canvas) + icon (detail panel).
 *
 * TIER IS NEVER CARRIED BY SHAPE. Shape only hints the entity's KIND (Domain vs IP vs Wallet …).
 * The confirmed/probabilistic distinction is carried by the solid-vs-dashed + colour treatment in
 * graphStyle.ts (R4), so that the tier still reads if a screenshot is printed in grayscale.
 *
 * Nothing here invents data: every element is built from a validated GraphNode / GraphEdge, and the
 * original object is stashed on the element `data` so the detail panel renders the REAL record.
 */
import {
  AppWindow,
  AtSign,
  Bug,
  Circle,
  Cloud,
  Coins,
  Cpu,
  FileDigit,
  Fingerprint,
  Globe,
  HardDrive,
  KeyRound,
  Link,
  Lock,
  Mail,
  Network,
  Phone,
  Radio,
  Server,
  ShieldAlert,
  Skull,
  Target,
  User,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

import type { ElementDefinition } from 'cytoscape';

import type { GraphEdge, GraphNode, GraphResponse } from '@/types/api';

/** Cytoscape built-in node shapes we use to hint entity kind. */
export type CyShape =
  | 'ellipse'
  | 'round-rectangle'
  | 'rectangle'
  | 'diamond'
  | 'hexagon'
  | 'octagon'
  | 'pentagon'
  | 'star'
  | 'tag';

export interface EntityVisual {
  shape: CyShape;
  icon: LucideIcon;
}

/**
 * Canonical entity types (CLAUDE.md §5) → visual. Adding a type here is presentation only; it never
 * introduces a new entity type (those live in the shared schema).
 */
const ENTITY_VISUALS: Record<string, EntityVisual> = {
  IP: { shape: 'ellipse', icon: Network },
  Domain: { shape: 'round-rectangle', icon: Globe },
  URL: { shape: 'round-rectangle', icon: Link },
  WebResource: { shape: 'round-rectangle', icon: AppWindow },
  FileHash: { shape: 'hexagon', icon: FileDigit },
  Wallet: { shape: 'diamond', icon: Wallet },
  Transaction: { shape: 'diamond', icon: Coins },
  EmailAddress: { shape: 'tag', icon: AtSign },
  EmailMessage: { shape: 'tag', icon: Mail },
  PhoneNumber: { shape: 'tag', icon: Phone },
  Account: { shape: 'ellipse', icon: User },
  Identity: { shape: 'ellipse', icon: Fingerprint },
  Alias: { shape: 'ellipse', icon: User },
  AccessKey: { shape: 'pentagon', icon: KeyRound },
  OAuthApp: { shape: 'pentagon', icon: AppWindow },
  SessionToken: { shape: 'pentagon', icon: Lock },
  LeakedCredential: { shape: 'pentagon', icon: KeyRound },
  CloudResource: { shape: 'octagon', icon: Cloud },
  Device: { shape: 'rectangle', icon: HardDrive },
  Process: { shape: 'rectangle', icon: Cpu },
  Mutex: { shape: 'rectangle', icon: Lock },
  RegistryKey: { shape: 'rectangle', icon: Server },
  OnionAddress: { shape: 'round-rectangle', icon: Radio },
  VictimOrg: { shape: 'star', icon: ShieldAlert },
  ThreatActor: { shape: 'star', icon: Skull },
  Campaign: { shape: 'star', icon: Target },
  MalwareFamily: { shape: 'hexagon', icon: Bug },
};

const FALLBACK_VISUAL: EntityVisual = { shape: 'ellipse', icon: Circle };

/** Visual for an entity type; falls back to a neutral shape for any type without a mapping. */
export function entityVisual(entityType: string): EntityVisual {
  return ENTITY_VISUALS[entityType] ?? FALLBACK_VISUAL;
}

export const nodeElementId = (entityId: number): string => `n${entityId}`;
export const edgeElementId = (relationshipId: number): string => `e${relationshipId}`;

/**
 * Build Cytoscape elements from a validated graph response. Each element carries `tier` (drives the
 * R4 styling) and the full source record (`node` / `edge`) for the detail panel. No fabrication:
 * one element per real node/edge, nothing added.
 */
export function toElements(graph: GraphResponse): ElementDefinition[] {
  const nodes: ElementDefinition[] = graph.nodes.map((n: GraphNode) => ({
    group: 'nodes',
    data: {
      id: nodeElementId(n.entity_id),
      label: n.value,
      tier: n.tier,
      etype: n.entity_type,
      shape: entityVisual(n.entity_type).shape,
      node: n,
    },
  }));

  const edges: ElementDefinition[] = graph.edges.map((e: GraphEdge) => ({
    group: 'edges',
    data: {
      id: edgeElementId(e.relationship_id),
      source: nodeElementId(e.source_entity_id),
      target: nodeElementId(e.target_entity_id),
      label: e.rel_type,
      tier: e.tier,
      edge: e,
    },
  }));

  return [...nodes, ...edges];
}
