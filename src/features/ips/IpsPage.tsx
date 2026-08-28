import { type ColumnDef } from '@tanstack/react-table';
import { ArrowRight, Info } from 'lucide-react';

import { useGraph } from '@/api/queries';
import { CaseScoped } from '@/components/common/CaseScoped';
import { DataTable } from '@/components/common/DataTable';
import { EvidenceCite } from '@/components/common/EvidenceCite';
import { QueryBoundary } from '@/components/common/QueryBoundary';
import { TierBadge } from '@/components/forensic/TierBadge';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { type GraphEdge, type GraphNode, type GraphResponse } from '@/types/api';

// Network-shaped entity types. Other entity types (wallets, files, actors…) live in their own
// sections; this page is the IP / DNS / URL surface.
const NETWORK_TYPES = new Set([
  'IP',
  'Domain',
  'URL',
  'WebResource',
  'OnionAddress',
  'CloudResource',
]);

interface EdgeRow extends GraphEdge {
  sourceLabel: string;
  targetLabel: string;
}

function entityColumns(degreeOf: (id: number) => number): ColumnDef<GraphNode, unknown>[] {
  return [
    {
      accessorKey: 'value',
      header: 'Entity',
      cell: ({ row }) => {
        const n = row.original;
        return (
          <div className="flex flex-col">
            <span className="font-mono text-foreground">{n.value}</span>
            {n.normalized_value !== n.value && (
              <span className="font-mono text-micro text-muted-foreground">
                norm: {n.normalized_value}
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'entity_type',
      header: 'Type',
      cell: ({ getValue }) => <Badge variant="outline">{getValue() as string}</Badge>,
    },
    {
      id: 'connections',
      header: 'Links',
      accessorFn: (n) => degreeOf(n.entity_id),
      cell: ({ getValue }) => (
        <span className="font-mono tabular-nums text-muted-foreground">{getValue() as number}</span>
      ),
    },
    {
      id: 'evidence',
      header: 'Evidence',
      accessorFn: (n) => n.cited_evidence_ids.length,
      cell: ({ row }) => <EvidenceCite ids={row.original.cited_evidence_ids} />,
    },
    {
      id: 'tier',
      header: 'Tier',
      enableSorting: false,
      cell: ({ row }) => <TierBadge tier={row.original.tier} />,
    },
  ];
}

const EDGE_COLUMNS: ColumnDef<EdgeRow, unknown>[] = [
  {
    id: 'relationship',
    header: 'Relationship',
    cell: ({ row }) => {
      const e = row.original;
      return (
        <div className="flex items-center gap-2 text-body">
          <span className="font-mono text-foreground">{e.sourceLabel}</span>
          <span className="inline-flex items-center gap-1 rounded bg-surface-3 px-1.5 py-0.5 text-micro font-semibold uppercase tracking-wide text-muted-foreground">
            {e.rel_type}
            <ArrowRight className="size-3" aria-hidden />
          </span>
          <span className="font-mono text-foreground">{e.targetLabel}</span>
        </div>
      );
    },
  },
  {
    id: 'evidence',
    header: 'Evidence',
    accessorFn: (e) => e.evidence_id,
    cell: ({ row }) => <EvidenceCite ids={[row.original.evidence_id]} />,
  },
  {
    id: 'confidence',
    header: 'Confidence',
    accessorFn: (e) => e.confidence ?? -1,
    cell: ({ row }) =>
      row.original.confidence === null ? (
        <span className="text-muted-foreground">—</span>
      ) : (
        <span className="font-mono text-caption text-probabilistic">
          ~{Math.round(row.original.confidence * 100)}%
        </span>
      ),
  },
  {
    id: 'tier',
    header: 'Tier',
    enableSorting: false,
    cell: ({ row }) => <TierBadge tier={row.original.tier} confidence={row.original.confidence} />,
  },
];

function IpsBody({ data }: { data: GraphResponse }) {
  const networkNodes = data.nodes.filter((n) => NETWORK_TYPES.has(n.entity_type));
  const labelOf = new Map(data.nodes.map((n) => [n.entity_id, n.value]));
  const netIds = new Set(networkNodes.map((n) => n.entity_id));

  const degree = new Map<number, number>();
  for (const e of data.edges) {
    degree.set(e.source_entity_id, (degree.get(e.source_entity_id) ?? 0) + 1);
    degree.set(e.target_entity_id, (degree.get(e.target_entity_id) ?? 0) + 1);
  }
  const degreeOf = (id: number) => degree.get(id) ?? 0;

  // Edges touching at least one network entity.
  const edgeRows: EdgeRow[] = data.edges
    .filter((e) => netIds.has(e.source_entity_id) || netIds.has(e.target_entity_id))
    .map((e) => ({
      ...e,
      sourceLabel: labelOf.get(e.source_entity_id) ?? `#${e.source_entity_id}`,
      targetLabel: labelOf.get(e.target_entity_id) ?? `#${e.target_entity_id}`,
    }));

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader>
          <span className="type-label">Entities</span>
          <CardTitle>Network entities · {networkNodes.length}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={entityColumns(degreeOf)}
            data={networkNodes}
            getRowId={(n) => String(n.entity_id)}
            initialSorting={[{ id: 'entity_type', desc: false }]}
          />
        </CardContent>
      </Card>

      {edgeRows.length > 0 && (
        <Card>
          <CardHeader>
            <span className="type-label">Relationships</span>
            <CardTitle>Connections · {edgeRows.length}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable
              columns={EDGE_COLUMNS}
              data={edgeRows}
              getRowId={(e) => String(e.relationship_id)}
            />
          </CardContent>
        </Card>
      )}

      <div className="flex items-start gap-2 text-micro text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        <span>
          OSINT enrichment and first/last-seen are not part of the current read API contract, so
          they are not shown here rather than fabricated. Each entity carries its tier from the
          graph.
        </span>
      </div>
    </div>
  );
}

/** IPs / Network — the network entity surface (IP / Domain / URL …) and their relationships. */
export function IpsPage() {
  return (
    <CaseScoped
      kicker="Findings"
      title="IPs / Network"
      sub="Network entities and their relationships, tier-carried."
    >
      {(caseId) => <IpsQuery caseId={caseId} />}
    </CaseScoped>
  );
}

function IpsQuery({ caseId }: { caseId: number }) {
  const graph = useGraph(caseId);
  return (
    <QueryBoundary
      query={graph}
      loadingMessage="Loading network entities…"
      isEmpty={(d) => d.nodes.filter((n) => NETWORK_TYPES.has(n.entity_type)).length === 0}
      emptyTitle="No network entities"
      emptyMessage="This case has no IP / domain / URL entities yet."
    >
      {(data) => <IpsBody data={data} />}
    </QueryBoundary>
  );
}
