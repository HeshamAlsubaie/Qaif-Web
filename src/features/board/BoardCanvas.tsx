/**
 * The investigation-board canvas — a free-position thinking surface. It renders the CURRENT case's
 * pins (references to real evidence/findings/entities), the investigator's named group zones, sticky
 * notes, and hand-drawn hypothesis links, all draggable. It is READ-ONLY over evidence: it never
 * calls an API, never seals evidence or custody. Every edit here is client analysis state (persisted
 * to localStorage by BoardContext), and the links/notes are the analyst's reasoning — styled to look
 * deliberately UNLIKE the confirmed case graph (dashed, "hypothesis"-tagged), so they can never be
 * mistaken for a correlated case relationship.
 */
import {
  Check,
  GripVertical,
  HardDrive,
  Link2,
  MessageSquarePlus,
  Pin,
  ShieldAlert,
  Trash2,
  Waypoints,
  X,
  type LucideIcon,
} from 'lucide-react';
import * as React from 'react';

import { IntegrityBadge } from '@/components/forensic/IntegrityBadge';
import { TierBadge } from '@/components/forensic/TierBadge';
import { cn } from '@/lib/utils';

import { useBoard } from './BoardContext';
import type { BoardPin, BoardState, PinKind } from './boardModel';
import {
  addLink,
  annotatePin,
  moveGroup,
  moveNote,
  movePin,
  removeGroup,
  removeLink,
  removeNote,
  removePin,
  renameGroup,
  resizeGroup,
  setLinkLabel,
  setNoteText,
} from './boardOps';
import { useDrag } from './useDrag';

const PIN_WIDTH = 224;

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

type Size = { w: number; h: number };

// -- pin card ----------------------------------------------------------------

interface PinCardProps {
  pin: BoardPin;
  update: (fn: (b: BoardState) => BoardState) => void;
  linking: boolean;
  isLinkSource: boolean;
  onStartLink: () => void;
  onConnect: () => void;
  reportSize: (id: string, size: Size) => void;
}

function PinCard({
  pin,
  update,
  linking,
  isLinkSource,
  onStartLink,
  onConnect,
  reportSize,
}: PinCardProps) {
  const [editingNote, setEditingNote] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const drag = useDrag(pin.x, pin.y, (x, y) => update((b) => movePin(b, pin.id, x, y)));
  const Icon = KIND_ICON[pin.kind];

  // Report size up so the link layer can anchor lines at the card's true centre (notes grow it).
  React.useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const report = () => reportSize(pin.id, { w: el.offsetWidth, h: el.offsetHeight });
    report();
    const ro = new ResizeObserver(report);
    ro.observe(el);
    return () => ro.disconnect();
  }, [pin.id, reportSize]);

  const targetable = linking && !isLinkSource;

  return (
    <div
      ref={rootRef}
      className={cn(
        'absolute z-10 flex flex-col rounded-lg border bg-surface-1 shadow-lg',
        isLinkSource ? 'border-primary ring-2 ring-primary/40' : 'border-border',
        targetable && 'cursor-copy ring-2 ring-primary/60 hover:ring-primary',
      )}
      style={{ left: pin.x, top: pin.y, width: PIN_WIDTH }}
      onClick={targetable ? onConnect : undefined}
    >
      {/* Header = the drag handle. */}
      <div
        className="flex cursor-grab touch-none items-center gap-1.5 rounded-t-lg border-b border-border/60 bg-surface-2 px-2 py-1.5 active:cursor-grabbing"
        {...drag}
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

        {/* Investigator annotation — a working note on this reference, not case data. */}
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
            onClick={onStartLink}
            onPointerDown={(e) => e.stopPropagation()}
            className={cn(
              'inline-flex items-center gap-1 rounded px-1.5 py-1 text-[10px] font-medium text-muted-foreground hover:bg-surface-3 hover:text-foreground',
              isLinkSource && 'bg-primary/15 text-primary',
            )}
            title={isLinkSource ? 'Cancel link' : 'Draw a hypothesis link from this card'}
          >
            <Link2 className="size-3.5" aria-hidden />
            {isLinkSource ? 'Cancel' : 'Link'}
          </button>
          {targetable && (
            <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-semibold text-primary">
              <Check className="size-3.5" aria-hidden />
              Connect here
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// -- group zone --------------------------------------------------------------

function GroupZone({
  group,
  update,
}: {
  group: BoardState['groups'][number];
  update: (fn: (b: BoardState) => BoardState) => void;
}) {
  const drag = useDrag(group.x, group.y, (x, y) => update((b) => moveGroup(b, group.id, x, y)));
  const resize = useDrag(group.w, group.h, (w, h) => update((b) => resizeGroup(b, group.id, w, h)));
  return (
    <div
      className="absolute z-0 rounded-lg border border-dashed border-border bg-surface-2/25"
      style={{ left: group.x, top: group.y, width: group.w, height: group.h }}
    >
      <div
        className="flex cursor-grab touch-none items-center gap-1.5 rounded-t-lg bg-surface-2/70 px-2 py-1 active:cursor-grabbing"
        {...drag}
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
      {/* Resize handle. */}
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
  update,
}: {
  note: BoardState['notes'][number];
  update: (fn: (b: BoardState) => BoardState) => void;
}) {
  const drag = useDrag(note.x, note.y, (x, y) => update((b) => moveNote(b, note.id, x, y)));
  return (
    <div
      className="absolute z-10 flex w-48 flex-col rounded-md border border-amber-500/40 bg-amber-400/10 shadow-lg"
      style={{ left: note.x, top: note.y }}
    >
      <div
        className="flex cursor-grab touch-none items-center gap-1 rounded-t-md border-b border-amber-500/30 bg-amber-400/15 px-1.5 py-1 active:cursor-grabbing"
        {...drag}
      >
        <GripVertical className="size-3.5 shrink-0 text-amber-500/70" aria-hidden />
        <span className="text-[9px] font-semibold uppercase tracking-wider text-amber-500/90">
          Note
        </span>
        <button
          type="button"
          onClick={() => update((b) => removeNote(b, note.id))}
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

// -- hypothesis-link layer ---------------------------------------------------

function centreOf(pin: BoardPin, sizes: Record<string, Size>): { x: number; y: number } {
  const s = sizes[pin.id] ?? { w: PIN_WIDTH, h: 140 };
  return { x: pin.x + s.w / 2, y: pin.y + s.h / 2 };
}

function LinkLayer({
  board,
  sizes,
  width,
  height,
  update,
}: {
  board: BoardState;
  sizes: Record<string, Size>;
  width: number;
  height: number;
  update: (fn: (b: BoardState) => BoardState) => void;
}) {
  const byId = React.useMemo(() => new Map(board.pins.map((p) => [p.id, p])), [board.pins]);
  const [editing, setEditing] = React.useState<string | null>(null);

  const segments = board.links
    .map((link) => {
      const from = byId.get(link.from);
      const to = byId.get(link.to);
      if (!from || !to) return null;
      const a = centreOf(from, sizes);
      const b = centreOf(to, sizes);
      return { link, a, b, mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);

  return (
    <>
      {/* Dashed, muted lines — deliberately UNLIKE the solid case graph, so a hand-drawn hypothesis
          never reads as a confirmed relationship. pointer-events off; the chips below take clicks. */}
      <svg
        className="pointer-events-none absolute inset-0 z-[5]"
        width={width}
        height={height}
        aria-hidden
      >
        {segments.map(({ link, a, b }) => (
          <line
            key={link.id}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke="hsl(var(--muted-foreground))"
            strokeWidth={1.5}
            strokeDasharray="5 4"
            opacity={0.7}
          />
        ))}
      </svg>

      {/* Midpoint chips — the label + editor + delete for each hypothesis link. */}
      {segments.map(({ link, mid }) => (
        <div
          key={link.id}
          className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
          style={{ left: mid.x, top: mid.y }}
        >
          {editing === link.id ? (
            <div className="flex items-center gap-1 rounded-md border border-border bg-surface-1 p-1 shadow-lg">
              <input
                autoFocus
                value={link.label ?? ''}
                onChange={(e) => update((b) => setLinkLabel(b, link.id, e.target.value))}
                onKeyDown={(e) => e.key === 'Enter' && setEditing(null)}
                placeholder="hypothesis…"
                className="w-28 bg-transparent px-1 text-[10px] text-foreground outline-none"
              />
              <button
                type="button"
                onClick={() => update((b) => removeLink(b, link.id))}
                className="rounded p-0.5 text-muted-foreground hover:bg-surface-3 hover:text-integrity-broken"
                title="Delete link"
                aria-label="Delete link"
              >
                <Trash2 className="size-3.5" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded p-0.5 text-muted-foreground hover:bg-surface-3 hover:text-foreground"
                aria-label="Done"
              >
                <Check className="size-3.5" aria-hidden />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(link.id)}
              className="whitespace-nowrap rounded-full border border-dashed border-muted-foreground/50 bg-surface-1/95 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground shadow hover:border-foreground/60 hover:text-foreground"
              title="Edit this hypothesis link"
            >
              {link.label || 'hypothesis'}
            </button>
          )}
        </div>
      ))}
    </>
  );
}

// -- canvas ------------------------------------------------------------------

/**
 * The board canvas for the current case. Holds only transient interaction state (which pin a link is
 * being drawn from, measured pin sizes); the durable board lives in BoardContext / localStorage.
 */
export function BoardCanvas() {
  const { board, update } = useBoard();
  const [linkingFrom, setLinkingFrom] = React.useState<string | null>(null);
  const [sizes, setSizes] = React.useState<Record<string, Size>>({});

  const reportSize = React.useCallback((id: string, size: Size) => {
    setSizes((prev) => {
      const cur = prev[id];
      if (cur && cur.w === size.w && cur.h === size.h) return prev;
      return { ...prev, [id]: size };
    });
  }, []);

  // Esc cancels an in-progress link.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLinkingFrom(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Canvas extent — grow to fit the furthest item so everything stays reachable by scrolling.
  const { width, height } = React.useMemo(() => {
    let maxX = 1200;
    let maxY = 720;
    for (const p of board.pins) {
      maxX = Math.max(maxX, p.x + PIN_WIDTH);
      maxY = Math.max(maxY, p.y + (sizes[p.id]?.h ?? 180));
    }
    for (const g of board.groups) {
      maxX = Math.max(maxX, g.x + g.w);
      maxY = Math.max(maxY, g.y + g.h);
    }
    for (const n of board.notes) {
      maxX = Math.max(maxX, n.x + 192);
      maxY = Math.max(maxY, n.y + 140);
    }
    return { width: maxX + 240, height: maxY + 200 };
  }, [board, sizes]);

  const isEmpty = board.pins.length === 0 && board.groups.length === 0 && board.notes.length === 0;

  return (
    <div className="relative h-[calc(100vh-16rem)] min-h-[520px] w-full overflow-auto rounded-lg border border-border bg-surface-0">
      {/* subtle dot grid, so the free-position surface reads as a canvas */}
      <div
        className="relative"
        style={{
          width,
          height,
          backgroundImage: 'radial-gradient(hsl(var(--border)) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      >
        {board.groups.map((g) => (
          <GroupZone key={g.id} group={g} update={update} />
        ))}

        <LinkLayer board={board} sizes={sizes} width={width} height={height} update={update} />

        {board.pins.map((p) => (
          <PinCard
            key={p.id}
            pin={p}
            update={update}
            linking={linkingFrom !== null}
            isLinkSource={linkingFrom === p.id}
            onStartLink={() => setLinkingFrom((cur) => (cur === p.id ? null : p.id))}
            onConnect={() => {
              if (linkingFrom && linkingFrom !== p.id) {
                update((b) => addLink(b, linkingFrom, p.id));
                setLinkingFrom(null);
              }
            }}
            reportSize={reportSize}
          />
        ))}

        {board.notes.map((n) => (
          <StickyCard key={n.id} note={n} update={update} />
        ))}

        {isEmpty && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
            <Pin className="size-6 text-muted-foreground/50" aria-hidden />
            <p className="text-caption text-muted-foreground">
              Your board is empty. Use{' '}
              <span className="font-medium text-foreground">Send to board</span> on evidence,
              findings, or entities to pin references here.
            </p>
            <p className="text-micro text-muted-foreground/70">
              Then arrange, group, annotate, and link them to reason about the case.
            </p>
          </div>
        )}
      </div>

      {linkingFrom !== null && (
        <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
          <span className="rounded-full border border-primary/50 bg-primary/15 px-3 py-1 text-caption font-medium text-primary shadow">
            Linking — click another card to connect, or press Esc to cancel
          </span>
        </div>
      )}
    </div>
  );
}
