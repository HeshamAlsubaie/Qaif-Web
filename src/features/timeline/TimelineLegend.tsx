/**
 * Self-documenting key for the timeline's honesty markers — the timeline's version of the graph's
 * tier legend. It teaches the four ambiguity kinds once (via the shared AmbiguityBadge, so the
 * vocabulary matches everywhere) plus the two structural treatments (the unordered band, and a
 * provisional-time event). Kinds actually present in THIS case are marked, so the key never implies
 * the data carries an ambiguity it does not.
 */
import { AmbiguityBadge } from '@/components/forensic/AmbiguityBadge';
import type { AmbiguityKind } from '@/types/api';

const KIND_BLURB: Record<AmbiguityKind, string> = {
  assumed_tz: 'Original timezone was not recorded; UTC was assumed. The time is provisional.',
  precision_overlap: 'Precision windows overlap — relative order cannot be established.',
  clock_skew: "Source clocks disagree — the time may be off by the estimated skew.",
  tie: 'Identical UTC instant — the events co-occur; neither precedes the other.',
};

const KIND_ORDER: AmbiguityKind[] = ['assumed_tz', 'precision_overlap', 'clock_skew', 'tie'];

export function TimelineLegend({ presentKinds }: { presentKinds: AmbiguityKind[] }) {
  const present = new Set(presentKinds);
  return (
    <div className="rounded-lg border border-border/70 bg-surface-1/95 p-3 shadow-lg backdrop-blur">
      <div className="mb-2 text-micro font-semibold uppercase tracking-wider text-muted-foreground">
        Ambiguity key
      </div>
      <ul className="flex flex-col gap-2">
        {KIND_ORDER.map((kind) => (
          <li key={kind} className="flex items-start gap-2.5">
            <AmbiguityBadge kind={kind} className="mt-0.5 shrink-0" />
            <span className="max-w-[34ch] text-micro leading-tight text-muted-foreground">
              {KIND_BLURB[kind]}
              {present.has(kind) && (
                <span className="ml-1 font-medium text-foreground">· in this case</span>
              )}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-col gap-2 border-t border-border/60 pt-2.5">
        <div className="flex items-start gap-2.5">
          <span
            className="mt-1 h-6 w-3 shrink-0 rounded-sm border-l-2 border-dashed border-ambiguity-tie/70"
            aria-hidden
          />
          <span className="max-w-[34ch] text-micro leading-tight text-muted-foreground">
            <span className="font-medium text-foreground">Unordered band</span> — events that
            cannot be sequenced are grouped, not drawn as a false order.
          </span>
        </div>
        <div className="flex items-start gap-2.5">
          <span
            className="mt-1 inline-block size-3 shrink-0 rounded-full border-2 border-dashed border-ambiguity-assumed-tz bg-transparent"
            aria-hidden
          />
          <span className="max-w-[34ch] text-micro leading-tight text-muted-foreground">
            <span className="font-medium text-foreground">Hollow / dashed marker</span> — the
            event's time is provisional (assumed or skewed), not a confirmed instant.
          </span>
        </div>
      </div>

      <p className="mt-2.5 max-w-[34ch] text-micro leading-tight text-muted-foreground">
        The axis is UTC — the reconciliation basis. Every marker is a surfaced finding, never a
        silently resolved order.
      </p>
    </div>
  );
}
