import { Scissors } from 'lucide-react';

import { TierBadge } from '@/components/forensic/TierBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatUtc } from '@/lib/format';
import type { CryptoTraceFinding } from '@/types/api';

/**
 * The trace's findings — the summary note plus the honest breadth-truncation disclosures. All are
 * probabilistic (R4); the truncation ones are flagged so the "fan-out was capped here" admissions
 * read as first-class findings, not footnotes. Truncation findings sort first.
 */
export function CryptoFindings({ findings }: { findings: CryptoTraceFinding[] }) {
  if (findings.length === 0) return null;
  const ordered = [...findings].sort(
    (a, b) => Number(b.truncation) - Number(a.truncation) || a.finding_id - b.finding_id,
  );

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2 space-y-0">
        <CardTitle className="text-probabilistic">Trace findings & method notes</CardTitle>
        <span className="text-caption tabular-nums text-muted-foreground">· {findings.length}</span>
      </CardHeader>
      <CardContent className="flex flex-col divide-y divide-border/60 p-0">
        {ordered.map((f) => (
          <div key={f.finding_id} className="flex flex-col gap-1.5 p-4">
            <div className="flex flex-wrap items-center gap-2">
              {f.truncation && (
                <span className="inline-flex items-center gap-1 rounded border border-probabilistic/40 bg-probabilistic/10 px-1.5 py-0.5 text-micro font-semibold uppercase tracking-wide text-probabilistic">
                  <Scissors className="size-3" aria-hidden />
                  Truncation
                </span>
              )}
              <span className="font-medium text-foreground">{f.title}</span>
              <TierBadge tier="probabilistic" confidence={f.confidence} className="ml-auto" />
            </div>
            <span className="type-caption">{f.description}</span>
            {(f.method_description || f.limitations) && (
              <span className="mt-0.5 text-micro text-muted-foreground">
                {f.method_description && (
                  <>
                    <span className="font-semibold uppercase tracking-wide">Method:</span>{' '}
                    {f.method_description}
                  </>
                )}
                {f.method_description && f.limitations && ' · '}
                {f.limitations && (
                  <>
                    <span className="font-semibold uppercase tracking-wide">Limits:</span>{' '}
                    {f.limitations}
                  </>
                )}
              </span>
            )}
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-micro text-muted-foreground">
              <span className="font-mono">{formatUtc(f.observed_at)}</span>
              <span className="font-mono uppercase">{f.module_id}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
