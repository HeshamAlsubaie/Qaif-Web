import { Clock, GitCompareArrows, Timer, Waypoints } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';
import type { AmbiguityKind } from '@/types/api';

/**
 * Timeline-ambiguity markers. Each of the four kinds the backend surfaces gets a consistent
 * color + icon + human label, so an analyst learns the vocabulary once and reads it everywhere.
 * These are always provisional signals (never presented as resolved order), matching the
 * timeline's own honesty about indeterminate sequence.
 */
interface AmbiguityMeta {
  label: string;
  icon: typeof Clock;
  className: string;
}

const AMBIGUITY_META: Record<AmbiguityKind, AmbiguityMeta> = {
  assumed_tz: {
    label: 'Assumed TZ',
    icon: Clock,
    className:
      'border-ambiguity-assumed-tz/50 bg-ambiguity-assumed-tz/12 text-ambiguity-assumed-tz',
  },
  precision_overlap: {
    label: 'Indeterminate order',
    icon: Waypoints,
    className:
      'border-ambiguity-indeterminate/50 bg-ambiguity-indeterminate/12 text-ambiguity-indeterminate',
  },
  clock_skew: {
    label: 'Clock skew',
    icon: GitCompareArrows,
    className: 'border-ambiguity-skew/50 bg-ambiguity-skew/12 text-ambiguity-skew',
  },
  tie: {
    label: 'Tie',
    icon: Timer,
    className: 'border-ambiguity-tie/50 bg-ambiguity-tie/12 text-ambiguity-tie',
  },
};

export interface AmbiguityBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  kind: AmbiguityKind;
  showLabel?: boolean;
}

export function AmbiguityBadge({
  kind,
  showLabel = true,
  className,
  ...props
}: AmbiguityBadgeProps) {
  const meta = AMBIGUITY_META[kind];
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border border-dashed px-2 py-0.5 text-micro font-medium uppercase leading-none tracking-wide',
        meta.className,
        className,
      )}
      {...props}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {showLabel && <span>{meta.label}</span>}
    </span>
  );
}
