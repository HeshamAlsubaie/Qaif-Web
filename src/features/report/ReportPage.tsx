import { Download, FileText, Fingerprint, ShieldCheck } from 'lucide-react';
import * as React from 'react';

import { useReport } from '@/api/queries';
import { CaseScoped } from '@/components/common/CaseScoped';
import { QueryBoundary } from '@/components/common/QueryBoundary';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { type ReportResponse } from '@/types/api';

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
}

function ReportView({ data, caseId }: { data: ReportResponse; caseId: number }) {
  const integrity = asRecord(data.integrity);
  const report = asRecord(data.report);
  const statistics = asRecord(report.statistics);
  const schemaVersion = typeof data.schema_version === 'string' ? data.schema_version : '—';
  const algorithm = typeof integrity.algorithm === 'string' ? integrity.algorithm : 'sha256';
  const hash = typeof integrity.hash === 'string' ? integrity.hash : '';

  function downloadJson() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `case-${caseId}-report.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="size-5 text-integrity-verified" aria-hidden />
          <CardTitle>Report available</CardTitle>
        </div>
        <Button size="sm" onClick={downloadJson}>
          <Download aria-hidden />
          Download JSON
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="flex flex-col gap-1">
            <span className="type-label">Schema</span>
            <span className="font-mono text-body text-foreground">{schemaVersion}</span>
          </div>
          {Object.entries(statistics)
            .filter(([, v]) => typeof v === 'number' || typeof v === 'string')
            .slice(0, 7)
            .map(([k, v]) => (
              <div key={k} className="flex flex-col gap-1">
                <span className="type-label">{k.replace(/_/g, ' ')}</span>
                <span className="font-mono text-body tabular-nums text-foreground">
                  {String(v)}
                </span>
              </div>
            ))}
        </div>

        {/* The reproducible integrity hash over the canonical record (R2 discipline). */}
        <div className="flex flex-col gap-1">
          <span className="type-label flex items-center gap-1.5">
            <Fingerprint className="size-3.5" aria-hidden />
            Integrity ({algorithm})
          </span>
          <code className="break-all rounded-md border border-integrity-verified/40 bg-integrity-verified/5 p-2.5 text-caption text-foreground">
            {hash || '—'}
          </code>
          <span className="text-micro text-muted-foreground">
            Reproducible hash over the canonical JSON (keys sorted, integrity block excluded).
          </span>
        </div>

        <p className="text-caption text-muted-foreground">
          This JSON is the <span className="text-foreground">canonical record-of-record</span>. The
          court-facing PDF is derived from it by the backend report module (unit 6.1); a rendered
          PDF download will be wired here in a later pass.
        </p>
      </CardContent>
    </Card>
  );
}

/** Report — minimal Stage C1 wiring: fetch the canonical report on demand, show it, offer the JSON. */
export function ReportPage() {
  return (
    <CaseScoped
      kicker="Report"
      title="Case report"
      sub="Court-defensible canonical record + reproducible integrity hash."
    >
      {(caseId) => <ReportBody caseId={caseId} />}
    </CaseScoped>
  );
}

function ReportBody({ caseId }: { caseId: number }) {
  const [requested, setRequested] = React.useState(false);
  const report = useReport(caseId, { enabled: requested });

  if (!requested) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
          <span className="bg-primary/12 flex size-12 items-center justify-center rounded-lg text-primary">
            <FileText className="size-6" aria-hidden />
          </span>
          <div className="flex flex-col gap-1">
            <span className="text-body-lg font-medium text-foreground">
              Generate the case report
            </span>
            <span className="type-caption max-w-[52ch]">
              Assembles the canonical JSON record (evidence manifest, tier-separated findings,
              entities, timeline, AI suggestions) with a reproducible integrity hash. Fetched on
              demand — it is not built on page load.
            </span>
          </div>
          <Button onClick={() => setRequested(true)}>
            <FileText aria-hidden />
            Fetch report
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <QueryBoundary query={report} loadingMessage="Assembling case report…">
      {(data) => <ReportView data={data} caseId={caseId} />}
    </QueryBoundary>
  );
}
