/**
 * Pure, client-only operations over the investigation board — every function takes a `BoardState`
 * and returns a NEW one (immutable), so they compose straight into the context's `update(fn)`. They
 * move/annotate/group/link PINS that reference existing evidence; nothing here calls an API, seals
 * evidence, or writes custody. The board is a thinking layer, and these are its edits.
 */
import {
  backZ,
  emptyBoard,
  newId,
  nextZ,
  type BoardLink,
  type BoardState,
  type IconName,
  type ShapeKind,
  type Vec,
} from './boardModel';

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

// -- shapes (box / circle / arrow) -------------------------------------------

export function addShape(
  board: BoardState,
  shape: ShapeKind,
  x: number,
  y: number,
  w: number,
  h: number,
): BoardState {
  const el = { id: newId('shape'), shape, x, y, w: Math.max(8, w), h: Math.max(8, h), z: nextZ(board) };
  return { ...board, shapes: [...board.shapes, el] };
}

export function resizeShape(board: BoardState, id: string, w: number, h: number): BoardState {
  return {
    ...board,
    shapes: board.shapes.map((s) =>
      s.id === id ? { ...s, w: Math.max(8, w), h: Math.max(8, h) } : s,
    ),
  };
}

// -- free-hand drawings ------------------------------------------------------

export function addDrawing(board: BoardState, points: Vec[]): BoardState {
  const el = { id: newId('draw'), points, z: nextZ(board) };
  return { ...board, drawings: [...board.drawings, el] };
}

// -- icons / markers ---------------------------------------------------------

export function addIcon(board: BoardState, name: IconName, x: number, y: number): BoardState {
  const el = { id: newId('icon'), name, x, y, size: 28, z: nextZ(board) };
  return { ...board, icons: [...board.icons, el] };
}

export function resizeIcon(board: BoardState, id: string, size: number): BoardState {
  return {
    ...board,
    icons: board.icons.map((i) => (i.id === id ? { ...i, size: Math.max(14, size) } : i)),
  };
}

// -- text labels -------------------------------------------------------------

export function addText(board: BoardState, x: number, y: number): BoardState {
  const el = { id: newId('text'), text: '', x, y, fontSize: 16, z: nextZ(board) };
  return { ...board, texts: [...board.texts, el] };
}

export function setTextValue(board: BoardState, id: string, text: string): BoardState {
  return { ...board, texts: board.texts.map((t) => (t.id === id ? { ...t, text } : t)) };
}

export function resizeText(board: BoardState, id: string, fontSize: number): BoardState {
  return {
    ...board,
    texts: board.texts.map((t) =>
      t.id === id ? { ...t, fontSize: Math.min(96, Math.max(10, fontSize)) } : t,
    ),
  };
}

// -- generic selection ops (move / delete / z-order across every kind) -------

/** Translate every selected element by (dx, dy). Drawings translate all their points. */
export function moveElementsBy(
  board: BoardState,
  ids: ReadonlySet<string>,
  dx: number,
  dy: number,
): BoardState {
  const shift = <T extends { id: string; x: number; y: number }>(o: T): T =>
    ids.has(o.id) ? { ...o, x: Math.max(0, o.x + dx), y: Math.max(0, o.y + dy) } : o;
  return {
    ...board,
    pins: board.pins.map(shift),
    groups: board.groups.map(shift),
    notes: board.notes.map(shift),
    shapes: board.shapes.map(shift),
    icons: board.icons.map(shift),
    texts: board.texts.map(shift),
    drawings: board.drawings.map((d) =>
      ids.has(d.id)
        ? { ...d, points: d.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) }
        : d,
    ),
  };
}

/** Delete every selected element; also prunes connectors whose pin endpoints were removed. */
export function removeElements(board: BoardState, ids: ReadonlySet<string>): BoardState {
  const removedPins = new Set(board.pins.filter((p) => ids.has(p.id)).map((p) => p.id));
  return {
    ...board,
    pins: board.pins.filter((p) => !ids.has(p.id)),
    groups: board.groups.filter((g) => !ids.has(g.id)),
    notes: board.notes.filter((n) => !ids.has(n.id)),
    shapes: board.shapes.filter((s) => !ids.has(s.id)),
    icons: board.icons.filter((i) => !ids.has(i.id)),
    texts: board.texts.filter((t) => !ids.has(t.id)),
    drawings: board.drawings.filter((d) => !ids.has(d.id)),
    links: board.links.filter(
      (l) => !ids.has(l.id) && !removedPins.has(l.from) && !removedPins.has(l.to),
    ),
  };
}

function setZ(board: BoardState, ids: ReadonlySet<string>, z: number): BoardState {
  const bump = <T extends { id: string; z?: number }>(o: T): T =>
    ids.has(o.id) ? { ...o, z } : o;
  return {
    ...board,
    pins: board.pins.map(bump),
    notes: board.notes.map(bump),
    links: board.links.map(bump),
    shapes: board.shapes.map(bump),
    icons: board.icons.map(bump),
    texts: board.texts.map(bump),
    drawings: board.drawings.map(bump),
  };
}

/** Bring the selection above everything else. */
export function bringForward(board: BoardState, ids: ReadonlySet<string>): BoardState {
  return setZ(board, ids, nextZ(board));
}

/** Send the selection behind everything else. */
export function sendBackward(board: BoardState, ids: ReadonlySet<string>): BoardState {
  return setZ(board, ids, backZ(board));
}

// -- whole board -------------------------------------------------------------

export function clearBoard(): BoardState {
  return emptyBoard();
}
