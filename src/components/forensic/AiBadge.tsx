import { Bot } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * R6 made visual. AI suggestions are quarantined: a distinct violet accent, a dashed border, a
 * bot icon, a live "unverified" dot, and the fixed signature `AI · UNVERIFIED`. There is no
 * variant to toggle — an AI badge always looks like an AI badge, and never like a confirmed
 * finding. It signals "machine-generated, awaiting human review; NOT evidence".
 */
export interface AiBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Optionally soften the wording once a human has reviewed it (still clearly AI-origin). */
  reviewed?: boolean;
}

export function AiBadge({ reviewed = false, className, ...props }: AiBadgeProps) {
  return (
    <span
      className={cn(
        'bg-ai/12 inline-flex items-center gap-1.5 rounded-md border border-dashed border-ai/60 px-2 py-0.5 text-micro font-semibold uppercase leading-none tracking-wider text-ai',
        className,
      )}
      {...props}
    >
      <Bot className="size-3.5 shrink-0" aria-hidden />
      <span>AI</span>
      <span aria-hidden className="opacity-60">
        ·
      </span>
      <span className="inline-flex items-center gap-1">
        {!reviewed && (
          <span className="size-1.5 animate-pulse-dot rounded-full bg-ai" aria-hidden />
        )}
        {reviewed ? 'Reviewed' : 'Unverified'}
      </span>
    </span>
  );
}
