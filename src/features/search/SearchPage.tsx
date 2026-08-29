import { CircleSlash, FolderSearch, Globe, Info, Loader2, ScanSearch, Search } from 'lucide-react';
import * as React from 'react';

import { useIocLookup } from '@/api/queries';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '@/components/common/States';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { describeApiError } from '@/lib/apiError';
import { titleCase } from '@/lib/format';
import type { LookupResponse } from '@/types/api';

import { SourceResultCard } from './SourceResultCard';

// Friendly labels for the detected-type badge; anything unmapped falls back to titleCase.
const TYPE_LABELS: Record<string, string> = {
  file_hash: 'File hash',
  ip: 'IP',
  domain: 'Domain',
  url: 'URL',
  eth_address: 'ETH address',
  btc_address: 'BTC address',
  eth_tx: 'ETH transaction',
  btc_tx: 'BTC transaction',
  unknown: 'Unknown',
};

/**
 * Search — the second, case-INDEPENDENT way to use QAIF. Two clearly labelled search modes:
 *   1. IOC Search — live against `POST /lookup`: type any indicator, fan out to external
 *      intelligence sources, render one card per source. Every result is an EXTERNAL CLAIM, never
 *      confirmed case evidence. Lookup only — nothing is ever submitted or detonated (R9).
 *   2. Case Search — laid out and honestly marked "coming next"; there is no endpoint yet, so it is
 *      intentionally inert rather than faking results.
 */
export function SearchPage() {
  return (
    <>
      <PageHeader
        kicker="Search"
        title="Search"
        sub="Two ways to search QAIF: look up any indicator against external intelligence, or search your own cases."
      />
      <div className="flex flex-col gap-6">
        <IocSearch />
        <CaseSearch />
      </div>
    </>
  );
}

// -- 1. IOC search (fully wired) --------------------------------------------

function IocSearch() {
  const [value, setValue] = React.useState('');
  const lookup = useIocLookup();

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const query = value.trim();
    if (!query || lookup.isPending) return;
    lookup.mutate(query);
  };

  return (
    <Card>
      <CardHeader>
        <span className="type-label flex items-center gap-2">
          <ScanSearch className="size-4" aria-hidden />
          IOC Search
        </span>
        <CardTitle>Look up an indicator</CardTitle>
        <CardDescription>
          Hash, IP, domain, URL, or wallet address — queried across external intelligence sources in
          parallel.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder="Hash, IP, domain, URL, or wallet address…"
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
                Searching…
              </>
            ) : (
              <>
                <Search aria-hidden />
                Look up
              </>
            )}
          </Button>
        </form>

        <p className="text-micro text-muted-foreground">
          Read-only intelligence lookup — QAIF never uploads, submits, or detonates a sample.
        </p>

        {lookup.isIdle && <IdleHint />}
        {lookup.isPending && <LoadingState message="Querying external intelligence sources…" />}
        {lookup.isError && (
          <IocError
            error={lookup.error}
            onRetry={() => {
              if (lookup.variables !== undefined) lookup.mutate(lookup.variables);
            }}
          />
        )}
        {lookup.isSuccess && <IocResults data={lookup.data} />}
      </CardContent>
    </Card>
  );
}

function IdleHint() {
  return (
    <div className="rounded-md border border-dashed border-border bg-surface-2/40 px-4 py-6 text-center">
      <span className="type-caption">
        Enter an indicator above to query external intelligence. Results are third-party claims, not
        case evidence.
      </span>
    </div>
  );
}

function IocError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const { title, message } = describeApiError(error);
  return (
    <div className="rounded-lg border border-border">
      <ErrorState title={title} message={message} onRetry={onRetry} />
    </div>
  );
}

function DetectedTypeBadge({ type, recognized }: { type: string; recognized: boolean }) {
  return (
    <Badge variant={recognized ? 'outline' : 'muted'}>
      detected: {TYPE_LABELS[type] ?? titleCase(type)}
    </Badge>
  );
}

function IocResults({ data }: { data: LookupResponse }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="break-all font-mono text-body text-foreground">{data.indicator}</span>
        <DetectedTypeBadge type={data.detected_type} recognized={data.recognized} />
      </div>

      {!data.recognized ? (
        <Card>
          <EmptyState
            icon={CircleSlash}
            title="Not a recognized indicator type"
            message={
              data.note ??
              'This value doesn’t match a supported indicator form (hash, IP, domain, URL, or wallet), so no source was queried — QAIF never guesses a type.'
            }
          />
        </Card>
      ) : (
        <>
          <ExternalIntelNotice />
          {data.results.length === 0 ? (
            <Card>
              <EmptyState
                icon={Info}
                title="No source could answer"
                message={data.note ?? 'No configured source supports this indicator type.'}
              />
            </Card>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {data.results.map((result) => (
                <SourceResultCard
                  key={`${result.source}:${result.queried_value}`}
                  result={result}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ExternalIntelNotice() {
  return (
    <div className="flex items-start gap-2 rounded-md border border-dashed border-muted-foreground/30 bg-surface-2/60 px-3 py-2 text-caption text-muted-foreground">
      <Globe className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      <span>
        <span className="font-semibold text-foreground">
          External intelligence — not case evidence.
        </span>{' '}
        Each card below is a third-party source’s claim, reported verbatim. Nothing here is
        confirmed QAIF evidence or attached to a case; it is lookup only.
      </span>
    </div>
  );
}

// -- 2. Case search (laid out, honestly marked next) ------------------------

function CaseSearch() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <span className="type-label flex items-center gap-2">
              <FolderSearch className="size-4" aria-hidden />
              Case Search
            </span>
            <CardTitle>Search my cases</CardTitle>
          </div>
          <Badge variant="muted">Coming next</Badge>
        </div>
        <CardDescription>
          Full-text and entity search across the cases you have access to.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60"
              aria-hidden
            />
            <input
              disabled
              placeholder="Search my cases (coming soon)…"
              aria-label="Search my cases (not yet available)"
              className="h-10 w-full cursor-not-allowed rounded-md border border-border bg-surface-0 pl-9 pr-3 text-body text-muted-foreground opacity-60 outline-none"
            />
          </div>
          <Button variant="outline" disabled>
            Search
          </Button>
        </div>
        <p className="text-micro text-muted-foreground">
          There is no case-search endpoint yet, so this bar is intentionally inert — results here
          would be fabricated. It marks the second search mode, wired once the backend lands.
        </p>
      </CardContent>
    </Card>
  );
}
