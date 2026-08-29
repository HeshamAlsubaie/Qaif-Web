import { ChevronRight } from 'lucide-react';
import * as React from 'react';

import { titleCase } from '@/lib/format';

/**
 * Render a source's payload READABLY — surface the key fields as a labelled grid rather than
 * dumping raw JSON. Primitive values and flat arrays are shown inline; nested objects/arrays are
 * summarised ("3 fields · see raw") and left to the raw expandable, so a card stays scannable
 * without hiding anything: the full, verbatim payload is always one click away.
 */

const PRIMITIVE = new Set(['string', 'number', 'boolean']);

function renderValue(value: unknown): React.ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground">—</span>;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-muted-foreground">none</span>;
    const flat = value.every((v) => v === null || PRIMITIVE.has(typeof v));
    if (flat) {
      return <span className="break-all font-mono">{value.map((v) => String(v)).join(', ')}</span>;
    }
    return (
      <span className="text-muted-foreground">
        {value.length} item{value.length === 1 ? '' : 's'} · see raw
      </span>
    );
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value as Record<string, unknown>).length;
    return (
      <span className="text-muted-foreground">
        {keys} field{keys === 1 ? '' : 's'} · see raw
      </span>
    );
  }
  if (typeof value === 'boolean') {
    return <span className="font-mono">{value ? 'true' : 'false'}</span>;
  }
  return <span className="break-all font-mono">{String(value)}</span>;
}

/** Drop keys with no informative value so the grid shows signal, not empty rows. */
function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || (Array.isArray(value) && value.length === 0);
}

export function PayloadView({ payload }: { payload: Record<string, unknown> }) {
  const entries = Object.entries(payload).filter(([, v]) => !isEmpty(v));

  return (
    <div className="flex flex-col gap-3">
      {entries.length === 0 ? (
        <span className="type-caption italic">Source returned an empty record.</span>
      ) : (
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
          {entries.map(([key, value]) => (
            <div key={key} className="flex flex-col gap-0.5">
              <dt className="text-micro font-semibold uppercase tracking-wide text-muted-foreground">
                {titleCase(key)}
              </dt>
              <dd className="text-caption text-foreground">{renderValue(value)}</dd>
            </div>
          ))}
        </dl>
      )}

      <details className="group">
        <summary className="flex w-fit cursor-pointer items-center gap-1 text-micro font-medium text-muted-foreground hover:text-foreground">
          <ChevronRight className="size-3 transition-transform group-open:rotate-90" aria-hidden />
          Raw payload
        </summary>
        <pre className="mt-2 max-h-64 overflow-auto rounded-md border border-border bg-surface-0 p-3 text-micro leading-relaxed text-muted-foreground">
          {JSON.stringify(payload, null, 2)}
        </pre>
      </details>
    </div>
  );
}
