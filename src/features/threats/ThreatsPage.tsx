import { type ColumnDef } from '@tanstack/react-table';
import { BadgeCheck, CircleDashed } from 'lucide-react';

import { useFindings } from '@/api/queries';
import { CaseScoped } from '@/components/common/CaseScoped';
import { DataTable } from '@/components/common/DataTable';
import { EvidenceCite } from '@/components/common/EvidenceCite';
import { QueryBoundary } from '@/components/common/QueryBoundary';
import { TierBadge } from '@/components/forensic/TierBadge';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { type FindingResponse, type Tier } from '@/types/api';

function buildColumns(tier: Tier): ColumnDef<FindingResponse, unknown>[] {
  const cols: ColumnDef<FindingResponse, unknown>[] = [
    {
      accessorKey: 'title',
      header: 'Finding',
      cell: ({ row }) => {
        const f = row.original;
        return (
          <div className="flex max-w-md flex-col gap-1">
            <span className="font-medium text-foreground">{f.title}</span>
            {/* The finding's own description — data (what the finding says), not UI prose. */}
            {f.description && <span className="type-caption">{f.description}</span>}
          </div>
        );
      },
    },
    {
      accessorKey: 'severity',
      header: 'Severity',
      cell: ({ getValue }) => <Badge variant="muted">{getValue() as string}</Badge>,
    },
    {
      id: 'evidence',
      header: 'Evidence',
      accessorFn: (f) => f.cited_evidence_ids.length,
      cell: ({ row }) => (
        <EvidenceCite ids={row.original.cited_evidence_ids} flagIfMissing={tier === 'confirmed'} />
      ),
    },
  ];

  if (tier === 'probabilistic') {
    cols.push({
      id: 'confidence',
      header: 'Confidence',
      accessorFn: (f) => f.confidence ?? -1,
      cell: ({ row }) => {
        const c = row.original.confidence;
        return c === null ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <span className="font-mono text-caption text-probabilistic">~{Math.round(c * 100)}%</span>
        );
      },
    });
  }

  cols.push({
    id: 'tier',
    header: 'Tier',
    enableSorting: false,
    cell: ({ row }) => (
      <TierBadge
        tier={tier}
        confidence={tier === 'probabilistic' ? row.original.confidence : null}
      />
    ),
  });

  return cols;
}

const CONFIRMED_COLUMNS = buildColumns('confirmed');
const PROBABILISTIC_COLUMNS = buildColumns('probabilistic');

function FindingsGroup({
  tier,
  count,
  findings,
  columns,
}: {
  tier: Tier;
  count: number;
  findings: FindingResponse[];
  columns: ColumnDef<FindingResponse, unknown>[];
}) {
  const isConfirmed = tier === 'confirmed';
  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2 space-y-0">
        {isConfirmed ? (
          <BadgeCheck className="size-4 text-confirmed" aria-hidden />
        ) : (
          <CircleDashed className="size-4 text-probabilistic" aria-hidden />
        )}
        <CardTitle className={isConfirmed ? 'text-confirmed' : 'text-probabilistic'}>
          {isConfirmed ? 'Confirmed' : 'Probabilistic'}
        </CardTitle>
        <span className="text-caption tabular-nums text-muted-foreground">· {count}</span>
      </CardHeader>
      <CardContent className="p-0">
        {findings.length === 0 ? (
          <div className="p-4">
            <span className="type-caption italic">
              No {isConfirmed ? 'confirmed' : 'probabilistic'} findings for this case.
            </span>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={findings}
            getRowId={(f) => String(f.finding_id)}
            initialSorting={[{ id: 'severity', desc: false }]}
          />
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Threats = the case findings, with CONFIRMED and PROBABILISTIC in SEPARATE tables — never merged
 * (R4). A confirmed finding with no evidence citation is flagged red, not shown as grounded.
 */
export function ThreatsPage() {
  return (
    <CaseScoped kicker="Findings" title="Threats">
      {(caseId) => <ThreatsBody caseId={caseId} />}
    </CaseScoped>
  );
}

function ThreatsBody({ caseId }: { caseId: number }) {
  const findings = useFindings(caseId);
  return (
    <QueryBoundary
      query={findings}
      loadingMessage="Loading findings…"
      isEmpty={(d) => d.confirmed.length === 0 && d.probabilistic.length === 0}
      emptyTitle="No findings"
      emptyMessage="This case has no recorded findings yet — nothing has been confirmed or inferred."
    >
      {(data) => (
        <div className="flex flex-col gap-5">
          <FindingsGroup
            tier="confirmed"
            count={data.confirmed.length}
            findings={data.confirmed}
            columns={CONFIRMED_COLUMNS}
          />
          <FindingsGroup
            tier="probabilistic"
            count={data.probabilistic.length}
            findings={data.probabilistic}
            columns={PROBABILISTIC_COLUMNS}
          />
        </div>
      )}
    </QueryBoundary>
  );
}
