/**
 * Pure, client-only operations over the investigation board — every function takes a `BoardState`
 * and returns a NEW one (immutable), so they compose straight into the context's `update(fn)`. They
 * move/annotate/group/link PINS that reference existing evidence; nothing here calls an API, seals
 * evidence, or writes custody. The board is a thinking layer, and these are its edits.
 */
import { emptyBoard, newId, type BoardLink, type BoardState } from './boardModel';

// -- pins --------------------------------------------------------------------

export function movePin(board: BoardState, id: string, x: number, y: number): BoardState {
  return { ...board, pins: board.pins.map((p) => (p.id === id ? { ...p, x, y } : p)) };
}

/** Set (or clear, with '') the investigator's free-text annotation on a pin — a working note. */
export function annotatePin(board: BoardState, id: string, note: string): BoardState {
  return {
    ...board,
    pins: board.pins.map((p) => (p.id === id ? { ...p, note: note || undefined } : p)),
  };
}

/** Unpin: remove the reference AND any hypothesis links that touched it (never orphan a link). */
export function removePin(board: BoardState, id: string): BoardState {
  return {
    ...board,
    pins: board.pins.filter((p) => p.id !== id),
    links: board.links.filter((l) => l.from !== id && l.to !== id),
  };
}

// -- groups (named visual zones) --------------------------------------------

export function addGroup(board: BoardState): BoardState {
  const n = board.groups.length;
  const group = {
    id: newId('group'),
    name: 'New group',
    x: 48 + (n % 4) * 28,
    y: 48 + (n % 4) * 28,
    w: 340,
    h: 240,
  };
  return { ...board, groups: [...board.groups, group] };
}

export function moveGroup(board: BoardState, id: string, x: number, y: number): BoardState {
  return { ...board, groups: board.groups.map((g) => (g.id === id ? { ...g, x, y } : g)) };
}

export function resizeGroup(board: BoardState, id: string, w: number, h: number): BoardState {
  return {
    ...board,
    groups: board.groups.map((g) =>
      g.id === id ? { ...g, w: Math.max(180, w), h: Math.max(140, h) } : g,
    ),
  };
}

export function renameGroup(board: BoardState, id: string, name: string): BoardState {
  return { ...board, groups: board.groups.map((g) => (g.id === id ? { ...g, name } : g)) };
}

export function removeGroup(board: BoardState, id: string): BoardState {
  return { ...board, groups: board.groups.filter((g) => g.id !== id) };
}

// -- sticky notes ------------------------------------------------------------

export function addNote(board: BoardState): BoardState {
  const n = board.notes.length;
  const note = { id: newId('note'), text: '', x: 96 + (n % 6) * 24, y: 96 + (n % 6) * 24 };
  return { ...board, notes: [...board.notes, note] };
}

export function moveNote(board: BoardState, id: string, x: number, y: number): BoardState {
  return { ...board, notes: board.notes.map((n) => (n.id === id ? { ...n, x, y } : n)) };
}

export function setNoteText(board: BoardState, id: string, text: string): BoardState {
  return { ...board, notes: board.notes.map((n) => (n.id === id ? { ...n, text } : n)) };
}

export function removeNote(board: BoardState, id: string): BoardState {
  return { ...board, notes: board.notes.filter((n) => n.id !== id) };
}

// -- hypothesis links --------------------------------------------------------

const samePair = (l: BoardLink, a: string, b: string): boolean =>
  (l.from === a && l.to === b) || (l.from === b && l.to === a);

/** Draw a hypothesis link between two pins — no self-links, no duplicate pair (order-insensitive). */
export function addLink(board: BoardState, from: string, to: string): BoardState {
  if (from === to) return board;
  if (board.links.some((l) => samePair(l, from, to))) return board;
  return { ...board, links: [...board.links, { id: newId('link'), from, to }] };
}

export function setLinkLabel(board: BoardState, id: string, label: string): BoardState {
  return {
    ...board,
    links: board.links.map((l) => (l.id === id ? { ...l, label: label || undefined } : l)),
  };
}

export function removeLink(board: BoardState, id: string): BoardState {
  return { ...board, links: board.links.filter((l) => l.id !== id) };
}

// -- whole board -------------------------------------------------------------

export function clearBoard(): BoardState {
  return emptyBoard();
}
