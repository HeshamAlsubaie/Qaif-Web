import { CheckCircle2, Loader2, Plus, Search, ShieldCheck } from 'lucide-react';
import * as React from 'react';

import { useAddToCase, useIocLookup } from '@/api/queries';
import { LoadingState } from '@/components/common/States';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { IdleHint, IocResults, RequestErrorState } from '@/features/search/IocResults';
import { describeApiError } from '@/lib/apiError';
import { formatUtc, titleCase } from '@/lib/format';
import type { AddToCaseResponse, LookupSourceResult } from '@/types/api';

/**
 * The in-case "add a finding" surface — where looking becomes collecting under custody.
 *
 * An investigator types an indicator, runs `POST /lookup` (the SAME read-only fan-out as the free
 * search), and SEES the third-party claims first (via the shared {@link IocResults}). Only an
 * explicit "Add to this case" on a single source result COLLECTS it: `POST /cases/{id}/evidence`
 * seals that one result as intel-snapshot evidence under ONE ACQUIRED custody event (R3). Nothing is
 * confirmed by collecting — an added finding is PROBABILISTIC intel-snapshot (R4), shown as such.
 */
export function AddFindingPanel({ caseId }: { caseId: number }) {
  const [value, setValue] = React.useState('');
  const lookup = useIocLookup();
  // When the lookup was retrieved — captured at submit, sent as each add's provenance timestamp.
  const [performedAt, setPerformedAt] = React.useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = value.trim();
    if (!query || lookup.isPending) return;
    setPerformedAt(new Date().toISOString());
    lookup.mutate(query);
  };

  return (
    <Card className="border-primary/30">
      <CardContent className="flex flex-col gap-4 pt-6">
        <div className="flex items-start gap-2 text-caption text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <span>
            <span className="font-semibold text-foreground">Looking, then collecting.</span> Look up
            an indicator to see external claims. Each claim is added deliberately — one finding = one
            ACQUIRED custody event — and is sealed as intel-snapshot evidence (R4), never confirmed.
          </span>
        </div>

        <form onSubmit={submit} className="flex gap-2">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Indicator — IP, domain, hash, URL, CVE, wallet…"
              autoComplete="off"
              spellCheck={false}
              aria-label="Indicator to look up"
              className="h-10 w-full rounded-md border border-border bg-surface-0 pl-9 pr-3 font-mono text-body text-foreground outline-none focus:border-primary/70"
            />
          </div>
          <Button type="submit" disabled={!value.trim() || lookup.isPending}>
            {lookup.isPending ? (
              <>
                <Loader2 className="animate-spin" aria-hidden />
                Looking…
              </>
            ) : (
              <>
                <Search aria-hidden />
                Look up
              </>
            )}
          </Button>
        </form>

        {lookup.isIdle && <IdleHint />}
        {lookup.isPending && <LoadingState message="Querying external intelligence sources…" />}
        {lookup.isError && (
          <RequestErrorState
            error={lookup.error}
            onRetry={() => {
              if (lookup.variables !== undefined) {
                setPerformedAt(new Date().toISOString());
                lookup.mutate(lookup.variables);
              }
            }}
          />
        )}
        {lookup.isSuccess && (
          <IocResults
            data={lookup.data}
            renderAddAction={(result) => (
              <AddFindingAction
                caseId={caseId}
                indicator={lookup.data.indicator}
                detectedType={lookup.data.detected_type}
                lookupPerformedAt={performedAt ?? new Date().toISOString()}
                result={result}
              />
            )}
          />
        )}
      </CardContent>
    </Card>
  );
}

/**
 * The per-source "Add to this case" control. Each card owns its OWN mutation so results are added
 * independently — one seals while its neighbours stay untouched. On success it shows the returned
 * ACQUIRED custody entry, so the investigator sees the finding is now sealed evidence under custody.
 */
function AddFindingAction({
  caseId,
  indicator,
  detectedType,
  lookupPerformedAt,
  result,
}: {
  caseId: number;
  indicator: string;
  detectedType: string;
  lookupPerformedAt: string;
  result: LookupSourceResult;
}) {
  const add = useAddToCase(caseId);

  if (add.isSuccess) {
    return <SealedNotice data={add.data} />;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-micro text-muted-foreground">
          External claim — sealing adds it as intel-snapshot evidence (R4), not confirmed.
        </span>
        <Button
          size="sm"
          disabled={add.isPending}
          onClick={() =>
            add.mutate({
              indicator,
              detected_type: detectedType,
              lookup_result: result,
              lookup_performed_at: lookupPerformedAt,
            })
          }
        >
          {add.isPending ? (
            <>
              <Loader2 className="animate-spin" aria-hidden />
              Sealing…
            </>
          ) : (
            <>
              <Plus aria-hidden />
              Add to this case
            </>
          )}
        </Button>
      </div>
      {add.isError && (
        <span className="text-micro text-integrity-broken-foreground" role="alert">
          {describeApiError(add.error).message}
        </span>
      )}
    </div>
  );
}

/** The confirmation that ONE finding was sealed: the ACQUIRED custody event + the evidence it made. */
function SealedNotice({ data }: { data: AddToCaseResponse }) {
  const { custody_entry: entry } = data;
  return (
    <div className="flex flex-col gap-2 rounded-md border border-integrity-verified/50 bg-integrity-verified/10 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <CheckCircle2 className="size-4 shrink-0 text-integrity-verified" aria-hidden />
        <span className="text-caption font-semibold text-foreground">
          Sealed as evidence E{data.evidence_id}
        </span>
        <Badge variant="secondary">{titleCase(entry.action)}</Badge>
        <span className="font-mono text-micro text-muted-foreground">{entry.actor}</span>
        <span className="text-micro text-muted-foreground">· {formatUtc(entry.recorded_at)}</span>
      </div>
      <div className="flex flex-col gap-0.5 font-mono text-[10px] text-muted-foreground/80">
        <span className="break-all">sha256: {data.sha256}</span>
        <span className="break-all">custody: {entry.entry_hash}</span>
      </div>
      <span className="text-micro text-muted-foreground">
        One ACQUIRED custody event. It now appears in the manifest below as intel-snapshot evidence
        (R4) — a claim record, not confirmed.
      </span>
    </div>
  );
}
