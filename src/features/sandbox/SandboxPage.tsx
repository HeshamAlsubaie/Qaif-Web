import { FileCheck2, Loader2, ShieldOff, UploadCloud } from 'lucide-react';
import * as React from 'react';

import { ApiError } from '@/api/client';
import { isSandboxFailure, SANDBOX_REPORTED, useSandboxReport, useSandboxSubmit } from '@/api/queries';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState, ErrorState } from '@/components/common/States';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { describeApiError } from '@/lib/apiError';
import { formatBytes } from '@/lib/format';

import { SandboxReport } from './SandboxReport';

/**
 * The PUBLIC "drop a file for malware analysis" tool. It is bare (ToolShell, no case sidebar) because
 * it is case-INDEPENDENT: a file is submitted to the Triage sandbox for FREE public analysis, and the
 * result is PROBABILISTIC observation (R4) — no case, no chain of custody, never evidence, and it can
 * never be laundered into a case through here.
 *
 * The flow is a small state machine: drop/select a file → submit (the one multipart call) → poll the
 * sample every 5s while it detonates → render the full Triage report once reported. Every failure is
 * surfaced honestly: a refused submission (403), an unavailable sandbox (502), an unknown sample
 * (404), or a failed analysis each get a clear state — it never hangs silently or fabricates a report.
 */
export function SandboxPage() {
  // `sampleId` is the state pivot: null = still choosing/submitting a file; set = analysing/reporting.
  const [sampleId, setSampleId] = React.useState<string | null>(null);

  const reset = () => setSampleId(null);

  return (
    <>
      <PageHeader
        kicker="Free search · Sandbox"
        title="Malware Sandbox"
        sub={
          <>
            Drop a file to detonate it in the Triage sandbox and review its behaviour.{' '}
            <span className="text-foreground">Public analysis — not linked to any case</span>, and
            the result is a probabilistic observation, not confirmed evidence.
          </>
        }
      />

      {sampleId === null ? (
        <SubmitPanel onSubmitted={setSampleId} />
      ) : (
        <AnalysisPanel sampleId={sampleId} onReset={reset} />
      )}
    </>
  );
}

// -- submit (drop / choose a file) ------------------------------------------

function SubmitPanel({ onSubmitted }: { onSubmitted: (sampleId: string) => void }) {
  const [file, setFile] = React.useState<File | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const submit = useSandboxSubmit();

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) setFile(dropped);
  };

  const onSubmit = () => {
    if (!file) return;
    submit.mutate(file, { onSuccess: (res) => onSubmitted(res.sample_id) });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Drop zone. One file at a time; drag-and-drop OR the choose-file button both set the file. */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-10 text-center transition-colors',
          dragging ? 'border-primary bg-primary/5' : 'border-border bg-surface-1',
        )}
      >
        <span className="bg-primary/12 flex size-12 items-center justify-center rounded-lg text-primary">
          <UploadCloud className="size-6" aria-hidden />
        </span>
        <div className="flex flex-col gap-1">
          <span className="text-body font-medium text-foreground">
            Drop a file here to analyse it
          </span>
          <span className="type-caption">
            The file is sent to a public sandbox for detonation. Do not submit anything you cannot
            share publicly.
          </span>
        </div>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
          Choose file
        </Button>
      </div>

      {file && (
        <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex min-w-0 items-center gap-2">
            <FileCheck2 className="size-4 shrink-0 text-primary" aria-hidden />
            <span className="min-w-0 truncate font-mono text-caption text-foreground">
              {file.name}
            </span>
            <Badge variant="muted">{formatBytes(file.size)}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setFile(null)}
              disabled={submit.isPending}
            >
              Clear
            </Button>
            <Button type="button" size="sm" onClick={onSubmit} disabled={submit.isPending}>
              {submit.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Submitting…
                </>
              ) : (
                'Submit for analysis'
              )}
            </Button>
          </div>
        </Card>
      )}

      {submit.isError && <SubmitError error={submit.error} />}
    </div>
  );
}

function SubmitError({ error }: { error: unknown }) {
  const { title, message } = describeSandboxError(error);
  return (
    <div className="rounded-lg border border-border">
      <ErrorState title={title} message={message} />
    </div>
  );
}

// -- analysis (poll → report) -----------------------------------------------

function AnalysisPanel({ sampleId, onReset }: { sampleId: string; onReset: () => void }) {
  const report = useSandboxReport(sampleId);

  const resetButton = (
    <Button type="button" variant="outline" size="sm" onClick={onReset}>
      Analyse another file
    </Button>
  );

  let body: React.ReactNode;
  if (report.isError) {
    const { title, message } = describeSandboxError(report.error);
    body = (
      <div className="rounded-lg border border-border">
        <ErrorState title={title} message={message} onRetry={() => void report.refetch()} />
      </div>
    );
  } else if (report.data && isSandboxFailure(report.data.status)) {
    body = (
      <Card>
        <EmptyState
          icon={ShieldOff}
          title="Analysis failed"
          message={`The sandbox could not complete analysis of this sample (status: ${report.data.status}). Nothing was recorded — you can submit another file.`}
        />
      </Card>
    );
  } else if (report.data && report.data.status === SANDBOX_REPORTED && report.data.report) {
    body = <SandboxReport data={report.data} />;
  } else {
    body = <Analyzing sampleId={sampleId} status={report.data?.status ?? null} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-micro text-muted-foreground">
          sample <span className="font-mono text-foreground">{sampleId}</span>
        </span>
        {resetButton}
      </div>
      {body}
    </div>
  );
}

function Analyzing({ sampleId, status }: { sampleId: string; status: string | null }) {
  return (
    <Card className="flex min-h-[200px] flex-col items-center justify-center gap-3 p-8 text-center">
      <span className="bg-primary/12 flex size-12 items-center justify-center rounded-lg text-primary">
        <Loader2 className="size-6 animate-spin" aria-hidden />
      </span>
      <div className="flex flex-col items-center gap-1">
        <span className="text-body font-medium text-foreground">Analysing…</span>
        <span className="type-caption max-w-[48ch]">
          The public sandbox is detonating this sample — this can take a few minutes. This page polls
          for the report and updates on its own.
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="muted">status: {status ?? 'submitting'}</Badge>
        <span className="text-micro text-muted-foreground">
          sample <span className="font-mono">{sampleId}</span>
        </span>
      </div>
    </Card>
  );
}

// -- honest error mapping ----------------------------------------------------

/**
 * Map a sandbox failure to an honest title/message. The submit path can be REFUSED (403) or hit an
 * unavailable sandbox (502); the poll path can 404 on an unknown sample or 502 when the sandbox is
 * down. Everything else falls back to the shared API-error description. We prefer the backend's own
 * `detail` where it carries the real reason (e.g. the consent-gate refusal message).
 */
function describeSandboxError(error: unknown): { title: string; message: string } {
  if (error instanceof ApiError) {
    const base = describeApiError(error);
    if (error.status === 403) {
      return { title: 'Submission refused', message: base.message };
    }
    if (error.status === 502) {
      return {
        title: 'Sandbox unavailable',
        message:
          'The Triage sandbox is unreachable or not configured, so it cannot analyse this file right now. Nothing was submitted.',
      };
    }
    if (error.status === 404) {
      return {
        title: 'Unknown sample',
        message: 'The sandbox no longer recognises this sample id. Submit the file again to retry.',
      };
    }
    return base;
  }
  return describeApiError(error);
}
