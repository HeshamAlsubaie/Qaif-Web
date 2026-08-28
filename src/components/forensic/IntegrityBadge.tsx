import { ShieldAlert, ShieldCheck } from 'lucide-react';
import * as React from 'react';

import { cn, shortHash } from '@/lib/utils';

/**
 * Evidence-integrity grammar. A solid, secure shield treatment for a verified SHA-256 / intact
 * custody chain (emerald); an alarming red shield for a break (hash mismatch or custody gap).
 * The visual weight is deliberately heavier than a tier badge — integrity is the platform's
 * bedrock (R2/R3), and a break must never read as a soft warning.
 */
export interface IntegrityBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Whether the hash / custody chain verified (maps to `custody_verified` from the API). */
  verified: boolean;
  /** Optional digest to show in monospace (truncated); makes the badge self-documenting. */
  hash?: string;
  /** Override the label; defaults to Verified / Integrity break. */
  label?: string;
}

export function IntegrityBadge({
  verified,
  hash,
  label,
  className,
  ...props
}: IntegrityBadgeProps) {
  const Icon = verified ? ShieldCheck : ShieldAlert;
  const text = label ?? (verified ? 'Verified' : 'Integrity break');
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-micro font-semibold uppercase leading-none tracking-wider',
        verified
          ? 'border-integrity-verified/55 bg-integrity-verified/15 text-integrity-verified'
          : 'border-integrity-broken/60 bg-integrity-broken/15 text-integrity-broken',
        className,
      )}
      {...props}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      <span>{text}</span>
      {hash && (
        <span className="ml-0.5 font-mono text-[0.65rem] font-normal normal-case tracking-normal opacity-80">
          {shortHash(hash)}
        </span>
      )}
    </span>
  );
}
