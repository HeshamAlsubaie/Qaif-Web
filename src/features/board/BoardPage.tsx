/**
 * The Investigation Board (/board) — a case-scoped, read-only visual thinking canvas. The
 * investigator pins REFERENCES to evidence/findings/entities that already exist (via "Send to board"
 * on their views), then arranges, groups, annotates, connects, draws, and marks them up to reason
 * about the case. The full tool palette lives in the canvas's own toolbar.
 *
 * Discipline: this surface is READ-ONLY over evidence. It never creates, edits, or seals evidence or
 * custody, and never calls a write endpoint — the whole board (pins, positions, groups, notes,
 * connectors, shapes, icons, text, z-order) is client analysis state, persisted per-case in
 * localStorage (BoardContext). Its connectors, shapes, and notes are the analyst's working
 * hypotheses, framed and styled so they are never confused with confirmed case-graph relationships.
 */
import { Info } from 'lucide-react';

import { CaseScoped } from '@/components/common/CaseScoped';

import { BoardCanvas } from './BoardCanvas';

/** The honest framing banner: this is analysis, not custody — and it now covers every board tool. */
function BoardFraming() {
  return (
    <div className="flex items-start gap-2 rounded-md border border-border bg-surface-2/60 px-3 py-2 text-caption text-muted-foreground">
      <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
      <p>
        <span className="font-medium text-foreground">
          Working board — your analysis, not case custody.
        </span>{' '}
        Pins are read-only references to evidence that already exists; the connectors, shapes, and
        notes are your working hypotheses. Nothing here is written to the case graph or the chain of
        custody.
      </p>
    </div>
  );
}

function BoardWorkspace() {
  return (
    <div className="flex flex-col gap-3">
      <BoardFraming />
      <BoardCanvas />
    </div>
  );
}

export function BoardPage() {
  return (
    <CaseScoped
      kicker="Reasoning"
      title="Investigation Board"
      sub="A visual thinking canvas — pin, arrange, connect, draw, shape, mark, and annotate to reason about the case."
    >
      {() => <BoardWorkspace />}
    </CaseScoped>
  );
}
