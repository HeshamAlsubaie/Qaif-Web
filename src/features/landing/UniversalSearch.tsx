import { Search } from 'lucide-react';
import * as React from 'react';
import { useLocation } from 'react-router-dom';

import { useIndicatorMatch, useIocLookup } from '@/api/queries';
import { LoadingState } from '@/components/common/States';
import { IocResults, RequestErrorState } from '@/features/search/IocResults';

import { MatchBanner } from './MatchBanner';

/**
 * The landing's STAR: one universal search box. On submit it fires TWO reads in parallel against the
 * live backend:
 *   1. `POST /lookup` — fan out to every enabled external source and render the rich per-source
 *      findings (via the shared {@link IocResults}). Each row is a third-party CLAIM, shown honestly
 *      (tier `external-source-claim`, `confirmed: false`) — never laundered into confirmed evidence.
 *   2. `GET /match` — EXACT cross-case match. If this exact indicator already appears in a case, a
 *      dismissible {@link MatchBanner} pops ABOVE the results and links into that case.
 *
 * Free search: nothing here is written, no case, no custody. This box lives on the bare landing (no
 * console sidebar) and renders its results inline below itself.
 */
export function UniversalSearch() {
  const [value, setValue] = React.useState('');
  const [matchDismissed, setMatchDismissed] = React.useState(false);
  const lookup = useIocLookup();
  const match = useIndicatorMatch();

  const runSearch = React.useCallback(
    (query: string) => {
      setMatchDismissed(false);
      lookup.mutate(query);
      // The match check runs alongside the lookup; a failure here must never block the lookup, so it
      // is a separate mutation whose error simply hides the banner (no match shown), never surfaced.
      match.mutate(query);
    },
    [lookup, match],
  );

  // A pre-filled query carried in via router state — e.g. from a Wazuh alert's "search this
  // indicator" launch. Run it once on arrival so the investigator lands on the results directly.
  const location = useLocation();
  const prefill = (location.state as { prefill?: string } | null)?.prefill;
  const ranPrefill = React.useRef(false);
  React.useEffect(() => {
    if (!prefill || ranPrefill.current) return;
    const query = prefill.trim();
    if (!query) return;
    ranPrefill.current = true;
    setValue(query);
    runSearch(query);
  }, [prefill, runSearch]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const query = value.trim();
    if (!query || lookup.isPending) return;
    runSearch(query);
  };

  const showMatch =
    match.isSuccess && match.data.match_count > 0 && !matchDismissed;

  return (
    <div className="flex w-full flex-col items-center">
      <form onSubmit={submit} className="w-full max-w-[720px]">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Search for any indicator"
            autoComplete="off"
            spellCheck={false}
            aria-label="Search any indicator"
            className="h-14 w-full rounded-xl border border-border bg-surface-1 pl-12 pr-4 font-mono text-body-lg text-foreground shadow-sm outline-none transition-colors focus:border-primary/70 focus:bg-surface-0"
          />
        </div>
      </form>

      {(showMatch || lookup.isPending || lookup.isError || lookup.isSuccess) && (
        <div className="mt-8 flex w-full max-w-[960px] flex-col gap-4">
          {showMatch && (
            <MatchBanner data={match.data} onDismiss={() => setMatchDismissed(true)} />
          )}
          {lookup.isPending && (
            <LoadingState message="Querying external intelligence sources…" />
          )}
          {lookup.isError && (
            <RequestErrorState
              error={lookup.error}
              onRetry={() => {
                if (lookup.variables !== undefined) lookup.mutate(lookup.variables);
              }}
            />
          )}
          {lookup.isSuccess && <IocResults data={lookup.data} />}
        </div>
      )}
    </div>
  );
}
