import { CircleSlash, Globe, Info } from 'lucide-react';

import { CveDashboard } from '@/features/cve/CveDashboard';
import { EmptyState, ErrorState } from '@/components/common/States';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { describeApiError } from '@/lib/apiError';
import { titleCase } from '@/lib/format';
import type { LookupResponse } from '@/types/api';

import { SourceResultCard } from './SourceResultCard';

/**
 * The shared rendering for a `POST /lookup` result — "everything the engine got" for one indicator,
 * one card per source. Extracted from the Search page so BOTH the console Search view and the
 * landing's universal search render lookups identically, with the same external-source honesty:
 * every source is a third-party CLAIM (tier `external-source-claim`, `confirmed: false`), shown via
 * the {@link SourceResultCard}'s ExternalClaimBadge — never laundered into confirmed case evidence.
 */

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
  cve: 'CVE',
  unknown: 'Unknown',
};

export function DetectedTypeBadge({ type, recognized }: { type: string; recognized: boolean }) {
  return (
    <Badge variant={recognized ? 'outline' : 'muted'}>
      detected: {TYPE_LABELS[type] ?? titleCase(type)}
    </Badge>
  );
}

export function IdleHint() {
  return (
    <div className="rounded-md border border-dashed border-border bg-surface-2/40 px-4 py-6 text-center">
      <span className="type-caption">
        Enter an indicator above to query external intelligence. Results are third-party claims, not
        case evidence.
      </span>
    </div>
  );
}

export function RequestErrorState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const { title, message } = describeApiError(error);
  return (
    <div className="rounded-lg border border-border">
      <ErrorState title={title} message={message} onRetry={onRetry} />
    </div>
  );
}

export function ExternalIntelNotice() {
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

export function IocResults({ data }: { data: LookupResponse }) {
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
          {data.detected_type === 'cve' ? (
            // A CVE renders the rich, VirusTotal-style dashboard instead of the generic per-source
            // cards — same lookup payload, same external-claim discipline, richer presentation.
            <CveDashboard data={data} />
          ) : data.results.length === 0 ? (
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
                <SourceResultCard key={`${result.source}:${result.queried_value}`} result={result} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
