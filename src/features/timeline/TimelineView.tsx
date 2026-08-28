/**
 * The timeline itself: a vertical UTC axis (earliest at top), one marker per slot, connected by a
 * continuous rail. The whole point is to NOT lie about time —
 *   - the left gutter labels every slot in UTC (the reconciliation basis, R8);
 *   - real elapsed time shows as a labelled gap between slots, so a 2-hour silence looks like one;
 *   - events the backend won't order are drawn as an unordered BAND (a bracket + "order not
 *     established"), never as two confidently-sequenced dots;
 *   - an event whose time is provisional (assumed tz / clock skew) gets a hollow dashed marker and
 *     an italic, flagged time — it is placed, but never shown as a certain instant.
 * Chrome stays calm navy/blue; the only forensic colour here rides on tier and ambiguity markers.
 */
import * as React from 'react';

import { AmbiguityBadge } from '@/components/forensic/AmbiguityBadge';
import { TierBadge } from '@/components/forensic/TierBadge';
import { cn } from '@/lib/utils';
import type { AmbiguityKind } from '@/types/api';

import { entityVisual } from '@/features/graph/graphModel';
import {
  clusterReasonCopy,
  eventKindLabel,
  eventTier,
  type EntityResolver,
  type TimelineEventNode,
  type TimelineGap,
  type TimelineLayout,
  type TimelineSlot,
} from './timelineModel';

// -- small UTC formatters (timeline labels are explicitly UTC; local zone would contradict R8) ----

function utcParts(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: iso, time: '' };
  const date = d.toLocaleDateString('en-CA', { timeZone: 'UTC' }); // YYYY-MM-DD, stable & monospace-friendly
  const time = d.toLocaleTimeString('en-GB', { timeZone: 'UTC', hour12: false });
  return { date, time };
}

/** True when an event's placement rests on an assumption we must flag (not a confirmed instant). */
function isProvisional(node: TimelineEventNode): boolean {
  return node.kinds.includes('assumed_tz') || node.kinds.includes('clock_skew');
}

const PROVISIONAL_KIND_COLOR: Record<string, string> = {
  assumed_tz: 'border-ambiguity-assumed-tz text-ambiguity-assumed-tz',
  clock_skew: 'border-ambiguity-skew text-ambiguity-skew',
};

// -- rail primitives -----------------------------------------------------------------------------

/** The continuous vertical line + a marker dot, centred in a fixed-width rail column. */
function RailMarker({ node }: { node: TimelineEventNode }) {
  const provisional = isProvisional(node);
  const provKind = node.kinds.find((k) => k === 'assumed_tz' || k === 'clock_skew');
  return (
    <div className="relative flex w-8 shrink-0 justify-center">
      <span className="absolute inset-y-0 w-px bg-border" aria-hidden />
      <span
        className={cn(
          'relative z-10 mt-1.5 size-3 rounded-full',
          provisional
            ? cn('border-2 border-dashed bg-surface-0', provKind && PROVISIONAL_KIND_COLOR[provKind])
            : 'border-2 border-primary bg-primary',
        )}
        aria-hidden
      />
    </div>
  );
}

/** The rail segment between two slots, carrying a dashed line and the exact elapsed-time label. */
function GapSegment({ gap }: { gap: TimelineGap }) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-[8.5rem] shrink-0" aria-hidden />
      <div className="relative flex w-8 shrink-0 justify-center">
        <span className="absolute inset-y-0 w-px border-l border-dashed border-border" aria-hidden />
      </div>
      <div className="py-1.5">
        <span className="text-micro uppercase tracking-wide text-muted-foreground/80">
          {gap.ms <= 0 ? 'same instant' : `${gap.label} later`}
        </span>
      </div>
    </div>
  );
}

// -- entity chips --------------------------------------------------------------------------------

function EntityChip({ id, resolver }: { id: number; resolver: EntityResolver }) {
  const ent = resolver(id);
  if (!ent) {
    // Graph not loaded / entity not in projection — show the raw id honestly, don't invent a value.
    return (
      <span className="inline-flex items-center gap-1 rounded border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-micro text-muted-foreground">
        entity #{id}
      </span>
    );
  }
  const Icon = entityVisual(ent.entity_type).icon;
  const tierDot = ent.tier === 'confirmed' ? 'bg-confirmed' : 'bg-probabilistic';
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded border border-border bg-surface-2 px-1.5 py-0.5 text-micro text-foreground"
      title={`${ent.entity_type} · ${ent.tier}`}
    >
      <Icon className="size-3 shrink-0 text-muted-foreground" aria-hidden />
      <span className="max-w-[16ch] truncate font-mono">{ent.value}</span>
      <span className={cn('size-1.5 shrink-0 rounded-full', tierDot)} aria-hidden />
    </span>
  );
}

// -- event card (used for single slots and as a band member) -------------------------------------

interface EventCardProps {
  node: TimelineEventNode;
  resolver: EntityResolver;
  onSelect: (node: TimelineEventNode) => void;
  selected: boolean;
  /** In a band the shared instant is on the band header, so members hide their own gutter time. */
  inBand?: boolean;
}

function EventCard({ node, resolver, onSelect, selected, inBand = false }: EventCardProps) {
  const { event } = node;
  const provisional = isProvisional(node);
  const tier = eventTier(event.event_kind);
  const { time } = utcParts(event.utc);

  return (
    <button
      type="button"
      onClick={() => onSelect(node)}
      aria-pressed={selected}
      className={cn(
        'group w-full rounded-lg border bg-surface-1 p-3 text-left transition-colors hover:bg-surface-2',
        selected ? 'border-primary ring-1 ring-primary/60' : 'border-border/70',
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-body font-medium text-foreground">
          {eventKindLabel(event.event_kind)}
        </span>
        {tier && <TierBadge tier={tier} showLabel={false} />}
        <span className="font-mono text-micro text-muted-foreground">{event.source_module}</span>
        {inBand && (
          <span
            className="ml-auto font-mono text-micro tabular-nums text-muted-foreground"
            title="This member's own UTC instant"
          >
            {time} UTC
          </span>
        )}
      </div>

      {/* Per-event ambiguity markers (assumed tz / clock skew) — surfaced on the event itself. */}
      {node.kinds.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {node.kinds.map((kind) => (
            <AmbiguityBadge key={kind} kind={kind} />
          ))}
        </div>
      )}

      {provisional && (
        <p className="mt-1.5 text-micro italic text-muted-foreground">
          Time is provisional — placed, but its position rests on an assumption (see marker).
        </p>
      )}

      {/* Linked entities, resolved to real values where the graph projection has them. */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {event.entity_ids.length > 0 ? (
          event.entity_ids.map((id) => <EntityChip key={id} id={id} resolver={resolver} />)
        ) : (
          <span className="text-micro text-muted-foreground">No linked entities</span>
        )}
      </div>
    </button>
  );
}

// -- band (unordered cluster) --------------------------------------------------------------------

const BAND_ACCENT: Record<string, string> = {
  tie: 'border-ambiguity-tie/70',
  indeterminate: 'border-ambiguity-indeterminate/70',
  mixed: 'border-ambiguity-tie/70',
};

function ClusterBand({
  slot,
  resolver,
  onSelect,
  selectedKey,
}: {
  slot: Extract<TimelineSlot, { kind: 'cluster' }>;
  resolver: EntityResolver;
  onSelect: (node: TimelineEventNode) => void;
  selectedKey: string | null;
}) {
  const copy = clusterReasonCopy(slot.reason);
  const accent = BAND_ACCENT[slot.reason];
  return (
    <div className={cn('rounded-lg border border-l-[3px] bg-surface-1/60 p-3', accent)}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-caption font-semibold uppercase tracking-wide text-foreground">
          {copy.title}
        </span>
        <span className="rounded bg-surface-3 px-1.5 py-0.5 font-mono text-micro text-muted-foreground">
          {slot.nodes.length} events · order not established
        </span>
      </div>
      <p className="mb-3 max-w-[62ch] text-micro leading-snug text-muted-foreground">{copy.blurb}</p>
      <div className="flex flex-col gap-2">
        {slot.nodes.map((node) => (
          <EventCard
            key={node.event.event_key}
            node={node}
            resolver={resolver}
            onSelect={onSelect}
            selected={selectedKey === node.event.event_key}
            inBand
          />
        ))}
      </div>
    </div>
  );
}

// -- gutter (the UTC axis label for a slot) ------------------------------------------------------

function SlotGutter({ slot }: { slot: TimelineSlot }) {
  const iso = slot.kind === 'single' ? slot.node.event.utc : slot.utcMin;
  const { date, time } = utcParts(iso);
  const provisional = slot.kind === 'single' && isProvisional(slot.node);
  const isRange = slot.kind === 'cluster' && slot.utcMin !== slot.utcMax;
  return (
    <div className="w-[8.5rem] shrink-0 pt-1 text-right">
      <div className="font-mono text-micro text-muted-foreground">{date}</div>
      <div
        className={cn(
          'font-mono text-body tabular-nums',
          provisional ? 'italic text-ambiguity-assumed-tz/90 underline decoration-dashed' : 'text-foreground',
        )}
      >
        {isRange ? '≈ ' : ''}
        {time}
      </div>
      <div className="text-micro uppercase tracking-wide text-muted-foreground/70">UTC</div>
    </div>
  );
}

// -- the view ------------------------------------------------------------------------------------

export function TimelineView({
  layout,
  resolver,
  selectedKey,
  onSelect,
}: {
  layout: TimelineLayout;
  resolver: EntityResolver;
  selectedKey: string | null;
  onSelect: (node: TimelineEventNode) => void;
}) {
  return (
    <div className="flex flex-col">
      {layout.slots.map((slot, i) => (
        <React.Fragment key={slot.kind === 'single' ? slot.node.event.event_key : slot.utcMin + i}>
          <div className="flex items-start gap-4">
            <SlotGutter slot={slot} />
            {slot.kind === 'single' ? (
              <RailMarker node={slot.node} />
            ) : (
              <div className="relative flex w-8 shrink-0 justify-center">
                <span className="absolute inset-y-0 w-px bg-border" aria-hidden />
                <span
                  className={cn(
                    'relative z-10 mt-1.5 h-3 w-3 rounded-sm border-2 border-dashed bg-surface-0',
                    slot.reason === 'indeterminate'
                      ? 'border-ambiguity-indeterminate'
                      : 'border-ambiguity-tie',
                  )}
                  aria-hidden
                />
              </div>
            )}
            <div className="min-w-0 flex-1 pb-1">
              {slot.kind === 'single' ? (
                <EventCard
                  node={slot.node}
                  resolver={resolver}
                  onSelect={onSelect}
                  selected={selectedKey === slot.node.event.event_key}
                />
              ) : (
                <ClusterBand
                  slot={slot}
                  resolver={resolver}
                  onSelect={onSelect}
                  selectedKey={selectedKey}
                />
              )}
            </div>
          </div>
          {i < layout.gaps.length && <GapSegment gap={layout.gaps[i]} />}
        </React.Fragment>
      ))}
    </div>
  );
}

// Re-export for the page's convenience.
export type { AmbiguityKind };
