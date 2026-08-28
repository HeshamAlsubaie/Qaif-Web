import { TierBadge } from '@/components/forensic/TierBadge';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { type FindingResponse, type FindingsResponse, type Tier } from '@/types/api';

function Row({ finding, tier }: { finding: FindingResponse; tier: Tier }) {
  return (
    <div className="flex flex-col gap-2 border-b border-border/60 py-3 last:border-b-0">
      <div className="flex items-center justify-between gap-3">
        <span className="text-body font-semibold text-foreground">{finding.title}</span>
        <TierBadge tier={tier} confidence={finding.confidence} showLabel={false} />
      </div>
      <span className="type-caption">{finding.description}</span>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" title="Source module">
          {finding.module_id}
        </Badge>
        <Badge variant="muted">severity: {finding.severity}</Badge>
      </div>
    </div>
  );
}

/**
 * A tier-separated findings summary (R4). Confirmed and probabilistic are shown in DISTINCT blocks
 * — never merged into one ranked list — so a probabilistic inference can never read as confirmed.
 */
export function FindingsSummary({ data }: { data: FindingsResponse }) {
  const confirmed = data.confirmed.slice(0, 4);
  const probabilistic = data.probabilistic.slice(0, 4);
  const empty = confirmed.length === 0 && probabilistic.length === 0;

  return (
    <Card>
      <CardHeader>
        <span className="type-label">Tier-separated (R4)</span>
        <CardTitle>Findings</CardTitle>
      </CardHeader>
      <CardContent>
        {empty ? (
          <span className="type-caption">No findings recorded for this case yet.</span>
        ) : (
          <div className="flex flex-col">
            <span className="pb-1 text-micro font-semibold uppercase tracking-wider text-confirmed">
              Confirmed · {data.confirmed.length}
            </span>
            {confirmed.length === 0 ? (
              <span className="py-2 text-body italic text-muted-foreground/70">
                No confirmed findings.
              </span>
            ) : (
              confirmed.map((f) => <Row key={f.finding_id} finding={f} tier="confirmed" />)
            )}

            <span className="pb-1 pt-4 text-micro font-semibold uppercase tracking-wider text-probabilistic">
              Probabilistic · {data.probabilistic.length}
            </span>
            {probabilistic.length === 0 ? (
              <span className="py-2 text-body italic text-muted-foreground/70">
                No probabilistic findings.
              </span>
            ) : (
              probabilistic.map((f) => <Row key={f.finding_id} finding={f} tier="probabilistic" />)
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
