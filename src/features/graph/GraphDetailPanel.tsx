/**
 * The slide-in inspector for a clicked node or edge. It renders ONLY what the graph payload actually
 * carries — no invented fields:
 *   - a node with no `cited_evidence_ids` is shown honestly as an ungrounded orphan, never dressed
 *     up as if it were evidence-backed;
 *   - "source module" is NOT part of the graph node payload, so instead of fabricating one we say so
 *     and point to where provenance actually lives (Evidence / Findings).
 * The tier is always shown with the shared TierBadge primitive (R4), so this panel and the canvas
 * agree on the confirmed/probabilistic call.
 */
import { ArrowDown, Info, X } from 'lucide-react';
import * as React from 'react';

import { EvidenceCite } from '@/components/common/EvidenceCite';
import { TierBadge } from '@/components/forensic/TierBadge';
import { Button } from '@/components/ui/button';
import { SendToBoardButton } from '@/features/board/SendToBoardButton';
import { pinFromEntity } from '@/features/board/boardModel';
import type { GraphEdge, GraphNode, GraphResponse } from '@/types/api';

import { entityVisual } from './graphModel';

export type GraphSelection =
  | { kind: 'node'; node: GraphNode }
  | { kind: 'edge'; edge: GraphEdge };

interface GraphDetailPanelProps {
  selection: GraphSelection;
  graph: GraphResponse;
  onClose: () => void;
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-micro font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="text-body text-foreground">{children}</div>
    </div>
  );
}

function EntityRef({ node }: { node: GraphNode | undefined }) {
  if (!node) return <span className="text-muted-foreground">—</span>;
  const Icon = entityVisual(node.entity_type).icon;
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="flex min-w-0 flex-col">
        <span className="truncate font-mono text-body text-foreground">{node.value}</span>
        <span className="text-micro text-muted-foreground">{node.entity_type}</span>
      </div>
    </div>
  );
}

function NodeDetail({ node }: { node: GraphNode }) {
  const Icon = entityVisual(node.entity_type).icon;
  const grounded = node.cited_evidence_ids.length > 0;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="size-5 text-foreground" aria-hidden />
          <span className="text-body font-medium text-foreground">{node.entity_type}</span>
        </div>
        <TierBadge tier={node.tier} />
      </div>

      <div className="rounded-md border border-border bg-surface-2 p-3">
        <span className="text-micro font-medium uppercase tracking-wider text-muted-foreground">
          Value
        </span>
        <p className="mt-1 break-all font-mono text-body-lg text-foreground">{node.value}</p>
        {node.normalized_value !== node.value && (
          <p className="mt-1 break-all font-mono text-caption text-muted-foreground">
            normalized: {node.normalized_value}
          </p>
        )}
      </div>

      <MetaRow label="Entity ID">
        <span className="font-mono tabular-nums">#{node.entity_id}</span>
      </MetaRow>

      {/* Pin a REFERENCE to this entity onto the investigation board — client analysis, no write. */}
      <SendToBoardButton seed={pinFromEntity(node)} />

      <div className="flex flex-col gap-1.5">
        <span className="text-micro font-medium uppercase tracking-wider text-muted-foreground">
          Evidence back-refs
        </span>
        {grounded ? (
          <EvidenceCite ids={node.cited_evidence_ids} flagIfMissing={node.tier === 'confirmed'} />
        ) : (
          <div className="flex items-start gap-2 rounded-md border border-border bg-surface-2 p-2.5 text-caption text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <span>
              Orphan — this entity has no evidence back-references in the case graph. It is shown as
              ungrounded, not implied to be evidence-backed.
            </span>
          </div>
        )}
      </div>

      <div className="flex items-start gap-2 border-t border-border/60 pt-3 text-micro leading-snug text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        <span>
          Source-module provenance is not carried on the graph node payload; it lives with the
          entity in the Evidence and Findings views. It is not fabricated here.
        </span>
      </div>
    </div>
  );
}

function EdgeDetail({ edge, graph }: { edge: GraphEdge; graph: GraphResponse }) {
  const byId = new Map(graph.nodes.map((n) => [n.entity_id, n]));
  const source = byId.get(edge.source_entity_id);
  const target = byId.get(edge.target_entity_id);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <span className="rounded bg-surface-3 px-2 py-0.5 font-mono text-caption font-semibold uppercase tracking-wide text-foreground">
          {edge.rel_type}
        </span>
        <TierBadge tier={edge.tier} confidence={edge.confidence} />
      </div>

      <div className="rounded-md border border-border bg-surface-2 p-3">
        <span className="text-micro font-medium uppercase tracking-wider text-muted-foreground">
          Relationship
        </span>
        <div className="mt-2 flex flex-col gap-2">
          <EntityRef node={source} />
          <ArrowDown className="ml-1 size-4 text-muted-foreground" aria-hidden />
          <EntityRef node={target} />
        </div>
      </div>

      <MetaRow label="Confidence">
        {edge.tier === 'probabilistic' && edge.confidence !== null ? (
          <span className="font-mono text-probabilistic">~{Math.round(edge.confidence * 100)}%</span>
        ) : (
          <span className="text-muted-foreground">
            — <span className="text-micro">(not a scored inference)</span>
          </span>
        )}
      </MetaRow>

      <div className="flex flex-col gap-1.5">
        <span className="text-micro font-medium uppercase tracking-wider text-muted-foreground">
          Evidence back-ref
        </span>
        <EvidenceCite ids={[edge.evidence_id]} />
      </div>

      <MetaRow label="Relationship ID">
        <span className="font-mono tabular-nums">#{edge.relationship_id}</span>
      </MetaRow>
    </div>
  );
}

export function GraphDetailPanel({ selection, graph, onClose }: GraphDetailPanelProps) {
  const kicker = selection.kind === 'node' ? 'Entity' : 'Relationship';
  return (
    <aside
      className="absolute inset-y-0 right-0 z-10 flex w-[340px] max-w-[85%] flex-col border-l border-border bg-surface-1/95 shadow-2xl backdrop-blur duration-200 animate-in slide-in-from-right-4 fade-in"
      aria-label={`${kicker} detail`}
    >
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <span className="text-micro font-semibold uppercase tracking-wider text-primary">
          {kicker}
        </span>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close detail panel">
          <X aria-hidden />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {selection.kind === 'node' ? (
          <NodeDetail node={selection.node} />
        ) : (
          <EdgeDetail edge={selection.edge} graph={graph} />
        )}
      </div>
    </aside>
  );
}
