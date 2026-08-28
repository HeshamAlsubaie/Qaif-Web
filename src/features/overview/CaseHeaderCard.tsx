import { ShieldCheck } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/format';
import { type CaseSummaryResponse } from '@/types/api';

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-body text-foreground">{children}</span>
    </div>
  );
}

/** The case identity block — the one hero element: number, title, classification, status, dates. */
export function CaseHeaderCard({ data }: { data: CaseSummaryResponse }) {
  return (
    <div className="mb-5 flex flex-col gap-4 rounded-lg border border-border bg-gradient-to-br from-surface-2 to-surface-1 p-6">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <span className="font-mono text-micro font-semibold tracking-wide text-primary">
            {data.case_number}
          </span>
          <h2 className="mt-1 text-h2 text-foreground">{data.title}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-3 px-3 py-1 text-micro font-bold uppercase tracking-wide text-secondary-foreground">
            <ShieldCheck className="size-3.5" aria-hidden />
            {data.classification}
          </span>
          <Badge variant="secondary">{data.status}</Badge>
        </div>
      </div>
      <div className="flex flex-wrap gap-x-10 gap-y-4 border-t border-border/60 pt-4">
        <Meta label="Case ID">
          <span className="font-mono">#{data.case_id}</span>
        </Meta>
        <Meta label="Opened">{formatDateTime(data.opened_at)}</Meta>
        <Meta label="Opened by">
          <span className="font-mono">{data.opened_by}</span>
        </Meta>
        <Meta label="Closed">{data.closed_at ? formatDateTime(data.closed_at) : '— open —'}</Meta>
      </div>
    </div>
  );
}
