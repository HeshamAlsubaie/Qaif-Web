import { FilePlus2, Info } from 'lucide-react';
import * as React from 'react';

import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

/**
 * Open-a-case — the deliberate custody boundary. Opening a case is the platform's SECOND audited
 * write (Investigator-only, POST /cases), so it is NOT wired here: this stage lays out the form
 * honestly and marks the write as arriving in Stage 3. The inputs are real and the submit is
 * disabled with an explicit notice — nothing here silently no-ops or fakes a created case.
 */
export function OpenCasePage() {
  const [title, setTitle] = React.useState('');
  const [reason, setReason] = React.useState('');

  return (
    <>
      <PageHeader
        kicker="New case"
        title="Open a case"
        sub="Custody begins here. Opening a case is an audited, Investigator-only write."
      />

      <Card>
        <CardContent className="flex flex-col gap-5 pt-6">
          <div className="flex items-start gap-2 rounded-md border border-dashed border-primary/40 bg-primary/5 px-3 py-2.5 text-caption text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <span>
              <span className="font-semibold text-foreground">Not wired yet.</span> The open-case
              write (<span className="font-mono">POST /cases</span>) is an audited, role-gated action
              landing in Stage 3. This form is laid out but does not submit — no case is created.
            </span>
          </div>

          {/* The form is deliberately inert: onSubmit is prevented and the button stays disabled, so
              the UI can never imply a case was opened before the write is actually wired. */}
          <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
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
              <span className="type-label">Reason for opening</span>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why this case is being opened — recorded as the opening rationale (R10)."
                rows={4}
                className="w-full rounded-md border border-border bg-surface-0 px-3 py-2 text-body text-foreground outline-none focus:border-primary/70"
              />
            </label>

            <div className="flex items-center gap-3">
              <Button type="submit" disabled>
                <FilePlus2 aria-hidden />
                Open case
              </Button>
              <span className="text-micro text-muted-foreground">Enabled in Stage 3.</span>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
