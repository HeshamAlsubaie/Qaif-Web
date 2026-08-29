import { BadgeCheck, Bot, CircleDashed, HardDriveDownload, Network, Waypoints } from 'lucide-react';

import { useCase, useEvidence, useFindings, useGraph, useSuggestions } from '@/api/queries';
import { useSelectedCase } from '@/app/CaseContext';
import { MetricTile } from '@/components/common/MetricTile';
import { NoCaseSelected } from '@/components/common/NoCaseSelected';
import { PageHeader } from '@/components/common/PageHeader';
import { QueryBoundary } from '@/components/common/QueryBoundary';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { DiamondGraph } from '@/features/diamond/DiamondGraph';
import { ActivityFeed } from '@/features/overview/ActivityFeed';
import { CaseHeaderCard } from '@/features/overview/CaseHeaderCard';
import { FindingsSummary } from '@/features/overview/FindingsSummary';
import { type CaseSummaryResponse } from '@/types/api';

function MetricSkeletons() {
  return (
    <div className="mb-5 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="flex flex-col gap-3 p-4">
          <span className="h-3 w-16 animate-pulse rounded bg-surface-3" />
          <span className="h-7 w-12 animate-pulse rounded bg-surface-3" />
        </Card>
      ))}
    </div>
  );
}

function Metrics({ data, pending }: { data: CaseSummaryResponse; pending: number | null }) {
  const c = data.counts;
  return (
    <div className="mb-5 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
      <MetricTile label="Evidence" value={c.evidence} icon={HardDriveDownload} accent="accent" />
      <MetricTile label="Entities" value={c.entities} icon={Waypoints} accent="accent" />
      <MetricTile label="Relationships" value={c.relationships} icon={Network} accent="accent" />
      <MetricTile
        label="Confirmed"
        value={c.confirmed_findings}
        icon={BadgeCheck}
        accent="confirmed"
        hint="verified findings (R4)"
      />
      <MetricTile
        label="Probabilistic"
        value={c.probabilistic_findings}
        icon={CircleDashed}
        accent="probabilistic"
        hint="inference, scored (R4)"
      />
      <MetricTile
        label="AI suggestions"
        value={c.ai_suggestions}
        icon={Bot}
        accent="ai"
        hint={pending !== null ? `${pending} pending review` : 'quarantined (R6)'}
      />
    </div>
  );
}

/**
 * The Overview / dashboard — the fully-built landing page. Each panel owns its own query state, so
 * a partial API failure degrades one panel rather than blanking the whole page.
 */
export function OverviewPage() {
  const { caseId } = useSelectedCase();

  const caseQuery = useCase(caseId);
  const graphQuery = useGraph(caseId);
  const findingsQuery = useFindings(caseId);
  const suggestionsQuery = useSuggestions(caseId);
  const evidenceQuery = useEvidence(caseId);

  if (caseId === null) {
    return (
      <>
        <PageHeader kicker="Case" title="Overview" sub="National DFIR intelligence platform" />
        <NoCaseSelected />
      </>
    );
  }

  const pending = suggestionsQuery.data?.items.filter((s) => s.awaiting_review).length ?? null;

  return (
    <>
      <PageHeader
        kicker="Case"
        title="Overview"
        sub={caseQuery.data ? caseQuery.data.case_number : `Case #${caseId}`}
      />

      {/* Case identity — the hero element */}
      <QueryBoundary query={caseQuery} loadingMessage="Loading case…">
        {(data) => <CaseHeaderCard data={data} />}
      </QueryBoundary>

      {/* Key counts */}
      {caseQuery.isPending ? (
        <MetricSkeletons />
      ) : caseQuery.isSuccess ? (
        <Metrics data={caseQuery.data} pending={pending} />
      ) : null}

      {/* Diamond model — the shared diamond GRAPH lens (same renderer as the Graph view's Diamond
          layout), tier-correct, full width. A graph needs vertical room, so it gets a tall panel. */}
      <div className="mb-5">
        <Card className="overflow-hidden">
          <CardHeader className="space-y-1">
            <span className="type-label">Analytic pivot</span>
            <CardTitle>Diamond Model</CardTitle>
          </CardHeader>
          <div className="p-3">
            <QueryBoundary
              query={graphQuery}
              loadingMessage="Loading the Diamond Model…"
              isEmpty={(d) => d.nodes.length === 0}
              emptyTitle="No entities to place on the Diamond"
              emptyMessage="This case has no high-level entities yet. When modules produce entities, they are placed on the Adversary / Capability / Infrastructure / Victim vertices here."
            >
              {(data) => <DiamondGraph graph={data} stageClassName="h-[58vh] min-h-[460px]" />}
            </QueryBoundary>
          </div>
        </Card>
      </div>

      {/* Findings + activity */}
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        <QueryBoundary query={findingsQuery} loadingMessage="Loading findings…">
          {(data) => <FindingsSummary data={data} />}
        </QueryBoundary>

        {evidenceQuery.isError ? (
          <QueryBoundary query={evidenceQuery}>{() => null}</QueryBoundary>
        ) : (
          <ActivityFeed
            evidence={evidenceQuery.data}
            findings={findingsQuery.data}
            suggestions={suggestionsQuery.data}
          />
        )}
      </div>
    </>
  );
}
