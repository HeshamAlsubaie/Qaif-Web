/**
 * Investigation-board state for the CURRENT case. Holds the board (pins/groups/notes/links) in React
 * state and persists it to localStorage keyed by case id, so it survives a reload and stays scoped
 * per case (case N's board is separate from case M's). This is CLIENT analysis state only — the
 * provider never calls an API, never writes evidence or custody.
 *
 * The provider wraps the router so a "Send to board" button (on the Evidence / Threats / entity
 * views) and the Board page share ONE live board: pin on one view, see it on the board immediately.
 */
import * as React from 'react';

import { useSelectedCase } from '@/app/CaseContext';

import {
  emptyBoard,
  loadBoard,
  newId,
  nextZ,
  saveBoard,
  type BoardState,
  type PinSeed,
} from './boardModel';

interface BoardContextValue {
  caseId: number | null;
  board: BoardState;
  isPinned: (refId: string) => boolean;
  /** Pin a case artifact by reference (no-op if already pinned). Client-only; writes nothing. */
  pin: (seed: PinSeed) => void;
  /** Apply a pure update to the board (used by the board page's edit actions). */
  update: (fn: (board: BoardState) => BoardState) => void;
}

const BoardContext = React.createContext<BoardContextValue | null>(null);

interface Entry {
  caseId: number | null;
  board: BoardState;
}

function initialEntry(caseId: number | null): Entry {
  return { caseId, board: caseId === null ? emptyBoard() : loadBoard(caseId) };
}

export function BoardProvider({ children }: { children: React.ReactNode }) {
  const { caseId } = useSelectedCase();
  const [entry, setEntry] = React.useState<Entry>(() => initialEntry(caseId));

  // Reload the board whenever the selected case changes (keeps board strictly per-case).
  React.useEffect(() => {
    setEntry(initialEntry(caseId));
  }, [caseId]);

  // Persist whenever the board changes — always under the board's OWN case id (entry.caseId), so a
  // case switch can never write one case's board under another's key.
  React.useEffect(() => {
    if (entry.caseId !== null) saveBoard(entry.caseId, entry.board);
  }, [entry]);

  const update = React.useCallback((fn: (board: BoardState) => BoardState) => {
    setEntry((e) => ({ ...e, board: fn(e.board) }));
  }, []);

  const isPinned = React.useCallback(
    (refId: string) => entry.board.pins.some((p) => p.refId === refId),
    [entry.board.pins],
  );

  const pin = React.useCallback((seed: PinSeed) => {
    setEntry((e) => {
      if (e.board.pins.some((p) => p.refId === seed.refId)) return e; // already pinned — no dupes
      const n = e.board.pins.length;
      const placed = {
        ...seed,
        id: newId('pin'),
        x: 64 + (n % 6) * 40,
        y: 72 + (n % 6) * 40,
        z: nextZ(e.board),
      };
      return { ...e, board: { ...e.board, pins: [...e.board.pins, placed] } };
    });
  }, []);

  const value = React.useMemo<BoardContextValue>(
    () => ({ caseId: entry.caseId, board: entry.board, isPinned, pin, update }),
    [entry.caseId, entry.board, isPinned, pin, update],
  );

  return <BoardContext.Provider value={value}>{children}</BoardContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useBoard(): BoardContextValue {
  const ctx = React.useContext(BoardContext);
  if (!ctx) throw new Error('useBoard must be used within a BoardProvider');
  return ctx;
}
