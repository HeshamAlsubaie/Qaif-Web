/**
 * A tiny pointer-drag hook for the board's free-position surfaces (pins, groups, sticky notes, the
 * group resize handle). It reports a new (x, y) as the pointer moves, from a captured start point —
 * because it works in DELTAS, it is immune to canvas scroll/offset. Purely local UI motion; it never
 * persists anything itself — the caller decides what to do with each new position.
 */
import * as React from 'react';

type Drag = { px: number; py: number; x: number; y: number };

/**
 * Wire the returned handlers onto a drag handle. `x`/`y` are the element's current position and
 * `onMove` receives the next position (clamped to the canvas' top-left origin). Left-button only, so
 * a right-click / context menu never starts a drag.
 */
export function useDrag(
  x: number,
  y: number,
  onMove: (x: number, y: number) => void,
): {
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
} {
  const origin = React.useRef<Drag | null>(null);

  const onPointerDown = React.useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
      origin.current = { px: e.clientX, py: e.clientY, x, y };
      e.stopPropagation();
    },
    [x, y],
  );

  const onPointerMove = React.useCallback(
    (e: React.PointerEvent) => {
      const o = origin.current;
      if (!o) return;
      onMove(Math.max(0, o.x + (e.clientX - o.px)), Math.max(0, o.y + (e.clientY - o.py)));
    },
    [onMove],
  );

  const onPointerUp = React.useCallback((e: React.PointerEvent) => {
    if (!origin.current) return;
    origin.current = null;
    try {
      (e.currentTarget as Element).releasePointerCapture(e.pointerId);
    } catch {
      /* capture may already be gone — nothing to release */
    }
  }, []);

  return { onPointerDown, onPointerMove, onPointerUp };
}
