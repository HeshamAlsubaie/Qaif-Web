import { FolderSearch, Loader2, ScanSearch, Search } from 'lucide-react';
import * as React from 'react';

import { useCaseSearch, useIocLookup } from '@/api/queries';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingState } from '@/components/common/States';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import { CaseSearchResults } from './CaseSearchResults';
import { IdleHint, IocResults, RequestErrorState } from './IocResults';

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
          <RequestErrorState
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

// -- 2. Case search (laid out, honestly marked next) ------------------------

function CaseSearch() {
  const [value, setValue] = React.useState('');
  const search = useCaseSearch();

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const query = value.trim();
    if (query.length < 2 || search.isPending) return;
    search.mutate(query);
  };

  return (
    <Card>
      <CardHeader>
        <span className="type-label flex items-center gap-2">
          <FolderSearch className="size-4" aria-hidden />
          Case Search
        </span>
        <CardTitle>Search my cases</CardTitle>
        {/* "across all cases" is accurate TODAY because the API has no case-access filtering (RBAC)
            yet, so a search genuinely spans every case. When per-user case access lands, change this
            back to "across the cases you have access to" and pass the access scope to GET /search —
            until then, the old wording would overclaim. */}
        <CardDescription>Full-text and entity search across all cases.</CardDescription>
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
              placeholder="Search cases, evidence, entities, and findings…"
              autoComplete="off"
              aria-label="Search my cases"
              className="h-10 w-full rounded-md border border-border bg-surface-0 pl-9 pr-3 text-body text-foreground outline-none focus:border-primary/70"
            />
          </div>
          <Button type="submit" disabled={value.trim().length < 2 || search.isPending}>
            {search.isPending ? (
              <>
                <Loader2 className="animate-spin" aria-hidden />
                Searching…
              </>
            ) : (
              <>
                <Search aria-hidden />
                Search
              </>
            )}
          </Button>
        </form>

        {search.isPending && <LoadingState message="Searching all cases…" />}
        {search.isError && (
          <RequestErrorState
            error={search.error}
            onRetry={() => {
              if (search.variables !== undefined) search.mutate(search.variables);
            }}
          />
        )}
        {search.isSuccess && <CaseSearchResults data={search.data} />}
      </CardContent>
    </Card>
  );
}
