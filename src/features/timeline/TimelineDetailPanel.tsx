/**
 * The slide-in inspector for a clicked event. It renders ONLY what the timeline payload carries and
 * makes the forensic time story explicit:
 *   - R8 in full view: the reconciled UTC AND the original clock reading + original timezone are
 *     BOTH shown. When the original tz is null it says "none recorded — UTC assumed", never a made-up
 *     zone;
 *   - every ambiguity touching the event is spelled out — its summary, method, limitation and
 *     confidence — so an assumed/co-occurring/skewed placement is a documented finding, not a hidden
 *     one;
 *   - linked entities resolve to real values via the case graph; evidence provenance is pointed to
 *     honestly rather than fabricated (the timeline payload does not carry per-event evidence ids).
 */
import { CalendarClock, Info, X } from 'lucide-react';
import * as React from 'react';

import { AmbiguityBadge } from '@/components/forensic/AmbiguityBadge';
import { TierBadge } from '@/components/forensic/TierBadge';
import { Button } from '@/components/ui/button';
import { formatUtc } from '@/lib/format';
import { cn } from '@/lib/utils';

import { entityVisual } from '@/features/graph/graphModel';
import {
  eventKindLabel,
  eventTier,
  isAmbiguityKind,
  type EntityResolver,
  type TimelineEventNode,
} from './timelineModel';

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-micro font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="text-body text-foreground">{children}</div>
    </div>
  );
}

function EntityRow({ id, resolver }: { id: number; resolver: EntityResolver }) {
  const ent = resolver(id);
  if (!ent) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-border bg-surface-2 px-2.5 py-1.5">
        <span className="font-mono text-caption text-muted-foreground">entity #{id}</span>
        <span className="text-micro text-muted-foreground">(not in graph projection)</span>
      </div>
    );
  }
  const Icon = entityVisual(ent.entity_type).icon;
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-surface-2 px-2.5 py-1.5">
      <div className="flex min-w-0 items-center gap-2">
        <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-mono text-caption text-foreground">{ent.value}</span>
          <span className="text-micro text-muted-foreground">
            {ent.entity_type} · #{ent.entity_id}
          </span>
        </div>
      </div>
      <TierBadge tier={ent.tier} showLabel={false} />
    </div>
  );
}

export function TimelineDetailPanel({
  node,
  resolver,
  onClose,
}: {
  node: TimelineEventNode;
  resolver: EntityResolver;
  onClose: () => void;
}) {
  const { event } = node;
  const tier = eventTier(event.event_kind);
  const tzAssumed = event.tz_assumed || event.original_tz === null;

  return (
    <aside
      className="absolute inset-y-0 right-0 z-20 flex w-[360px] max-w-[90%] flex-col border-l border-border bg-surface-1/95 shadow-2xl backdrop-blur duration-200 animate-in slide-in-from-right-4 fade-in"
      aria-label="Event detail"
    >
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <span className="text-micro font-semibold uppercase tracking-wider text-primary">Event</span>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close detail panel">
          <X aria-hidden />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <CalendarClock className="size-5 text-foreground" aria-hidden />
              <span className="text-body font-medium text-foreground">
                {eventKindLabel(event.event_kind)}
              </span>
            </div>
            {tier && <TierBadge tier={tier} />}
          </div>

          {/* R8: reconciled UTC and the original are shown TOGETHER, never just the reconciled one. */}
          <div className="rounded-md border border-border bg-surface-2 p-3">
            <span className="text-micro font-medium uppercase tracking-wider text-muted-foreground">
              Reconciled — UTC axis
            </span>
            <p className="mt-1 font-mono text-body-lg tabular-nums text-foreground">
              {formatUtc(event.utc)}
            </p>

            <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border/60 pt-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-micro font-medium uppercase tracking-wider text-muted-foreground">
                  Original clock reading
                </span>
                <span className="font-mono text-caption text-foreground">
                  {event.original_local}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-micro font-medium uppercase tracking-wider text-muted-foreground">
                  Original timezone
                </span>
                {tzAssumed ? (
                  <span className="inline-flex w-fit items-center gap-1 rounded border border-dashed border-ambiguity-assumed-tz/60 bg-ambiguity-assumed-tz/10 px-1.5 py-0.5 text-caption text-ambiguity-assumed-tz">
                    none recorded — UTC assumed
                  </span>
                ) : (
                  <span className="font-mono text-caption text-foreground">{event.original_tz}</span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Section label="Precision">
              <span className="font-mono text-caption">{event.precision}</span>
            </Section>
            <Section label="Source module">
              <span className="font-mono text-caption">{event.source_module}</span>
            </Section>
          </div>

          <Section label="Event key">
            <span className="font-mono text-caption text-muted-foreground">{event.event_key}</span>
          </Section>

          {/* Every ambiguity touching this event, spelled out as the finding it is. */}
          <div className="flex flex-col gap-2">
            <span className="text-micro font-medium uppercase tracking-wider text-muted-foreground">
              Ambiguities ({node.ambiguities.length})
            </span>
            {node.ambiguities.length === 0 ? (
              <div className="flex items-start gap-2 rounded-md border border-border bg-surface-2 p-2.5 text-caption text-muted-foreground">
                <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                <span>
                  No timing ambiguity on this event — its UTC position is not flagged as uncertain.
                </span>
              </div>
            ) : (
              node.ambiguities.map((amb, idx) => (
                <div
                  key={`${amb.kind}-${idx}`}
                  className="flex flex-col gap-1.5 rounded-md border border-border bg-surface-2 p-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    {isAmbiguityKind(amb.kind) ? (
                      <AmbiguityBadge kind={amb.kind} />
                    ) : (
                      <span className="rounded border border-dashed border-border px-2 py-0.5 text-micro uppercase text-muted-foreground">
                        {amb.kind}
                      </span>
                    )}
                    <span
                      className={cn(
                        'font-mono text-micro tabular-nums text-muted-foreground',
                      )}
                      title="Confidence in this ambiguity assessment"
                    >
                      conf ~{Math.round(amb.confidence * 100)}%
                    </span>
                  </div>
                  <p className="text-caption leading-snug text-foreground">{amb.summary}</p>
                  <p className="text-micro leading-snug text-muted-foreground">
                    <span className="font-medium text-foreground/80">Method: </span>
                    {amb.method_description}
                  </p>
                  <p className="text-micro leading-snug text-muted-foreground">
                    <span className="font-medium text-foreground/80">Limitation: </span>
                    {amb.limitations}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Linked entities, resolved via the case graph. */}
          <div className="flex flex-col gap-1.5">
            <span className="text-micro font-medium uppercase tracking-wider text-muted-foreground">
              Linked entities
            </span>
            {event.entity_ids.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                {event.entity_ids.map((id) => (
                  <EntityRow key={id} id={id} resolver={resolver} />
                ))}
              </div>
            ) : (
              <span className="text-caption text-muted-foreground">
                None — this event is not linked to a case entity.
              </span>
            )}
          </div>

          <div className="flex items-start gap-2 border-t border-border/60 pt-3 text-micro leading-snug text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <span>
              The timeline carries linked entities, not per-event evidence ids. Evidence provenance
              for these events lives in the Evidence and Findings views — it is not fabricated here.
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
