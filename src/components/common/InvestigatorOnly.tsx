import { Lock } from 'lucide-react';

/**
 * The honest "you can't write as a Viewer" affordance. Shown in place of (or beside) a gated write
 * action when the acting role is Viewer, so the UI never silently drops a button — it says WHY and
 * points at the fix (the role switcher). This is UX honesty layered on the real backend gate (a
 * Viewer's write is 403'd regardless); it is never the security boundary itself.
 */
export function InvestigatorOnly({ action }: { action: string }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-dashed border-border bg-surface-2/50 px-3 py-2.5 text-caption text-muted-foreground">
      <Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <span>
        <span className="font-semibold text-foreground">Investigator only.</span> {action} is an
        audited write. You are acting as <span className="font-semibold">Viewer</span> — switch to{' '}
        <span className="font-semibold">Investigator</span> with the role toggle to continue.
      </span>
    </div>
  );
}
