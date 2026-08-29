import { Globe } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * External-source honesty, made visual — the same tier discipline the console applies to case data
 * (R4), extended to lookups. An IOC-lookup result is third-party INTELLIGENCE: a named source's
 * claim reported verbatim, never confirmed or adjudicated QAIF case evidence.
 *
 * The treatment is deliberately NEUTRAL (slate, dashed border, a globe) so it borrows NONE of the
 * reserved forensic hues — confirmed cyan, probabilistic amber, AI violet, integrity emerald/red.
 * It therefore can never be mistaken for a tier badge: it reads as "from outside the case,
 * unadjudicated". There is no variant to toggle — an external claim always looks like one.
 */
export function ExternalClaimBadge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border border-dashed border-muted-foreground/40 bg-surface-2 px-2 py-0.5 text-micro font-semibold uppercase leading-none tracking-wider text-muted-foreground',
        className,
      )}
      title="External-source claim — not confirmed QAIF case evidence"
      {...props}
    >
      <Globe className="size-3.5 shrink-0" aria-hidden />
      <span>External claim</span>
    </span>
  );
}
