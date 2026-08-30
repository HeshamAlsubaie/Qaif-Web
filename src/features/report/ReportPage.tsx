import { Download, FileDown, FileText, Fingerprint, Loader2, ShieldCheck } from 'lucide-react';
import * as React from 'react';

import { fetchReportPdf } from '@/api/endpoints';
import { useReport } from '@/api/queries';
import { CaseScoped } from '@/components/common/CaseScoped';
import { QueryBoundary } from '@/components/common/QueryBoundary';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { describeApiError } from '@/lib/apiError';
import { type ReportResponse } from '@/types/api';

/** Download the server-rendered PDF exhibit: GET the blob, then trigger a browser file download. */
function useReportPdfDownload(caseId: number) {
  const [downloading, setDownloading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const download = React.useCallback(async () => {
    setDownloading(true);
    setError(null);
    try {
      const { blob, filename } = await fetchReportPdf(caseId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(describeApiError(err));
    } finally {
      setDownloading(false);
    }
  }, [caseId]);
  return { download, downloading, error };
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
}

function ReportView({ data, caseId }: { data: ReportResponse; caseId: number }) {
  const pdf = useReportPdfDownload(caseId);
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
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => void pdf.download()} disabled={pdf.downloading}>
            {pdf.downloading ? (
              <Loader2 className="animate-spin" aria-hidden />
            ) : (
              <FileDown aria-hidden />
            )}
            {pdf.downloading ? 'Preparing PDF…' : 'Download PDF'}
          </Button>
          <Button size="sm" variant="outline" onClick={downloadJson}>
            <Download aria-hidden />
            Download JSON
          </Button>
        </div>
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

        {pdf.error && (
          <p className="text-caption text-integrity-broken">Could not download the PDF: {pdf.error}</p>
        )}

        <p className="text-caption text-muted-foreground">
          This JSON is the <span className="text-foreground">canonical record-of-record</span>. The
          court-facing <span className="text-foreground">PDF exhibit</span> is rendered server-side
          from it (unit 6.1) and downloads straight to your device — a cover page, the tier-separated
          findings, evidence &amp; custody, timeline, and a self-verifying integrity hash. AI
          suggestions and the analyst board are excluded from the exhibit by design.
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
