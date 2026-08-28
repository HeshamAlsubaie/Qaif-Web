import { useHealth } from '@/api/queries';
import { getApiBaseUrl } from '@/api/client';
import { cn } from '@/lib/utils';

type ConnState = 'online' | 'offline' | 'unknown';

const META: Record<ConnState, { label: string; dot: string; text: string }> = {
  online: { label: 'API online', dot: 'bg-integrity-verified', text: 'text-integrity-verified' },
  offline: { label: 'API offline', dot: 'bg-integrity-broken', text: 'text-integrity-broken' },
  unknown: { label: 'Checking API…', dot: 'bg-probabilistic', text: 'text-probabilistic' },
};

/**
 * Live API health indicator, driven by GET /healthz. A real connectivity state (not chrome), so it
 * borrows the verified/broken hues; when the API is down the shell degrades cleanly rather than
 * showing a blank crash. Also surfaces the API base subtly.
 */
export function HealthDot() {
  const health = useHealth();
  const state: ConnState = health.isSuccess ? 'online' : health.isError ? 'offline' : 'unknown';
  const meta = META[state];

  return (
    <div
      className="flex items-center gap-2.5 rounded-full border border-border bg-surface-1 px-3 py-1.5"
      title={`API health polled from /healthz — currently ${meta.label}`}
    >
      <span className="relative flex size-2">
        {state === 'unknown' && (
          <span
            className={cn(
              'absolute inline-flex size-full animate-ping rounded-full opacity-60',
              meta.dot,
            )}
          />
        )}
        <span className={cn('relative inline-flex size-2 rounded-full', meta.dot)} />
      </span>
      <span className={cn('text-micro font-semibold', meta.text)}>{meta.label}</span>
      <span className="h-4 w-px bg-border" />
      <span className="font-mono text-micro text-muted-foreground">
        {getApiBaseUrl().replace(/^https?:\/\//, '')}
      </span>
    </div>
  );
}
