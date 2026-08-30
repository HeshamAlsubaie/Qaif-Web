/**
 * The investigation-board canvas — a real, free-position THINKING surface. It renders the current
 * case's pins (references to real evidence/findings/entities) plus the analyst's own working layer:
 * named group zones, sticky notes, directed hypothesis connectors, free-hand ink, shapes, icon
 * markers, and text labels. A toolbar exposes the tools; selection supports multi-select, move,
 * resize, delete, and z-order (bring forward / send back).
 *
 * FORENSIC BOUNDARY (hard): this is READ-ONLY over evidence. It NEVER calls an API, never writes to
 * the case graph or the chain of custody — every edit is client analysis state, persisted to
 * localStorage per case by BoardContext. Everything the analyst draws (connectors, shapes, ink,
 * notes, text) is a HYPOTHESIS and is rendered "drawn by me": a distinct rose, dashed, hand-drawn
 * (sketch-filtered) treatment that can never be mistaken for a confirmed OR probabilistic case-graph
 * relationship. None of it appears in correlation and none of it is exportable as a finding.
 */
import {
  AlertTriangle,
  Bookmark,
  Check,
  Circle as CircleIcon,
  Eye,
  Flag,
  Group as GroupIcon,
  GripVertical,
  HardDrive,
  KeyRound,
  Link2,
  MessageSquarePlus,
  MousePointer2,
  MoveUpRight,
  Pencil,
  Pin,
  BringToFront,
  SendToBack,
  ShieldAlert,
  Skull,
  Square as SquareIcon,
  Star,
  StickyNote,
  Target,
  Trash2,
  Type as TypeIcon,
  Waypoints,
  X,
  type LucideIcon,
} from 'lucide-react';
import * as React from 'react';

import { IntegrityBadge } from '@/components/forensic/IntegrityBadge';
import { TierBadge } from '@/components/forensic/TierBadge';
import { cn } from '@/lib/utils';

import { useBoard } from './BoardContext';
import {
  BOARD_ICON_NAMES,
  Z_DEFAULT,
  type BoardDrawing,
  type BoardIcon,
  type BoardLink,
  type BoardPin,
  type BoardShape,
  type BoardState,
  type BoardText,
  type IconName,
  type PinKind,
  type Vec,
} from './boardModel';
import {
  addDrawing,
  addIcon,
  addGroup,
  addLink,
  addNote,
  addShape,
  addText,
  annotatePin,
  bringForward,
  clearBoard,
  moveElementsBy,
  removeElements,
  removeGroup,
  removeLink,
  removePin,
  renameGroup,
  resizeGroup,
  resizeIcon,
  resizeShape,
  resizeText,
  sendBackward,
  setLinkLabel,
  setNoteText,
  setTextValue,
} from './boardOps';
import { useDrag } from './useDrag';

const PIN_WIDTH = 224;
const NOTE_WIDTH = 192;

/** The analyst's "drawn by me" ink — a rose that is NOT any case tier (cyan confirmed / amber
 * probabilistic) nor the AI violet, so a board mark can never read as a case relationship. */
const SKETCH = 'hsl(336 74% 68%)';

type Update = (fn: (b: BoardState) => BoardState) => void;
type Size = { w: number; h: number };
type Rect = { x: number; y: number; w: number; h: number };

type Tool =
  | 'select'
  | 'connector'
  | 'draw'
  | 'box'
  | 'circle'
  | 'arrow'
  | 'text'
  | `icon:${IconName}`;

type Draft =
  | { kind: 'draw'; points: Vec[] }
  | { kind: 'box' | 'circle' | 'arrow'; x0: number; y0: number; x1: number; y1: number };

const KIND_ICON: Record<PinKind, LucideIcon> = {
  evidence: HardDrive,
  finding: ShieldAlert,
  entity: Waypoints,
};
const KIND_LABEL: Record<PinKind, string> = {
  evidence: 'Evidence',
  finding: 'Finding',
  entity: 'Entity',
};

const MARKER_ICON: Record<IconName, LucideIcon> = {
  flag: Flag,
  star: Star,
  alert: AlertTriangle,
  target: Target,
  key: KeyRound,
  skull: Skull,
  eye: Eye,
  bookmark: Bookmark,
};

// -- shared measurement (HTML elements report their rendered size for anchoring/bboxes) ----------

function useReportSize(id: string, reportSize: (id: string, s: Size) => void) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const report = () => reportSize(id, { w: el.offsetWidth, h: el.offsetHeight });
    report();
    const ro = new ResizeObserver(report);
    ro.observe(el);
    return () => ro.disconnect();
  }, [id, reportSize]);
  return ref;
}

// -- sketch defs (one hand-drawn filter + one arrowhead, referenced by every board mark) ----------

function SketchDefs() {
  return (
    <svg className="pointer-events-none absolute" width="0" height="0" aria-hidden>
      <defs>
        <filter id="board-sketch" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="2" seed="7" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="2.4" />
        </filter>
        <marker
          id="board-arrow"
          viewBox="0 0 10 10"
          refX="8.5"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M0,0 L10,5 L0,10 z" fill={SKETCH} />
        </marker>
      </defs>
    </svg>
  );
}

// -- pin card ----------------------------------------------------------------

function PinCard({
  pin,
  selected,
  connectorMode,
  isConnectSource,
  onElementDown,
  onPick,
  onStartConnect,
  update,
  reportSize,
}: {
  pin: BoardPin;
  selected: boolean;
  connectorMode: boolean;
  isConnectSource: boolean;
  onElementDown: (e: React.PointerEvent, id: string) => void;
  onPick: (id: string) => void;
  onStartConnect: (id: string) => void;
  update: Update;
  reportSize: (id: string, s: Size) => void;
}) {
  const [editingNote, setEditingNote] = React.useState(false);
  const ref = useReportSize(pin.id, reportSize);
  const Icon = KIND_ICON[pin.kind];

  return (
    <div
      ref={ref}
      // In connector mode a click anywhere on the card picks it as an endpoint (capture phase).
      onPointerDownCapture={(e) => {
        if (connectorMode) {
          e.stopPropagation();
          onPick(pin.id);
        }
      }}
      className={cn(
        'absolute flex flex-col rounded-lg border bg-surface-1 shadow-lg',
        selected ? 'border-primary ring-2 ring-primary/50' : 'border-border',
        isConnectSource && 'ring-2 ring-primary',
        connectorMode && !isConnectSource && 'cursor-copy hover:ring-2 hover:ring-primary/60',
      )}
      style={{ left: pin.x, top: pin.y, width: PIN_WIDTH, zIndex: pin.z ?? Z_DEFAULT.pin }}
    >
      <div
        className="flex cursor-grab touch-none items-center gap-1.5 rounded-t-lg border-b border-border/60 bg-surface-2 px-2 py-1.5 active:cursor-grabbing"
        onPointerDown={(e) => onElementDown(e, pin.id)}
      >
        <GripVertical className="size-3.5 shrink-0 text-muted-foreground/60" aria-hidden />
        <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {KIND_LABEL[pin.kind]}
        </span>
        {pin.subtitle && (
          <span className="ml-auto truncate font-mono text-[10px] text-muted-foreground">
            {pin.subtitle}
          </span>
        )}
        <button
          type="button"
          onClick={() => update((b) => removePin(b, pin.id))}
          onPointerDown={(e) => e.stopPropagation()}
          className="shrink-0 rounded p-0.5 text-muted-foreground/70 hover:bg-surface-3 hover:text-foreground"
          title="Remove from board (unpin — does not touch evidence)"
          aria-label="Unpin"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      </div>

      <div className="flex flex-col gap-2 p-2.5">
        <span className="break-words text-caption font-medium leading-snug text-foreground">
          {pin.title}
        </span>

        {pin.fields.length > 0 && (
          <dl className="flex flex-col gap-1">
            {pin.fields.map((f) => (
              <div key={f.label} className="flex items-baseline justify-between gap-2">
                <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {f.label}
                </dt>
                <dd className="truncate font-mono text-[10px] text-foreground" title={f.value}>
                  {f.value}
                </dd>
              </div>
            ))}
          </dl>
        )}

        <div>
          {pin.tier ? (
            <TierBadge tier={pin.tier} />
          ) : pin.integrity !== undefined ? (
            <IntegrityBadge verified={pin.integrity} />
          ) : null}
        </div>

        {editingNote ? (
          <textarea
            autoFocus
            value={pin.note ?? ''}
            onChange={(e) => update((b) => annotatePin(b, pin.id, e.target.value))}
            onBlur={() => setEditingNote(false)}
            onPointerDown={(e) => e.stopPropagation()}
            placeholder="Your note on this reference…"
            className="min-h-[52px] w-full resize-y rounded border border-border bg-surface-0 p-1.5 text-[11px] text-foreground outline-none focus:border-primary"
          />
        ) : (
          pin.note && (
            <p
              className="cursor-text whitespace-pre-wrap rounded border border-dashed border-border/70 bg-surface-0/60 p-1.5 text-[11px] italic text-muted-foreground"
              onClick={() => setEditingNote(true)}
              title="Edit note"
            >
              {pin.note}
            </p>
          )
        )}

        <div className="flex items-center gap-1 border-t border-border/50 pt-1.5">
          <button
            type="button"
            onClick={() => setEditingNote((v) => !v)}
            onPointerDown={(e) => e.stopPropagation()}
            className={cn(
              'inline-flex items-center gap-1 rounded px-1.5 py-1 text-[10px] font-medium text-muted-foreground hover:bg-surface-3 hover:text-foreground',
              editingNote && 'bg-surface-3 text-foreground',
            )}
            title="Annotate this reference"
          >
            <MessageSquarePlus className="size-3.5" aria-hidden />
            Note
          </button>
          <button
            type="button"
            onClick={() => onStartConnect(pin.id)}
            onPointerDown={(e) => e.stopPropagation()}
            className={cn(
              'inline-flex items-center gap-1 rounded px-1.5 py-1 text-[10px] font-medium text-muted-foreground hover:bg-surface-3 hover:text-foreground',
              isConnectSource && 'bg-primary/15 text-primary',
            )}
            title="Draw a directed hypothesis connector from this card"
          >
            <Link2 className="size-3.5" aria-hidden />
            Connect
          </button>
        </div>
      </div>
    </div>
  );
}

// -- group zone --------------------------------------------------------------

function GroupZone({
  group,
  selected,
  onElementDown,
  update,
}: {
  group: BoardState['groups'][number];
  selected: boolean;
  onElementDown: (e: React.PointerEvent, id: string) => void;
  update: Update;
}) {
  const resize = useDrag(group.w, group.h, (w, h) => update((b) => resizeGroup(b, group.id, w, h)));
  return (
    <div
      className={cn(
        'absolute rounded-lg border border-dashed bg-surface-2/25',
        selected ? 'border-primary' : 'border-border',
      )}
      style={{ left: group.x, top: group.y, width: group.w, height: group.h, zIndex: 1 }}
    >
      <div
        className="flex cursor-grab touch-none items-center gap-1.5 rounded-t-lg bg-surface-2/70 px-2 py-1 active:cursor-grabbing"
        onPointerDown={(e) => onElementDown(e, group.id)}
      >
        <GripVertical className="size-3.5 shrink-0 text-muted-foreground/60" aria-hidden />
        <input
          value={group.name}
          onChange={(e) => update((b) => renameGroup(b, group.id, e.target.value))}
          onPointerDown={(e) => e.stopPropagation()}
          className="w-full bg-transparent text-[11px] font-semibold uppercase tracking-wider text-muted-foreground outline-none placeholder:text-muted-foreground/50"
          placeholder="Group name"
          aria-label="Group name"
        />
        <button
          type="button"
          onClick={() => update((b) => removeGroup(b, group.id))}
          onPointerDown={(e) => e.stopPropagation()}
          className="shrink-0 rounded p-0.5 text-muted-foreground/70 hover:bg-surface-3 hover:text-foreground"
          title="Delete group (pins stay on the board)"
          aria-label="Delete group"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      </div>
      <div
        className="absolute bottom-0 right-0 size-4 cursor-nwse-resize touch-none"
        {...resize}
        title="Resize group"
      >
        <div className="absolute bottom-1 right-1 size-2 border-b-2 border-r-2 border-muted-foreground/50" />
      </div>
    </div>
  );
}

// -- sticky note -------------------------------------------------------------

function StickyCard({
  note,
  selected,
  onElementDown,
  update,
  reportSize,
}: {
  note: BoardState['notes'][number];
  selected: boolean;
  onElementDown: (e: React.PointerEvent, id: string) => void;
  update: Update;
  reportSize: (id: string, s: Size) => void;
}) {
  const ref = useReportSize(note.id, reportSize);
  return (
    <div
      ref={ref}
      className={cn(
        'absolute flex flex-col rounded-md border shadow-lg',
        selected ? 'border-primary ring-2 ring-primary/50' : 'border-amber-500/40',
      )}
      style={{
        left: note.x,
        top: note.y,
        width: NOTE_WIDTH,
        zIndex: note.z ?? Z_DEFAULT.note,
        background: 'hsl(45 90% 55% / 0.10)',
      }}
    >
      <div
        className="flex cursor-grab touch-none items-center gap-1 rounded-t-md border-b border-amber-500/30 bg-amber-400/15 px-1.5 py-1 active:cursor-grabbing"
        onPointerDown={(e) => onElementDown(e, note.id)}
      >
        <GripVertical className="size-3.5 shrink-0 text-amber-500/70" aria-hidden />
        <span className="text-[9px] font-semibold uppercase tracking-wider text-amber-500/90">
          Note
        </span>
        <button
          type="button"
          onClick={() => update((b) => removeElements(b, new Set([note.id])))}
          onPointerDown={(e) => e.stopPropagation()}
          className="ml-auto shrink-0 rounded p-0.5 text-amber-500/70 hover:bg-amber-400/20 hover:text-amber-400"
          title="Delete note"
          aria-label="Delete note"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      </div>
      <textarea
        value={note.text}
        onChange={(e) => update((b) => setNoteText(b, note.id, e.target.value))}
        onPointerDown={(e) => e.stopPropagation()}
        placeholder="Sticky note…"
        className="min-h-[72px] w-full resize-y rounded-b-md bg-transparent p-2 text-[11px] leading-snug text-amber-100/90 outline-none placeholder:text-amber-200/40"
      />
    </div>
  );
}

// -- shapes (box / circle / arrow) — hand-drawn, "mine" --------------------------------------------

function shapeRect(s: BoardShape): Rect {
  return {
    x: Math.min(s.x, s.x + s.w),
    y: Math.min(s.y, s.y + s.h),
    w: Math.abs(s.w),
    h: Math.abs(s.h),
  };
}

function ShapeEl({
  shape,
  selected,
  onElementDown,
}: {
  shape: BoardShape;
  selected: boolean;
  onElementDown: (e: React.PointerEvent, id: string) => void;
}) {
  const r = shapeRect(shape);
  const stroke = { stroke: SKETCH, strokeWidth: 2, fill: 'none', filter: 'url(#board-sketch)' } as const;
  return (
    // The svg box is click-through; only the drawn stroke (visibleStroke) is a target, so a ring
    // never steals a click from a pin inside it.
    <svg
      className="pointer-events-none absolute overflow-visible"
      style={{ left: r.x, top: r.y, width: Math.max(1, r.w), height: Math.max(1, r.h), zIndex: shape.z }}
      onPointerDown={(e) => onElementDown(e, shape.id)}
    >
      {shape.shape === 'box' && (
        <rect
          x={1}
          y={1}
          width={Math.max(1, r.w - 2)}
          height={Math.max(1, r.h - 2)}
          rx={6}
          strokeDasharray="7 5"
          pointerEvents="visibleStroke"
          {...stroke}
          opacity={selected ? 1 : 0.9}
        />
      )}
      {shape.shape === 'circle' && (
        <ellipse
          cx={r.w / 2}
          cy={r.h / 2}
          rx={Math.max(1, r.w / 2 - 1)}
          ry={Math.max(1, r.h / 2 - 1)}
          strokeDasharray="7 5"
          pointerEvents="visibleStroke"
          {...stroke}
          opacity={selected ? 1 : 0.9}
        />
      )}
      {shape.shape === 'arrow' && (
        <line
          x1={shape.x - r.x}
          y1={shape.y - r.y}
          x2={shape.x + shape.w - r.x}
          y2={shape.y + shape.h - r.y}
          markerEnd="url(#board-arrow)"
          strokeDasharray="7 5"
          strokeLinecap="round"
          pointerEvents="stroke"
          {...stroke}
        />
      )}
      {selected && (
        <rect
          x={0.5}
          y={0.5}
          width={Math.max(1, r.w - 1)}
          height={Math.max(1, r.h - 1)}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={1}
          strokeDasharray="3 3"
          pointerEvents="none"
        />
      )}
    </svg>
  );
}

// -- free-hand ink -----------------------------------------------------------

function drawingRect(d: BoardDrawing): Rect {
  const xs = d.points.map((p) => p.x);
  const ys = d.points.map((p) => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

function pointsToPath(points: Vec[], ox = 0, oy = 0): string {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x - ox},${p.y - oy}`).join(' ');
}

function DrawingEl({
  drawing,
  selected,
  onElementDown,
}: {
  drawing: BoardDrawing;
  selected: boolean;
  onElementDown: (e: React.PointerEvent, id: string) => void;
}) {
  const r = drawingRect(drawing);
  const pad = 6;
  return (
    <svg
      className="pointer-events-none absolute overflow-visible"
      style={{
        left: r.x - pad,
        top: r.y - pad,
        width: r.w + pad * 2,
        height: r.h + pad * 2,
        zIndex: drawing.z,
      }}
      onPointerDown={(e) => onElementDown(e, drawing.id)}
    >
      <path
        d={pointsToPath(drawing.points, r.x - pad, r.y - pad)}
        fill="none"
        stroke={SKETCH}
        strokeWidth={2.25}
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#board-sketch)"
        pointerEvents="stroke"
        opacity={selected ? 1 : 0.92}
      />
    </svg>
  );
}

// -- icon marker -------------------------------------------------------------

function IconEl({
  icon,
  selected,
  onElementDown,
  reportSize,
}: {
  icon: BoardIcon;
  selected: boolean;
  onElementDown: (e: React.PointerEvent, id: string) => void;
  reportSize: (id: string, s: Size) => void;
}) {
  const ref = useReportSize(icon.id, reportSize);
  const Glyph = MARKER_ICON[icon.name];
  return (
    <div
      ref={ref}
      className={cn(
        'absolute flex cursor-grab touch-none items-center justify-center rounded active:cursor-grabbing',
        selected && 'ring-2 ring-primary',
      )}
      style={{ left: icon.x, top: icon.y, zIndex: icon.z }}
      onPointerDown={(e) => onElementDown(e, icon.id)}
      title="Marker (your annotation)"
    >
      <Glyph style={{ width: icon.size, height: icon.size, color: SKETCH }} aria-hidden />
    </div>
  );
}

// -- text label --------------------------------------------------------------

function TextEl({
  text,
  selected,
  editing,
  onElementDown,
  onEdit,
  onEndEdit,
  update,
  reportSize,
}: {
  text: BoardText;
  selected: boolean;
  editing: boolean;
  onElementDown: (e: React.PointerEvent, id: string) => void;
  onEdit: (id: string) => void;
  onEndEdit: () => void;
  update: Update;
  reportSize: (id: string, s: Size) => void;
}) {
  const ref = useReportSize(text.id, reportSize);
  return (
    <div
      ref={ref}
      className={cn('absolute rounded', selected && 'ring-2 ring-primary')}
      style={{ left: text.x, top: text.y, zIndex: text.z }}
      onPointerDown={(e) => {
        if (!editing) onElementDown(e, text.id);
      }}
      onDoubleClick={() => onEdit(text.id)}
    >
      {editing ? (
        <textarea
          autoFocus
          value={text.text}
          onChange={(e) => update((b) => setTextValue(b, text.id, e.target.value))}
          onBlur={onEndEdit}
          onPointerDown={(e) => e.stopPropagation()}
          placeholder="Text…"
          className="resize-none rounded border border-primary/60 bg-surface-1 p-1 leading-snug text-foreground outline-none"
          style={{ fontSize: text.fontSize, minWidth: 80, minHeight: text.fontSize * 1.6 }}
          rows={1}
        />
      ) : text.text ? (
        <span
          className="block cursor-grab whitespace-pre-wrap px-1 leading-snug active:cursor-grabbing"
          style={{ fontSize: text.fontSize, color: SKETCH }}
        >
          {text.text}
        </span>
      ) : (
        <span
          className="block cursor-grab px-1 italic text-muted-foreground/60"
          style={{ fontSize: text.fontSize }}
        >
          Double-click to edit
        </span>
      )}
    </div>
  );
}

// -- directed hypothesis connectors ------------------------------------------

function pinCentre(pin: BoardPin, sizes: Record<string, Size>): Vec {
  const s = sizes[pin.id] ?? { w: PIN_WIDTH, h: 140 };
  return { x: pin.x + s.w / 2, y: pin.y + s.h / 2 };
}

function ConnectorEl({
  link,
  a,
  b,
  editing,
  selected,
  onElementDown,
  onEdit,
  onEndEdit,
  update,
}: {
  link: BoardLink;
  a: Vec;
  b: Vec;
  editing: boolean;
  selected: boolean;
  onElementDown: (e: React.PointerEvent, id: string) => void;
  onEdit: (id: string) => void;
  onEndEdit: () => void;
  update: Update;
}) {
  const pad = 10;
  const left = Math.min(a.x, b.x) - pad;
  const top = Math.min(a.y, b.y) - pad;
  const w = Math.abs(a.x - b.x) + pad * 2;
  const h = Math.abs(a.y - b.y) + pad * 2;
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const z = link.z ?? Z_DEFAULT.link;
  return (
    <>
      <svg
        className="pointer-events-none absolute overflow-visible"
        style={{ left, top, width: Math.max(1, w), height: Math.max(1, h), zIndex: z }}
        onPointerDown={(e) => onElementDown(e, link.id)}
      >
        <line
          x1={a.x - left}
          y1={a.y - top}
          x2={b.x - left}
          y2={b.y - top}
          stroke={SKETCH}
          strokeWidth={selected ? 2.5 : 1.75}
          strokeDasharray="6 5"
          strokeLinecap="round"
          markerEnd="url(#board-arrow)"
          filter="url(#board-sketch)"
          pointerEvents="stroke"
        />
      </svg>
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2"
        style={{ left: mid.x, top: mid.y, zIndex: z + 1 }}
      >
        {editing ? (
          <div className="flex items-center gap-1 rounded-md border border-border bg-surface-1 p-1 shadow-lg">
            <input
              autoFocus
              value={link.label ?? ''}
              onChange={(e) => update((b) => setLinkLabel(b, link.id, e.target.value))}
              onKeyDown={(e) => e.key === 'Enter' && onEndEdit()}
              onPointerDown={(e) => e.stopPropagation()}
              placeholder="e.g. exfiltrated to"
              className="w-32 bg-transparent px-1 text-[10px] text-foreground outline-none"
            />
            <button
              type="button"
              onClick={() => update((b) => removeLink(b, link.id))}
              className="rounded p-0.5 text-muted-foreground hover:bg-surface-3 hover:text-integrity-broken"
              title="Delete connector"
              aria-label="Delete connector"
            >
              <Trash2 className="size-3.5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={onEndEdit}
              className="rounded p-0.5 text-muted-foreground hover:bg-surface-3 hover:text-foreground"
              aria-label="Done"
            >
              <Check className="size-3.5" aria-hidden />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onEdit(link.id)}
            onPointerDown={(e) => e.stopPropagation()}
            className="whitespace-nowrap rounded-full border border-dashed px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider shadow"
            style={{ color: SKETCH, borderColor: SKETCH, background: 'hsl(var(--surface-1) / 0.95)' }}
            title="Edit this hypothesis connector"
          >
            {link.label || 'hypothesis'}
          </button>
        )}
      </div>
    </>
  );
}

// -- toolbar -----------------------------------------------------------------

function ToolButton({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-md border px-2 text-caption font-medium transition-colors',
        active
          ? 'border-primary bg-primary/15 text-primary'
          : 'border-border bg-surface-1 text-muted-foreground hover:bg-surface-3 hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-0.5 h-6 w-px shrink-0 bg-border" aria-hidden />;
}

function BoardToolbar({
  tool,
  setTool,
  update,
  selection,
  counts,
}: {
  tool: Tool;
  setTool: (t: Tool) => void;
  update: Update;
  selection: ReadonlySet<string>;
  counts: string;
}) {
  const [confirmClear, setConfirmClear] = React.useState(false);
  const selectionCount = selection.size;
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-surface-2/60 p-2">
      <ToolButton active={tool === 'select'} onClick={() => setTool('select')} title="Select / move">
        <MousePointer2 className="size-4" aria-hidden />
      </ToolButton>
      <ToolButton
        active={tool === 'connector'}
        onClick={() => setTool('connector')}
        title="Connector — click a pin, then another (directed hypothesis)"
      >
        <Link2 className="size-4" aria-hidden />
        Connector
      </ToolButton>
      <ToolButton active={tool === 'draw'} onClick={() => setTool('draw')} title="Free-draw">
        <Pencil className="size-4" aria-hidden />
      </ToolButton>
      <ToolButton active={tool === 'box'} onClick={() => setTool('box')} title="Box">
        <SquareIcon className="size-4" aria-hidden />
      </ToolButton>
      <ToolButton active={tool === 'circle'} onClick={() => setTool('circle')} title="Circle">
        <CircleIcon className="size-4" aria-hidden />
      </ToolButton>
      <ToolButton active={tool === 'arrow'} onClick={() => setTool('arrow')} title="Arrow">
        <MoveUpRight className="size-4" aria-hidden />
      </ToolButton>
      <ToolButton active={tool === 'text'} onClick={() => setTool('text')} title="Text label">
        <TypeIcon className="size-4" aria-hidden />
      </ToolButton>

      <Divider />
      {/* Icon / marker palette */}
      {BOARD_ICON_NAMES.map((name) => {
        const Glyph = MARKER_ICON[name];
        const key = `icon:${name}` as Tool;
        return (
          <ToolButton
            key={name}
            active={tool === key}
            onClick={() => setTool(key)}
            title={`Marker: ${name}`}
          >
            <Glyph className="size-4" aria-hidden />
          </ToolButton>
        );
      })}

      <Divider />
      <ToolButton onClick={() => update((b) => addGroup(b))} title="Add group zone">
        <GroupIcon className="size-4" aria-hidden />
        Group
      </ToolButton>
      <ToolButton onClick={() => update((b) => addNote(b))} title="Add sticky note">
        <StickyNote className="size-4" aria-hidden />
        Note
      </ToolButton>

      {selectionCount > 0 && (
        <>
          <Divider />
          <ToolButton onClick={() => update((b) => bringForward(b, selection))} title="Bring forward">
            <BringToFront className="size-4" aria-hidden />
          </ToolButton>
          <ToolButton onClick={() => update((b) => sendBackward(b, selection))} title="Send back">
            <SendToBack className="size-4" aria-hidden />
          </ToolButton>
          <ToolButton
            onClick={() => update((b) => removeElements(b, selection))}
            title="Delete selection"
          >
            <Trash2 className="size-4" aria-hidden />
            {selectionCount}
          </ToolButton>
        </>
      )}

      <span className="ml-auto text-caption tabular-nums text-muted-foreground">{counts}</span>
      {confirmClear ? (
        <span className="flex items-center gap-2">
          <span className="text-caption text-muted-foreground">Clear board?</span>
          <ToolButton
            onClick={() => {
              update(() => clearBoard());
              setConfirmClear(false);
            }}
            title="Confirm clear"
          >
            Confirm
          </ToolButton>
          <ToolButton onClick={() => setConfirmClear(false)} title="Cancel">
            Cancel
          </ToolButton>
        </span>
      ) : (
        <ToolButton onClick={() => setConfirmClear(true)} title="Clear the whole board">
          <Trash2 className="size-4" aria-hidden />
          Clear
        </ToolButton>
      )}
    </div>
  );
}

// -- canvas ------------------------------------------------------------------

export function BoardCanvas() {
  const { board, update } = useBoard();
  const [tool, setTool] = React.useState<Tool>('select');
  const [selection, setSelection] = React.useState<ReadonlySet<string>>(new Set());
  const [sizes, setSizes] = React.useState<Record<string, Size>>({});
  const [connectFrom, setConnectFrom] = React.useState<string | null>(null);
  const [editingLink, setEditingLink] = React.useState<string | null>(null);
  const [editingText, setEditingText] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [marquee, setMarquee] = React.useState<Rect | null>(null);

  const innerRef = React.useRef<HTMLDivElement>(null);
  const dragRef = React.useRef<{ ids: ReadonlySet<string>; lastX: number; lastY: number } | null>(
    null,
  );
  const marqueeRef = React.useRef<{ x0: number; y0: number; x1: number; y1: number; add: boolean } | null>(
    null,
  );
  const draftRef = React.useRef<Draft | null>(null);

  // Live mirrors for the window/keyboard handlers, so they can read current state without
  // re-subscribing on every board or selection change.
  const boardRef = React.useRef(board);
  boardRef.current = board;
  const selectionRef = React.useRef(selection);
  selectionRef.current = selection;

  const reportSize = React.useCallback((id: string, size: Size) => {
    setSizes((prev) => {
      const cur = prev[id];
      if (cur && cur.w === size.w && cur.h === size.h) return prev;
      return { ...prev, [id]: size };
    });
  }, []);

  const toCanvas = React.useCallback((clientX: number, clientY: number): Vec => {
    const rect = innerRef.current?.getBoundingClientRect();
    return { x: clientX - (rect?.left ?? 0), y: clientY - (rect?.top ?? 0) };
  }, []);

  // Bounding box for any element id — from measured size (HTML) or geometry (SVG). Used for the
  // selection outline, resize handle, and marquee hit-testing.
  const bboxOf = React.useCallback(
    (id: string): Rect | null => {
      const pin = board.pins.find((p) => p.id === id);
      if (pin) return { x: pin.x, y: pin.y, w: PIN_WIDTH, h: sizes[id]?.h ?? 150 };
      const note = board.notes.find((n) => n.id === id);
      if (note) return { x: note.x, y: note.y, w: NOTE_WIDTH, h: sizes[id]?.h ?? 120 };
      const group = board.groups.find((g) => g.id === id);
      if (group) return { x: group.x, y: group.y, w: group.w, h: group.h };
      const shape = board.shapes.find((s) => s.id === id);
      if (shape) return shapeRect(shape);
      const draw = board.drawings.find((d) => d.id === id);
      if (draw) return drawingRect(draw);
      const icon = board.icons.find((i) => i.id === id);
      if (icon) return { x: icon.x, y: icon.y, w: icon.size, h: icon.size };
      const text = board.texts.find((t) => t.id === id);
      if (text)
        return { x: text.x, y: text.y, w: sizes[id]?.w ?? 80, h: sizes[id]?.h ?? text.fontSize * 1.5 };
      const link = board.links.find((l) => l.id === id);
      if (link) {
        const from = board.pins.find((p) => p.id === link.from);
        const to = board.pins.find((p) => p.id === link.to);
        if (!from || !to) return null;
        const a = pinCentre(from, sizes);
        const b = pinCentre(to, sizes);
        return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) };
      }
      return null;
    },
    [board, sizes],
  );
  const bboxRef = React.useRef(bboxOf);
  bboxRef.current = bboxOf;

  // Element selection + group drag (select mode). Connector mode routes clicks to endpoint picking.
  const onElementDown = React.useCallback(
    (e: React.PointerEvent, id: string) => {
      if (tool === 'connector' || e.button !== 0) return;
      e.stopPropagation();
      let ids: ReadonlySet<string>;
      if (e.shiftKey) {
        const n = new Set(selection);
        if (n.has(id)) n.delete(id);
        else n.add(id);
        ids = n;
      } else if (selection.has(id)) {
        ids = selection;
      } else {
        ids = new Set([id]);
      }
      setSelection(ids);
      dragRef.current = { ids, lastX: e.clientX, lastY: e.clientY };
    },
    [tool, selection],
  );

  const pickConnector = React.useCallback(
    (id: string) => {
      if (connectFrom === null) {
        setConnectFrom(id);
      } else if (connectFrom !== id) {
        update((b) => addLink(b, connectFrom, id));
        setConnectFrom(null);
      }
    },
    [connectFrom, update],
  );

  // Window-level move/up so a drag or marquee keeps tracking outside the origin element.
  React.useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (d) {
        const dx = e.clientX - d.lastX;
        const dy = e.clientY - d.lastY;
        if (dx !== 0 || dy !== 0) {
          d.lastX = e.clientX;
          d.lastY = e.clientY;
          update((b) => moveElementsBy(b, d.ids, dx, dy));
        }
        return;
      }
      const m = marqueeRef.current;
      if (m) {
        const p = toCanvas(e.clientX, e.clientY);
        m.x1 = p.x;
        m.y1 = p.y;
        setMarquee({
          x: Math.min(m.x0, p.x),
          y: Math.min(m.y0, p.y),
          w: Math.abs(p.x - m.x0),
          h: Math.abs(p.y - m.y0),
        });
      }
    };
    const onUp = () => {
      if (dragRef.current) {
        dragRef.current = null;
        return;
      }
      const m = marqueeRef.current;
      if (m) {
        const rect: Rect = {
          x: Math.min(m.x0, m.x1),
          y: Math.min(m.y0, m.y1),
          w: Math.abs(m.x1 - m.x0),
          h: Math.abs(m.y1 - m.y0),
        };
        marqueeRef.current = null;
        setMarquee(null);
        if (rect.w > 3 || rect.h > 3) {
          const b = boardRef.current;
          const hit = new Set<string>(m.add ? selectionRef.current : []);
          const ids = [
            ...b.pins,
            ...b.notes,
            ...b.groups,
            ...b.shapes,
            ...b.drawings,
            ...b.icons,
            ...b.texts,
          ].map((el) => el.id);
          for (const id of ids) {
            const bb = bboxRef.current(id);
            if (bb && intersects(bb, rect)) hit.add(id);
          }
          setSelection(hit);
        }
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [update, toCanvas]);

  // Keyboard: Esc resets the tool + clears transient state; Delete removes the selection.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName ?? '').toUpperCase();
      const typing = tag === 'INPUT' || tag === 'TEXTAREA';
      if (e.key === 'Escape') {
        setTool('select');
        setConnectFrom(null);
        setDraft(null);
        draftRef.current = null;
        setSelection(new Set());
        setEditingLink(null);
        setEditingText(null);
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && !typing && selectionRef.current.size > 0) {
        e.preventDefault();
        update((b) => removeElements(b, selectionRef.current));
        setSelection(new Set());
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [update]);

  // Background pointer-down (empty canvas) in select mode → marquee; in connector mode → cancel.
  const onBackgroundDown = (e: React.PointerEvent) => {
    if (e.target !== innerRef.current) return;
    if (tool === 'connector') {
      setConnectFrom(null);
      return;
    }
    if (tool !== 'select' || e.button !== 0) return;
    const p = toCanvas(e.clientX, e.clientY);
    if (!e.shiftKey) setSelection(new Set());
    marqueeRef.current = { x0: p.x, y0: p.y, x1: p.x, y1: p.y, add: e.shiftKey };
    setMarquee({ x: p.x, y: p.y, w: 0, h: 0 });
  };

  // Gesture-tool overlay (draw / box / circle / arrow / text / icon) — captures the whole surface so
  // a stroke can start over a pin without dragging it.
  const overlayActive = tool !== 'select' && tool !== 'connector';
  const overlayDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    const p = toCanvas(e.clientX, e.clientY);
    if (tool === 'text') {
      update((b) => addText(b, p.x, p.y));
      setTool('select');
      return;
    }
    if (tool.startsWith('icon:')) {
      const name = tool.slice('icon:'.length) as IconName;
      update((b) => addIcon(b, name, p.x - 14, p.y - 14));
      setTool('select');
      return;
    }
    if (tool === 'draw') {
      draftRef.current = { kind: 'draw', points: [p] };
      setDraft({ kind: 'draw', points: [p] });
      return;
    }
    draftRef.current = { kind: tool, x0: p.x, y0: p.y, x1: p.x, y1: p.y };
    setDraft({ kind: tool, x0: p.x, y0: p.y, x1: p.x, y1: p.y });
  };
  const overlayMove = (e: React.PointerEvent) => {
    const d = draftRef.current;
    if (!d) return;
    const p = toCanvas(e.clientX, e.clientY);
    if (d.kind === 'draw') {
      d.points.push(p);
      setDraft({ kind: 'draw', points: [...d.points] });
    } else {
      d.x1 = p.x;
      d.y1 = p.y;
      setDraft({ ...d });
    }
  };
  const overlayUp = () => {
    const d = draftRef.current;
    draftRef.current = null;
    setDraft(null);
    if (!d) return;
    if (d.kind === 'draw') {
      if (d.points.length > 1) update((b) => addDrawing(b, d.points));
      return;
    }
    if (d.kind === 'arrow') {
      const w = d.x1 - d.x0;
      const h = d.y1 - d.y0;
      if (Math.abs(w) > 5 || Math.abs(h) > 5) update((b) => addShape(b, 'arrow', d.x0, d.y0, w, h));
      return;
    }
    const x = Math.min(d.x0, d.x1);
    const y = Math.min(d.y0, d.y1);
    const w = Math.abs(d.x1 - d.x0);
    const h = Math.abs(d.y1 - d.y0);
    if (w > 5 && h > 5) update((b) => addShape(b, d.kind, x, y, w, h));
  };

  // Canvas extent — grow to fit the furthest element so nothing is stranded off-scroll.
  const { width, height } = React.useMemo(() => {
    let maxX = 1200;
    let maxY = 720;
    const consider = (x: number, y: number) => {
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    };
    for (const p of board.pins) consider(p.x + PIN_WIDTH, p.y + (sizes[p.id]?.h ?? 180));
    for (const g of board.groups) consider(g.x + g.w, g.y + g.h);
    for (const n of board.notes) consider(n.x + NOTE_WIDTH, n.y + 160);
    for (const s of board.shapes) {
      const r = shapeRect(s);
      consider(r.x + r.w, r.y + r.h);
    }
    for (const d of board.drawings) {
      const r = drawingRect(d);
      consider(r.x + r.w, r.y + r.h);
    }
    for (const i of board.icons) consider(i.x + i.size, i.y + i.size);
    for (const t of board.texts) consider(t.x + 200, t.y + 60);
    return { width: maxX + 260, height: maxY + 220 };
  }, [board, sizes]);

  const connectorSegments = board.links
    .map((link) => {
      const from = board.pins.find((p) => p.id === link.from);
      const to = board.pins.find((p) => p.id === link.to);
      if (!from || !to) return null;
      return { link, a: pinCentre(from, sizes), b: pinCentre(to, sizes) };
    })
    .filter((s): s is { link: BoardLink; a: Vec; b: Vec } => s !== null);

  const totalElements =
    board.pins.length +
    board.groups.length +
    board.notes.length +
    board.links.length +
    board.shapes.length +
    board.drawings.length +
    board.icons.length +
    board.texts.length;

  const counts = `${board.pins.length} pins · ${totalElements} items`;

  // The single selected, resizable element (shape / icon / text) gets a resize handle.
  const singleResizable = React.useMemo(() => {
    if (selection.size !== 1) return null;
    const [id] = [...selection];
    const shape = board.shapes.find((s) => s.id === id);
    if (shape) return { id, kind: 'shape' as const };
    const icon = board.icons.find((i) => i.id === id);
    if (icon) return { id, kind: 'icon' as const };
    const text = board.texts.find((t) => t.id === id);
    if (text) return { id, kind: 'text' as const };
    return null;
  }, [selection, board.shapes, board.icons, board.texts]);

  return (
    <div className="flex flex-col gap-2">
      <BoardToolbar
        tool={tool}
        setTool={setTool}
        update={update}
        selection={selection}
        counts={counts}
      />

      <div className="relative h-[calc(100vh-19rem)] min-h-[480px] w-full overflow-auto rounded-lg border border-border bg-surface-0">
        <SketchDefs />
        <div
          ref={innerRef}
          className={cn('relative', overlayActive ? 'cursor-crosshair' : 'cursor-default')}
          style={{
            width,
            height,
            backgroundImage: 'radial-gradient(hsl(var(--border)) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
          onPointerDown={onBackgroundDown}
        >
          {board.groups.map((g) => (
            <GroupZone
              key={g.id}
              group={g}
              selected={selection.has(g.id)}
              onElementDown={onElementDown}
              update={update}
            />
          ))}

          {board.drawings.map((d) => (
            <DrawingEl
              key={d.id}
              drawing={d}
              selected={selection.has(d.id)}
              onElementDown={onElementDown}
            />
          ))}

          {board.shapes.map((s) => (
            <ShapeEl key={s.id} shape={s} selected={selection.has(s.id)} onElementDown={onElementDown} />
          ))}

          {connectorSegments.map(({ link, a, b }) => (
            <ConnectorEl
              key={link.id}
              link={link}
              a={a}
              b={b}
              editing={editingLink === link.id}
              selected={selection.has(link.id)}
              onElementDown={onElementDown}
              onEdit={setEditingLink}
              onEndEdit={() => setEditingLink(null)}
              update={update}
            />
          ))}

          {board.pins.map((p) => (
            <PinCard
              key={p.id}
              pin={p}
              selected={selection.has(p.id)}
              connectorMode={tool === 'connector'}
              isConnectSource={connectFrom === p.id}
              onElementDown={onElementDown}
              onPick={pickConnector}
              onStartConnect={(id) => {
                setTool('connector');
                setConnectFrom(id);
              }}
              update={update}
              reportSize={reportSize}
            />
          ))}

          {board.notes.map((n) => (
            <StickyCard
              key={n.id}
              note={n}
              selected={selection.has(n.id)}
              onElementDown={onElementDown}
              update={update}
              reportSize={reportSize}
            />
          ))}

          {board.icons.map((i) => (
            <IconEl
              key={i.id}
              icon={i}
              selected={selection.has(i.id)}
              onElementDown={onElementDown}
              reportSize={reportSize}
            />
          ))}

          {board.texts.map((t) => (
            <TextEl
              key={t.id}
              text={t}
              selected={selection.has(t.id)}
              editing={editingText === t.id}
              onElementDown={onElementDown}
              onEdit={setEditingText}
              onEndEdit={() => setEditingText(null)}
              update={update}
              reportSize={reportSize}
            />
          ))}

          {/* Live preview of the in-progress draw / shape. */}
          {draft && <DraftPreview draft={draft} />}

          {/* Resize handle for a single selected shape / icon / text. */}
          {singleResizable && (
            <ResizeHandle id={singleResizable.id} kind={singleResizable.kind} board={board} update={update} bboxOf={bboxOf} />
          )}

          {/* Marquee rectangle (multi-select). */}
          {marquee && (
            <div
              className="pointer-events-none absolute border border-primary/70 bg-primary/10"
              style={{ left: marquee.x, top: marquee.y, width: marquee.w, height: marquee.h, zIndex: 8000 }}
            />
          )}

          {/* Gesture capture overlay (only for drawing/placing tools). */}
          {overlayActive && (
            <div
              className="absolute inset-0"
              style={{ zIndex: 9000, touchAction: 'none' }}
              onPointerDown={overlayDown}
              onPointerMove={overlayMove}
              onPointerUp={overlayUp}
            />
          )}

          {totalElements === 0 && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
              <Pin className="size-6 text-muted-foreground/50" aria-hidden />
              <p className="text-caption text-muted-foreground">
                Your board is empty. Use{' '}
                <span className="font-medium text-foreground">Send to board</span> on evidence,
                findings, or entities to pin references — then draw connectors, shapes, notes, and
                markers to reason about the case.
              </p>
            </div>
          )}
        </div>

        {(connectFrom !== null || overlayActive) && (
          <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
            <span className="rounded-full border border-primary/50 bg-primary/15 px-3 py-1 text-caption font-medium text-primary shadow">
              {tool === 'connector'
                ? 'Connector — click a pin, then another. Esc to cancel.'
                : tool === 'draw'
                  ? 'Free-draw — drag to sketch. Esc for select.'
                  : tool === 'text'
                    ? 'Click to place a text label. Esc for select.'
                    : tool.startsWith('icon:')
                      ? 'Click to drop a marker. Esc for select.'
                      : 'Drag to draw a shape. Esc for select.'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// -- draft preview + resize handle (kept small, canvas-local) -------------------------------------

function DraftPreview({ draft }: { draft: Draft }) {
  const common = {
    stroke: SKETCH,
    strokeWidth: 2,
    fill: 'none',
    strokeDasharray: '7 5',
    opacity: 0.8,
  } as const;
  if (draft.kind === 'draw') {
    const r = { x: 0, y: 0 };
    return (
      <svg className="pointer-events-none absolute inset-0" style={{ zIndex: 8500, overflow: 'visible' }}>
        <path d={pointsToPath(draft.points, r.x, r.y)} strokeLinecap="round" strokeLinejoin="round" {...common} />
      </svg>
    );
  }
  const x = Math.min(draft.x0, draft.x1);
  const y = Math.min(draft.y0, draft.y1);
  const w = Math.abs(draft.x1 - draft.x0);
  const h = Math.abs(draft.y1 - draft.y0);
  return (
    <svg className="pointer-events-none absolute inset-0" style={{ zIndex: 8500, overflow: 'visible' }}>
      {draft.kind === 'box' && <rect x={x} y={y} width={w} height={h} rx={6} {...common} />}
      {draft.kind === 'circle' && (
        <ellipse cx={x + w / 2} cy={y + h / 2} rx={w / 2} ry={h / 2} {...common} />
      )}
      {draft.kind === 'arrow' && (
        <line
          x1={draft.x0}
          y1={draft.y0}
          x2={draft.x1}
          y2={draft.y1}
          markerEnd="url(#board-arrow)"
          strokeLinecap="round"
          {...common}
        />
      )}
    </svg>
  );
}

function ResizeHandle({
  id,
  kind,
  board,
  update,
  bboxOf,
}: {
  id: string;
  kind: 'shape' | 'icon' | 'text';
  board: BoardState;
  update: Update;
  bboxOf: (id: string) => Rect | null;
}) {
  const bb = bboxOf(id);
  const drag = useDrag(bb ? bb.x + bb.w : 0, bb ? bb.y + bb.h : 0, (nx, ny) => {
    if (kind === 'shape') {
      const s = board.shapes.find((el) => el.id === id);
      if (s) update((b) => resizeShape(b, id, nx - s.x, ny - s.y));
    } else if (kind === 'icon') {
      const ic = board.icons.find((el) => el.id === id);
      if (ic) update((b) => resizeIcon(b, id, Math.max(nx - ic.x, ny - ic.y)));
    } else {
      const t = board.texts.find((el) => el.id === id);
      if (t) update((b) => resizeText(b, id, (ny - t.y) / 1.3));
    }
  });
  if (!bb) return null;
  return (
    <div
      className="absolute z-[8600] size-3 cursor-nwse-resize rounded-sm border border-primary bg-surface-1"
      style={{ left: bb.x + bb.w - 6, top: bb.y + bb.h - 6, touchAction: 'none' }}
      title="Resize"
      {...drag}
    />
  );
}

// -- geometry ----------------------------------------------------------------

function intersects(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
