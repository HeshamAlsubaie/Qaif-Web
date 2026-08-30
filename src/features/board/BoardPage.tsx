/**
 * The Investigation Board (/board) — a case-scoped, read-only visual thinking canvas. The
 * investigator pins REFERENCES to evidence/findings/entities that already exist (via "Send to board"
 * on their views), then arranges, groups, annotates, and links them to reason about the case.
 *
 * Discipline: this surface is READ-ONLY over evidence. It never creates, edits, or seals evidence or
 * custody, and never calls a write endpoint — the whole board is client analysis state, persisted
 * per-case in localStorage (BoardContext). Its links and notes are the analyst's working hypotheses,
 * framed and styled so they are never confused with confirmed case-graph relationships.
 */
import { Group, Info, StickyNote, Trash2 } from 'lucide-react';
import * as React from 'react';

import { CaseScoped } from '@/components/common/CaseScoped';
import { Button } from '@/components/ui/button';

import { BoardCanvas } from './BoardCanvas';
import { useBoard } from './BoardContext';
import { addGroup, addNote, clearBoard } from './boardOps';

function BoardToolbar() {
  const { board, update } = useBoard();
  const [confirmClear, setConfirmClear] = React.useState(false);
  const counts = `${board.pins.length} pin${board.pins.length === 1 ? '' : 's'} · ${
    board.groups.length
  } group${board.groups.length === 1 ? '' : 's'} · ${board.notes.length} note${
    board.notes.length === 1 ? '' : 's'
  } · ${board.links.length} link${board.links.length === 1 ? '' : 's'}`;
  const isEmpty = board.pins.length === 0 && board.groups.length === 0 && board.notes.length === 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="outline" onClick={() => update((b) => addGroup(b))}>
        <Group aria-hidden />
        Add group
      </Button>
      <Button size="sm" variant="outline" onClick={() => update((b) => addNote(b))}>
        <StickyNote aria-hidden />
        Add note
      </Button>
      <span className="ml-1 text-caption tabular-nums text-muted-foreground">{counts}</span>
      <div className="ml-auto">
        {confirmClear ? (
          <div className="flex items-center gap-2">
            <span className="text-caption text-muted-foreground">Clear the whole board?</span>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                update(() => clearBoard());
                setConfirmClear(false);
              }}
            >
              Confirm
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmClear(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            disabled={isEmpty}
            onClick={() => setConfirmClear(true)}
          >
            <Trash2 aria-hidden />
            Clear board
          </Button>
        )}
      </div>
    </div>
  );
}

/** The honest framing banner: this is analysis, not custody. */
function BoardFraming() {
  return (
    <div className="flex items-start gap-2 rounded-md border border-border bg-surface-2/60 px-3 py-2 text-caption text-muted-foreground">
      <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
      <p>
        <span className="font-medium text-foreground">
          Working board — your analysis, not case custody.
        </span>{' '}
        Pins are read-only references to evidence that already exists; the links and notes are your
        working hypotheses. Nothing here is written to the case graph or the chain of custody.
      </p>
    </div>
  );
}

function BoardWorkspace() {
  return (
    <div className="flex flex-col gap-3">
      <BoardFraming />
      <BoardToolbar />
      <BoardCanvas />
    </div>
  );
}

export function BoardPage() {
  return (
    <CaseScoped
      kicker="Reasoning"
      title="Investigation Board"
      sub="A visual thinking canvas — pin, arrange, group, annotate, and link references to reason about the case."
    >
      {() => <BoardWorkspace />}
    </CaseScoped>
  );
}
