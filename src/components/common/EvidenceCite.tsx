import { AlertTriangle, Paperclip } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Renders an evidence citation as monospace `E<id>` chips. When `flagIfMissing` is set (a confirmed
 * finding MUST cite evidence) and the list is empty, it renders a RED integrity flag rather than a
 * silent dash — a confirmed claim with no grounding must never look grounded (mirrors the report's
 * discipline). This red is the reserved evidence-integrity hue, used here for a real integrity gap.
 */
export function EvidenceCite({
  ids,
  flagIfMissing = false,
}: {
  ids: number[];
  flagIfMissing?: boolean;
}) {
  if (ids.length === 0) {
    if (flagIfMissing) {
      return (
        <span
          className="inline-flex items-center gap-1.5 rounded border border-integrity-broken/60 bg-integrity-broken/15 px-2 py-0.5 text-micro font-semibold text-integrity-broken"
          title="Confirmed finding with NO evidence citation — not grounded (flagged, not shown as fact)"
        >
          <AlertTriangle className="size-3.5" aria-hidden />
          No citation
        </span>
      );
    }
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <Paperclip className="size-3.5 text-muted-foreground" aria-hidden />
      {ids.map((id) => (
        <code
          key={id}
          className={cn('rounded bg-surface-3 px-1.5 py-0.5 text-micro text-foreground')}
          title={`Evidence #${id}`}
        >
          E{id}
        </code>
      ))}
    </span>
  );
}
