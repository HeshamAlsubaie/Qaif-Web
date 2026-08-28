import { type LucideIcon } from 'lucide-react';
import * as React from 'react';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type MetricAccent = 'plain' | 'accent' | 'confirmed' | 'probabilistic' | 'ai';

interface MetricTileProps {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: LucideIcon;
  /**
   * `accent` emphasises the number in the base blue (a key count). The forensic accents
   * (`confirmed|probabilistic|ai`) add a thin left rule in that reserved hue — use them ONLY when
   * the tile literally counts a tiered/AI quantity, so the colour keeps its meaning.
   */
  accent?: MetricAccent;
}

const RULE: Record<Exclude<MetricAccent, 'plain' | 'accent'>, string> = {
  confirmed: 'border-l-2 border-l-confirmed/70',
  probabilistic: 'border-l-2 border-l-probabilistic/70',
  ai: 'border-l-2 border-l-ai/70',
};

export function MetricTile({ label, value, hint, icon: Icon, accent = 'plain' }: MetricTileProps) {
  const rule =
    accent === 'confirmed' || accent === 'probabilistic' || accent === 'ai' ? RULE[accent] : '';
  return (
    <Card className={cn('flex flex-col gap-2 p-4', rule)}>
      <span className="type-label flex items-center gap-1.5">
        {Icon && <Icon className="size-3.5" aria-hidden />}
        {label}
      </span>
      <span
        className={cn(
          'text-h1 font-bold tabular-nums leading-none',
          accent === 'accent' && 'text-primary',
        )}
      >
        {value}
      </span>
      {hint && <span className="text-micro text-muted-foreground">{hint}</span>}
    </Card>
  );
}
