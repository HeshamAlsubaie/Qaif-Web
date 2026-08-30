import { Bot, Check, ShieldQuestion, UserCheck, X } from 'lucide-react';
import * as React from 'react';

import { useReviewSuggestion, useSuggestions } from '@/api/queries';
import { useRole } from '@/app/RoleContext';
import { CaseScoped } from '@/components/common/CaseScoped';
import { EvidenceCite } from '@/components/common/EvidenceCite';
import { InvestigatorOnly } from '@/components/common/InvestigatorOnly';
import { QueryBoundary } from '@/components/common/QueryBoundary';
import { AiBadge } from '@/components/forensic/AiBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { describeApiError } from '@/lib/apiError';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { type ReviewDecision, type SuggestionResponse } from '@/types/api';

const APPROVER_KEY = 'qaif.approverIdentity';

/** The analyst identity recorded on every review (R10). No login yet, so it is captured here. */
function useApprover(): [string, (v: string) => void] {
  const [approver, setApproverState] = React.useState<string>(() => {
    try {
      return localStorage.getItem(APPROVER_KEY) ?? '';
    } catch {
      return '';
    }
  });
  const setApprover = React.useCallback((v: string) => {
    setApproverState(v);
    try {
      localStorage.setItem(APPROVER_KEY, v);
    } catch {
      /* non-fatal */
    }
  }, []);
  return [approver, setApprover];
}

function StatusChip({ status }: { status: string }) {
  const label = status === 'accepted' ? 'Approved' : status === 'rejected' ? 'Rejected' : 'Pending';
  return <Badge variant={status === 'pending' ? 'muted' : 'outline'}>{label}</Badge>;
}

interface SuggestionCardProps {
  caseId: number;
  suggestion: SuggestionResponse;
  approver: string;
}

function SuggestionCard({ caseId, suggestion: s, approver }: SuggestionCardProps) {
  const review = useReviewSuggestion(caseId);
  const { canWrite } = useRole();
  const [pendingDecision, setPendingDecision] = React.useState<ReviewDecision | null>(null);
  const [note, setNote] = React.useState('');

  const isPending = s.awaiting_review || s.status === 'pending';
  const approverReady = approver.trim().length > 0;

  function confirm() {
    if (!pendingDecision || !approverReady) return;
    review.mutate(
      {
        suggestionId: s.suggestion_id,
        decision: pendingDecision,
        approver: approver.trim(),
        ...(note.trim() ? { note: note.trim() } : {}),
      },
      {
        onSuccess: () => {
          setPendingDecision(null);
          setNote('');
        },
      },
    );
  }

  return (
    <Card
      className={cn(
        // The AI-quarantine treatment: a dashed violet edge, ALWAYS — even once reviewed. Approval
        // changes status, not the item's nature as AI-origin (R6). It never becomes evidence.
        'border-dashed border-ai/40',
      )}
    >
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div className="flex items-center gap-2.5">
          <span className="bg-ai/12 flex size-8 items-center justify-center rounded-md text-ai">
            <Bot className="size-4" aria-hidden />
          </span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-caption text-muted-foreground">#{s.suggestion_id}</span>
            <Badge variant="muted">{s.output_type}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AiBadge reviewed={!isPending} />
          <StatusChip status={s.status} />
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <div className="rounded-md border border-ai/25 bg-ai/[0.06] p-3">
          <p className="text-body-lg text-foreground">{s.output_text}</p>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-caption text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            Cited evidence: <EvidenceCite ids={s.cited_evidence_ids} />
          </span>
          {!isPending && s.reviewed_by && (
            <span className="inline-flex items-center gap-1.5">
              <UserCheck className="size-3.5" aria-hidden />
              Reviewed by <span className="font-mono text-foreground">{s.reviewed_by}</span>
              {s.reviewed_at && <>· {formatDateTime(s.reviewed_at)}</>}
            </span>
          )}
        </div>

        {isPending && !canWrite && (
          <div className="border-t border-border/60 pt-3">
            <InvestigatorOnly action="Reviewing an AI suggestion" />
          </div>
        )}

        {isPending && canWrite && (
          <div className="flex flex-col gap-3 border-t border-border/60 pt-3">
            {pendingDecision === null ? (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="default"
                  size="sm"
                  disabled={!approverReady}
                  onClick={() => setPendingDecision('approved')}
                >
                  <Check aria-hidden />
                  Approve
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!approverReady}
                  onClick={() => setPendingDecision('rejected')}
                >
                  <X aria-hidden />
                  Reject
                </Button>
                {!approverReady && (
                  <span className="text-caption text-probabilistic">
                    Set your analyst identity above to review.
                  </span>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-3 rounded-md border border-border bg-surface-2 p-3">
                <div className="flex items-start gap-2">
                  <ShieldQuestion className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                  <p className="text-caption text-foreground">
                    This is an <span className="font-semibold">attributable action</span> (R10). It
                    will record{' '}
                    <span className="font-semibold">
                      {pendingDecision === 'approved' ? 'APPROVAL' : 'REJECTION'}
                    </span>{' '}
                    by <span className="font-mono text-primary">{approver.trim()}</span> and write
                    one audit entry. It changes the suggestion&apos;s status only — it never turns
                    an AI suggestion into evidence.
                  </p>
                </div>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Optional note (recorded with the decision)"
                  className="h-9 rounded-md border border-border bg-surface-0 px-3 text-body text-foreground outline-none focus:border-primary/70"
                />
                {review.isError && (
                  <span className="text-caption text-integrity-broken">
                    {describeApiError(review.error).message}
                  </span>
                )}
                <div className="flex items-center gap-2">
                  <Button
                    variant={pendingDecision === 'approved' ? 'default' : 'destructive'}
                    size="sm"
                    disabled={review.isPending}
                    onClick={confirm}
                  >
                    {review.isPending
                      ? 'Recording…'
                      : `Confirm ${pendingDecision === 'approved' ? 'approval' : 'rejection'}`}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={review.isPending}
                    onClick={() => {
                      setPendingDecision(null);
                      review.reset();
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SuggestionsBody({
  caseId,
  approver,
  setApprover,
}: {
  caseId: number;
  approver: string;
  setApprover: (v: string) => void;
}) {
  const suggestions = useSuggestions(caseId);
  return (
    <QueryBoundary
      query={suggestions}
      loadingMessage="Loading AI suggestions…"
      isEmpty={(d) => d.items.length === 0}
      emptyTitle="No AI suggestions"
      emptyMessage="The shadow agent has produced no advisory leads for this case."
    >
      {(data) => (
        <div className="flex flex-col gap-5">
          {/* Approver identity — recorded on every review (R10). */}
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface-1 p-4">
            <UserCheck className="size-4 text-primary" aria-hidden />
            <label htmlFor="approver" className="text-caption text-muted-foreground">
              Reviewing as:
            </label>
            <input
              id="approver"
              value={approver}
              onChange={(e) => setApprover(e.target.value)}
              placeholder="analyst identity, e.g. j.doe"
              className="h-9 min-w-[200px] flex-1 rounded-md border border-border bg-surface-0 px-3 font-mono text-body text-foreground outline-none focus:border-primary/70"
            />
          </div>

          {data.items.map((s) => (
            <SuggestionCard
              key={s.suggestion_id}
              caseId={caseId}
              suggestion={s}
              approver={approver}
            />
          ))}
        </div>
      )}
    </QueryBoundary>
  );
}

/**
 * The R6 human-review queue — the ONE writing page. AI suggestions stay visibly quarantined
 * (violet, dashed, AiBadge, "NOT EVIDENCE") throughout; a pending item can be approved/rejected via
 * an attributable, confirmed write that records WHO (R10). Approval changes status, never nature.
 */
export function SuggestionsPage() {
  const [approver, setApprover] = useApprover();
  return (
    <CaseScoped kicker="Custody" title="AI Suggestions">
      {(caseId) => (
        <SuggestionsBody caseId={caseId} approver={approver} setApprover={setApprover} />
      )}
    </CaseScoped>
  );
}
