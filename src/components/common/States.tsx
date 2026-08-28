import { AlertTriangle, Inbox, Loader2, RotateCw, type LucideIcon } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/*
 * The three data states, kept DELIBERATELY DISTINCT. In a forensic tool an error must never be
 * dressed as "no data": absence of evidence is a different claim than a failure to load it.
 *
 *   LoadingState — blue spinner ("working").
 *   EmptyState   — neutral navy ("genuinely nothing here yet").
 *   ErrorState   — red alarm ("something FAILED; do not read as empty").
 */

const wrap = 'flex min-h-[160px] flex-col items-center justify-center gap-3 p-8 text-center';

export function LoadingState({ message = 'Loading…' }: { message?: string }) {
  return (
    <div className={wrap} role="status" aria-live="polite">
      <span className="bg-primary/12 flex size-10 items-center justify-center rounded-lg text-primary">
        <Loader2 className="size-5 animate-spin" aria-hidden />
      </span>
      <span className="type-caption">{message}</span>
    </div>
  );
}

export function EmptyState({
  title = 'No data yet',
  message,
  icon: Icon = Inbox,
}: {
  title?: string;
  message?: React.ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className={wrap}>
      <span className="flex size-10 items-center justify-center rounded-lg border border-border bg-surface-2 text-muted-foreground">
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="text-body font-medium text-foreground">{title}</span>
      {message && <span className="type-caption max-w-[46ch]">{message}</span>}
    </div>
  );
}

export function ErrorState({
  title = 'Failed to load',
  message,
  onRetry,
}: {
  title?: string;
  message?: React.ReactNode;
  onRetry?: () => void;
}) {
  return (
    <div className={cn(wrap, 'rounded-lg bg-integrity-broken/10')} role="alert">
      <span className="flex size-10 items-center justify-center rounded-lg border border-integrity-broken/60 bg-integrity-broken/15 text-integrity-broken">
        <AlertTriangle className="size-5" aria-hidden />
      </span>
      <span className="text-body font-medium text-integrity-broken-foreground">{title}</span>
      {message && <span className="type-caption max-w-[46ch]">{message}</span>}
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCw aria-hidden />
          Retry
        </Button>
      )}
    </div>
  );
}
