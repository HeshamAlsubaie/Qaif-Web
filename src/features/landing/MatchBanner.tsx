import { ArrowRight, Link2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useSelectedCase } from '@/app/CaseContext';
import { TierBadge } from '@/components/forensic/TierBadge';
import { Badge } from '@/components/ui/badge';
import type { MatchResponse } from '@/types/api';

/**
 * The cross-case EXACT-match callout: "this indicator already appears in case #N". It fires only on
 * a genuine prior appearance (`GET /match`, exact normalized-value equality — no false positives by
 * construction), sits ABOVE the free-lookup results, and is dismissible. Clicking a case enters it
 * (setCaseId → the console), turning a free search into the case it belongs to.
 *
 * This is NOT a lookup result and carries NO external-claim styling: a match is QAIF's OWN record
 * that this exact indicator is already an entity in an existing case, shown with that entity's R4
 * tier — a strong, internal signal, distinct from the third-party claims in the results below.
 */

interface CaseGroup {
  caseId: number;
  caseTitle: string;
  hits: MatchResponse['matches'];
}

/** Group the matched entities by case — the same indicator may appear in several cases. */
function groupByCase(matches: MatchResponse['matches']): CaseGroup[] {
  const byCase = new Map<number, CaseGroup>();
  for (const m of matches) {
    const existing = byCase.get(m.case_id);
    if (existing) existing.hits.push(m);
    else byCase.set(m.case_id, { caseId: m.case_id, caseTitle: m.case_title, hits: [m] });
  }
  return [...byCase.values()];
}

export function MatchBanner({ data, onDismiss }: { data: MatchResponse; onDismiss: () => void }) {
  const navigate = useNavigate();
  const { setCaseId } = useSelectedCase();
  const groups = groupByCase(data.matches);

  const enterCase = (caseId: number) => {
    setCaseId(caseId);
    navigate('/overview');
  };

  const caseWord = groups.length === 1 ? 'case' : 'cases';

  return (
    <div className="rounded-lg border border-primary/40 bg-primary/10 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <Link2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
          <div className="flex flex-col gap-0.5">
            <span className="text-body font-semibold text-foreground">
              Seen before — this indicator already appears in {groups.length} existing {caseWord}.
            </span>
            <span className="type-caption">
              An exact match on{' '}
              <span className="break-all font-mono text-foreground">{data.normalized}</span> against
              QAIF’s own case records. Open a case to continue the investigation there.
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss match notice"
          className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {groups.map((g) => (
          <button
            key={g.caseId}
            type="button"
            onClick={() => enterCase(g.caseId)}
            className="group flex items-center justify-between gap-3 rounded-md border border-border bg-surface-0 px-3 py-2 text-left transition-colors hover:border-primary/50 hover:bg-surface-1"
          >
            <span className="flex min-w-0 flex-col">
              <span className="flex items-center gap-2">
                <span className="font-mono text-micro font-semibold text-primary">
                  case #{g.caseId}
                </span>
                <span className="truncate text-body text-foreground">{g.caseTitle}</span>
              </span>
              <span className="mt-1 flex flex-wrap items-center gap-1.5">
                {g.hits.map((h) => (
                  <span key={h.entity_id} className="flex items-center gap-1">
                    <Badge variant="outline">{h.entity_type}</Badge>
                    <TierBadge tier={h.tier} confidence={null} />
                  </span>
                ))}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-1 text-micro font-semibold text-primary">
              Open
              <ArrowRight
                className="size-4 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
                aria-hidden
              />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
