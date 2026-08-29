import { CircleAlert, CircleCheck, CircleSlash, type LucideIcon } from 'lucide-react';

import { ExternalClaimBadge } from '@/components/forensic/ExternalClaimBadge';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatDateTime, titleCase } from '@/lib/format';
import type { LookupSourceResult } from '@/types/api';

import { PayloadView } from './PayloadView';

/**
 * One result card per source (mirroring the backend's per-source fan-out + isolation): a source
 * that errored shows its error while its neighbours still render. Status is given a CALM treatment,
 * never an alarm — "ok/not_found/error" are all normal outcomes of an intelligence sweep, not
 * failures of the case. Every card carries the {@link ExternalClaimBadge}: this is a third-party
 * claim, not confirmed QAIF evidence.
 */

interface StatusStyle {
  label: string;
  icon: LucideIcon;
  className: string;
}

// Calm, non-alarming. `ok` uses the blue chrome accent (informative, NOT a forensic tier hue);
// `not_found` and `error` are neutral slate — distinguished by icon and by the card body, not by a
// loud colour. No red: a source being unreachable is expected, not an integrity break.
const STATUS_STYLES: Record<string, StatusStyle> = {
  ok: {
    label: 'Has data',
    icon: CircleCheck,
    className: 'border-primary/40 bg-primary/10 text-primary',
  },
  not_found: {
    label: 'No data',
    icon: CircleSlash,
    className: 'border-border bg-surface-2 text-muted-foreground',
  },
  error: {
    label: 'Unavailable',
    icon: CircleAlert,
    className: 'border-border bg-surface-2 text-muted-foreground',
  },
};

const FALLBACK_STATUS: StatusStyle = {
  label: 'Unknown',
  icon: CircleSlash,
  className: 'border-border bg-surface-2 text-muted-foreground',
};

function StatusPill({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? FALLBACK_STATUS;
  const Icon = style.icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-micro font-semibold leading-none',
        style.className,
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {style.label}
    </span>
  );
}

export function SourceResultCard({ result }: { result: LookupSourceResult }) {
  const { source, family, queried_value, status, timestamp, resolved_from, payload, error } =
    result;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-body-lg">{titleCase(source)}</CardTitle>
              <Badge variant="muted">{family}</Badge>
            </div>
            <span className="break-all font-mono text-micro text-muted-foreground">
              queried: {queried_value}
            </span>
            {resolved_from && (
              <span className="text-micro italic text-muted-foreground">{resolved_from}</span>
            )}
          </div>
          <ExternalClaimBadge className="shrink-0" />
        </div>
        <div className="flex items-center justify-between gap-2 pt-1">
          <StatusPill status={status} />
          <span className="text-micro tabular-nums text-muted-foreground">
            {formatDateTime(timestamp)}
          </span>
        </div>
      </CardHeader>

      <CardContent>
        {status === 'error' ? (
          <div className="flex items-start gap-2 text-caption text-muted-foreground">
            <CircleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <span>
              This source could not be consulted
              {error ? (
                <>
                  : <span className="break-all font-mono text-foreground">{error}</span>
                </>
              ) : (
                '.'
              )}{' '}
              Other sources are unaffected.
            </span>
          </div>
        ) : status === 'not_found' ? (
          <span className="type-caption italic">
            This source was reached and holds no record for this indicator.
          </span>
        ) : payload ? (
          <PayloadView payload={payload} />
        ) : (
          <span className="type-caption italic">No structured payload was returned.</span>
        )}
      </CardContent>
    </Card>
  );
}
