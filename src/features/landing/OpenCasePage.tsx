import { AlertTriangle, FilePlus2, Loader2, ShieldCheck } from 'lucide-react';
import * as React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useSelectedCase } from '@/app/CaseContext';
import { useRole } from '@/app/RoleContext';
import { useOpenCase } from '@/api/queries';
import { InvestigatorOnly } from '@/components/common/InvestigatorOnly';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { describeApiError } from '@/lib/apiError';

/**
 * Open-a-case — the deliberate custody boundary, now REAL (Stage 3). Opening a case is the
 * platform's audited, Investigator-only write (`POST /cases`): it creates an empty attributed case
 * plus its genesis custody entry. The reason is MANDATORY (R10) — the submit stays disabled until
 * both title and reason are non-blank, and the backend independently 422s on a blank reason. On
 * success the new case is selected and we step INTO it; any failure (403/422) is surfaced honestly,
 * never faked as a created case.
 *
 * The form may be PRE-SEEDED via router state (`{ title, reason }`) — e.g. from a Wazuh alert's
 * "open a case for this alert" launch. The pre-seed is only an initial value; the investigator can
 * edit it, and the mandatory-reason rule still holds.
 */
export function OpenCasePage() {
  const location = useLocation();
  const seed = (location.state as { title?: string; reason?: string } | null) ?? null;
  const [title, setTitle] = React.useState(seed?.title ?? '');
  const [reason, setReason] = React.useState(seed?.reason ?? '');
  const navigate = useNavigate();
  const { setCaseId } = useSelectedCase();
  const { canWrite } = useRole();
  const open = useOpenCase();

  // Both fields mandatory (R10): a blank title or reason can never open a case from this form.
  // A Viewer cannot submit at all — the whole form is gated (and the backend 403s regardless).
  const canSubmit =
    canWrite && title.trim() !== '' && reason.trim() !== '' && !open.isPending;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    open.mutate(
      { title: title.trim(), reason: reason.trim() },
      {
        onSuccess: (res) => {
          // Custody has begun: select the freshly-opened case and enter the console at its overview.
          setCaseId(res.case_id);
          navigate('/overview');
        },
      },
    );
  };

  return (
    <>
      <PageHeader
        kicker="New case"
        title="Open a case"
        sub="Custody begins here. Opening a case is an audited, Investigator-only write."
      />

      {!canWrite ? (
        <Card>
          <CardContent className="flex flex-col gap-4 pt-6">
            <InvestigatorOnly action="Opening a case" />
            <span className="text-caption text-muted-foreground">
              You can still search, look up indicators, and read cases as a Viewer. Opening a case is
              the deliberate custody boundary and stays Investigator-only.
            </span>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col gap-5 pt-6">
            <div className="flex items-start gap-2 rounded-md border border-dashed border-primary/40 bg-primary/5 px-3 py-2.5 text-caption text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <span>
                <span className="font-semibold text-foreground">Audited write.</span> Submitting
                records a genesis custody entry (<span className="font-mono">POST /cases</span>)
                attributed to you as an Investigator. The reason is the mandatory opening rationale
                (R10).
              </span>
            </div>

            <form className="flex flex-col gap-4" onSubmit={onSubmit}>
            <label className="flex flex-col gap-1.5">
              <span className="type-label">Case title</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. C2 beacon on finance subnet"
                className="h-10 w-full rounded-md border border-border bg-surface-0 px-3 text-body text-foreground outline-none focus:border-primary/70"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="type-label">
                Reason for opening <span className="text-primary">*</span>
              </span>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why this case is being opened — recorded as the opening rationale (R10)."
                rows={4}
                className="w-full rounded-md border border-border bg-surface-0 px-3 py-2 text-body text-foreground outline-none focus:border-primary/70"
              />
              <span className="text-micro text-muted-foreground">
                Mandatory — a case opened with no stated rationale is a forensic gap.
              </span>
            </label>

            {open.isError && (
              <div
                className="flex items-start gap-2 rounded-md border border-integrity-broken/50 bg-integrity-broken/10 p-3 text-caption text-integrity-broken-foreground"
                role="alert"
              >
                <AlertTriangle
                  className="mt-0.5 size-4 shrink-0 text-integrity-broken"
                  aria-hidden
                />
                <span>
                  <span className="font-semibold">{describeApiError(open.error).title}.</span>{' '}
                  {describeApiError(open.error).message} No case was opened.
                </span>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={!canSubmit}>
                {open.isPending ? (
                  <>
                    <Loader2 className="animate-spin" aria-hidden />
                    Opening…
                  </>
                ) : (
                  <>
                    <FilePlus2 aria-hidden />
                    Open case
                  </>
                )}
              </Button>
              {!title.trim() || !reason.trim() ? (
                <span className="text-micro text-muted-foreground">
                  Title and reason are both required.
                </span>
              ) : null}
            </div>
            </form>
          </CardContent>
        </Card>
      )}
    </>
  );
}
