import { ChevronDown, Search } from 'lucide-react';
import * as React from 'react';

import { useCase } from '@/api/queries';
import { useSelectedCase } from '@/app/CaseContext';
import { Button } from '@/components/ui/button';

const RECENTS_KEY = 'qaif.recentCaseIds';

function readRecents(): number[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr.filter((n): n is number => typeof n === 'number').slice(0, 6);
  } catch {
    return [];
  }
}

function pushRecent(id: number): number[] {
  const next = [id, ...readRecents().filter((x) => x !== id)].slice(0, 6);
  try {
    localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  } catch {
    /* non-fatal */
  }
  return next;
}

/**
 * Top-bar case selector: shows the loaded case (number + title) and a popover to load a case by id.
 * The read API has no "list cases" route, so this never fabricates a case list — it offers a by-id
 * input plus this browser's recents.
 */
export function CaseSelector() {
  const { caseId, setCaseId } = useSelectedCase();
  const caseQuery = useCase(caseId);
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState('');
  const [recents, setRecents] = React.useState<number[]>(readRecents);
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (caseId !== null) setRecents(pushRecent(caseId));
  }, [caseId]);

  React.useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  function load(id: number) {
    setCaseId(id);
    setOpen(false);
    setDraft('');
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const id = Number.parseInt(draft.trim(), 10);
    if (Number.isFinite(id) && id > 0) load(id);
  }

  const label =
    caseId === null
      ? { kicker: 'No case loaded', value: 'Select a case', empty: true }
      : caseQuery.isSuccess
        ? { kicker: caseQuery.data.case_number, value: caseQuery.data.title, empty: false }
        : caseQuery.isError
          ? { kicker: `Case ${caseId}`, value: 'Failed to load', empty: false }
          : { kicker: `Case ${caseId}`, value: 'Loading…', empty: false };

  return (
    <div className="relative" ref={rootRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex min-w-[260px] items-center gap-3 rounded-md border border-border bg-surface-1 py-1.5 pl-3 pr-2.5 text-left transition-colors hover:border-border/80 hover:bg-surface-2"
      >
        <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label.kicker}
          </span>
          <span
            className={
              label.empty
                ? 'truncate text-body text-muted-foreground'
                : 'truncate text-body font-semibold text-foreground'
            }
          >
            {label.value}
          </span>
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Load a case"
          className="absolute left-0 top-[calc(100%+8px)] z-40 flex w-80 flex-col gap-3 rounded-lg border border-border bg-popover p-4 shadow-lg"
        >
          <span className="type-label">Load case by id</span>
          <form className="flex gap-2" onSubmit={onSubmit}>
            <input
              inputMode="numeric"
              placeholder="e.g. 700001"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
              className="h-9 flex-1 rounded-md border border-border bg-surface-0 px-3 font-mono text-body text-foreground outline-none focus:border-primary/70"
            />
            <Button type="submit" size="sm">
              Load
            </Button>
          </form>
          <span className="type-caption">
            The seeded demo case is <code className="text-foreground">700001</code>.
          </span>

          {recents.length > 0 && (
            <>
              <span className="type-label">Recent</span>
              <div className="flex flex-col gap-0.5">
                {recents.map((id) => (
                  <button
                    key={id}
                    onClick={() => load(id)}
                    className="hover:bg-primary/12 flex items-center justify-between rounded-md px-2.5 py-1.5 text-left text-body text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <span>Case {id}</span>
                    <span className="font-mono text-micro text-muted-foreground">#{id}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
