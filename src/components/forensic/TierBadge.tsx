import { cva, type VariantProps } from 'class-variance-authority';
import { BadgeCheck, CircleDashed } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';
import type { Tier } from '@/types/api';

/**
 * R4 made visual. The two tiers are distinguishable at a glance — before reading a single word —
 * by THREE reinforcing signals encoded in the tokens, not by the label alone:
 *   confirmed     → cyan, SOLID border, filled check icon, full emphasis (a grounded fact)
 *   probabilistic → amber, DASHED border, dashed-circle icon, muted (a provisional inference)
 *
 * The only prop that selects treatment is `tier: Tier` (a closed union), so a component can never
 * request a "confirmed-looking probabilistic" badge — the mapping is centralized here.
 */
const tierBadgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-micro font-semibold uppercase tracking-wider leading-none',
  {
    variants: {
      tier: {
        confirmed: 'border-confirmed/55 bg-confirmed/15 text-confirmed',
        probabilistic:
          'border-dashed border-probabilistic/60 bg-probabilistic/10 text-probabilistic font-medium',
      },
    },
    defaultVariants: { tier: 'confirmed' },
  },
);

const TIER_ICON: Record<Tier, typeof BadgeCheck> = {
  confirmed: BadgeCheck,
  probabilistic: CircleDashed,
};

const TIER_LABEL: Record<Tier, string> = {
  confirmed: 'Confirmed',
  probabilistic: 'Probabilistic',
};

export interface TierBadgeProps
  extends
    Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'>,
    VariantProps<typeof tierBadgeVariants> {
  tier: Tier;
  /** For probabilistic items, an optional confidence in [0,1] rendered as `~62%`. */
  confidence?: number | null;
  showLabel?: boolean;
}

export function TierBadge({
  tier,
  confidence,
  showLabel = true,
  className,
  ...props
}: TierBadgeProps) {
  const Icon = TIER_ICON[tier];
  const showConfidence =
    tier === 'probabilistic' && confidence !== null && confidence !== undefined;
  return (
    <span className={cn(tierBadgeVariants({ tier }), className)} {...props}>
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {showLabel && <span>{TIER_LABEL[tier]}</span>}
      {showConfidence && <span className="opacity-80">· ~{Math.round(confidence * 100)}%</span>}
    </span>
  );
}
