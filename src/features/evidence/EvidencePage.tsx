import { AlertTriangle, Plus, X } from 'lucide-react';
import * as React from 'react';

import { useEvidence } from '@/api/queries';
import { useRole } from '@/app/RoleContext';
import { CaseScoped } from '@/components/common/CaseScoped';
import { InvestigatorOnly } from '@/components/common/InvestigatorOnly';
import { QueryBoundary } from '@/components/common/QueryBoundary';
import { IntegrityBadge } from '@/components/forensic/IntegrityBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { AddFindingPanel } from '@/features/evidence/AddFindingPanel';
import { formatBytes, formatUtc, titleCase } from '@/lib/format';
import { type CustodyEntryResponse, type EvidenceItemResponse } from '@/types/api';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-body text-foreground">{children}</span>
    </div>
  );
}

/** One step in the append-only chain of custody (R3), rendered in recorded order. */
function CustodyStep({ entry, last }: { entry: CustodyEntryResponse; last: boolean }) {
  return (
    <li className="relative flex gap-3 pb-4 last:pb-0">
      {!last && <span className="absolute left-[11px] top-6 h-full w-px bg-border" aria-hidden />}
      <span className="z-10 mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-border bg-surface-2 font-mono text-micro text-muted-foreground">
        {entry.sequence}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{titleCase(entry.action)}</Badge>
          <span className="font-mono text-caption text-muted-foreground">{entry.actor}</span>
          <span className="text-caption text-muted-foreground">
            · {formatUtc(entry.recorded_at)}
          </span>
        </div>
        {entry.details && <span className="type-caption">{entry.details}</span>}
        <div className="flex flex-col gap-0.5 font-mono text-[10px] text-muted-foreground/80">
          <span className="break-all">prev: {entry.prev_hash}</span>
          <span className="break-all">hash: {entry.entry_hash}</span>
        </div>
      </div>
    </li>
  );
}

function EvidenceCard({ item }: { item: EvidenceItemResponse }) {
  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
        <div className="flex items-center gap-3">
          <span className="font-mono text-caption text-primary">E{item.evidence_id}</span>
          <span className="text-h4 text-foreground">{item.original_filename}</span>
          <Badge variant="outline">{item.evidence_type}</Badge>
        </div>
        <IntegrityBadge verified={item.custody_verified} />
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {item.custody_error && (
          <div className="flex items-start gap-2 rounded-md border border-integrity-broken/50 bg-integrity-broken/10 p-3 text-caption text-integrity-broken-foreground">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-integrity-broken" aria-hidden />
            <span>{item.custody_error}</span>
          </div>
        )}

        {/* SHA-256 — the integrity anchor (R2), full digest in monospace. */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            SHA-256
          </span>
          <code className="break-all rounded-md border border-border bg-surface-0 p-2.5 text-caption text-foreground">
            {item.sha256}
          </code>
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
          <Field label="Size">{formatBytes(item.size_bytes)}</Field>
          <Field label="Source">{item.source ?? '—'}</Field>
          <Field label="Acquired by">
            <span className="font-mono">{item.acquired_by}</span>
          </Field>
          <Field label="Acquired (UTC)">{formatUtc(item.acquired_at)}</Field>
          <Field label="Original TZ">
            <span className="font-mono">{item.acquired_at_original_tz || 'unrecorded'}</span>
          </Field>
          <Field label="Storage version">
            <span className="break-all font-mono text-caption">
              {item.storage_version_id ?? '—'}
            </span>
          </Field>
        </div>

        {/* Chain of custody — append-only, in order (R3). */}
        <div className="flex flex-col gap-3">
          <span className="type-label">Chain of custody · {item.custody_chain.length} entries</span>
          <ol className="flex flex-col">
            {item.custody_chain.map((entry, i) => (
              <CustodyStep
                key={entry.sequence}
                entry={entry}
                last={i === item.custody_chain.length - 1}
              />
            ))}
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * The evidence manifest — the court-integrity view. Each item shows its SHA-256 (R2) and its
 * ordered, append-only chain of custody (R3), with an integrity badge that maps the API's
 * verified flag. Precise and monospace throughout, so tampering would be visually obvious.
 */
export function EvidencePage() {
  return (
    <CaseScoped kicker="Custody" title="Evidence">
      {(caseId) => <EvidenceView caseId={caseId} />}
    </CaseScoped>
  );
}

/**
 * The case's evidence view: the "add a finding" collect surface on top of the read-only manifest.
 * Adding is the deliberate in-case write (Investigator-only); the manifest below refetches on a
 * successful add, so a newly-sealed intel-snapshot appears in custody immediately.
 */
function EvidenceView({ caseId }: { caseId: number }) {
  const [adding, setAdding] = React.useState(false);
  const { canWrite } = useRole();
  return (
    <div className="flex flex-col gap-5">
      {/* Add-a-finding is the in-case write: Investigator-only. A Viewer sees the manifest (a read)
          but no add affordance — just an honest reason. */}
      {canWrite ? (
        <>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button
              size="sm"
              variant={adding ? 'outline' : 'default'}
              onClick={() => setAdding((v) => !v)}
            >
              {adding ? (
                <>
                  <X aria-hidden />
                  Close
                </>
              ) : (
                <>
                  <Plus aria-hidden />
                  Add finding
                </>
              )}
            </Button>
          </div>
          {adding && <AddFindingPanel caseId={caseId} />}
        </>
      ) : (
        <InvestigatorOnly action="Adding a finding to a case" />
      )}
      <EvidenceQuery caseId={caseId} />
    </div>
  );
}

function EvidenceQuery({ caseId }: { caseId: number }) {
  const evidence = useEvidence(caseId);
  return (
    <QueryBoundary
      query={evidence}
      loadingMessage="Loading evidence manifest…"
      isEmpty={(d) => d.evidence.length === 0}
      emptyTitle="No evidence"
      emptyMessage="This case has no evidence items registered yet."
    >
      {(data) => (
        <div className="flex flex-col gap-5">
          {data.evidence.map((item) => (
            <EvidenceCard key={item.evidence_id} item={item} />
          ))}
        </div>
      )}
    </QueryBoundary>
  );
}
