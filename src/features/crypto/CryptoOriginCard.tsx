import { Ban, Crosshair } from 'lucide-react';

import { EvidenceCite } from '@/components/common/EvidenceCite';
import { TierBadge } from '@/components/forensic/TierBadge';
import { Card } from '@/components/ui/card';
import type { CryptoOrigin } from '@/types/api';

/**
 * The ORIGIN header — the OFAC-sanctioned wallet the trace started from, front and centre as the
 * investigation subject. It carries the amber/probabilistic treatment because the WHOLE trace is an
 * indicator, not confirmed evidence (R4): the tier badge marks the association as probabilistic,
 * while the sanction flag states the real-world provenance the reference evidence records.
 *
 * The sanction flag stays in the amber tier hue (with a distinct Ban icon for weight) rather than
 * borrowing the reserved integrity RED — a sanctioned subject is not a custody break, and the hue
 * discipline (TOKENS.md) keeps the two from ever being confused.
 */
export function CryptoOriginCard({ origin }: { origin: CryptoOrigin }) {
  return (
    <Card className="border-probabilistic/40 bg-probabilistic/[0.05] p-5">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 text-micro font-semibold uppercase tracking-wider text-probabilistic">
            <Crosshair className="size-3.5" aria-hidden />
            Investigation subject · Origin (hop 0)
          </span>
          <TierBadge tier="probabilistic" confidence={origin.confidence} />
        </div>

        {origin.sanction_provenance && (
          <div className="flex items-start gap-2.5 rounded-md border border-probabilistic/50 bg-probabilistic/10 px-3 py-2.5">
            <Ban className="mt-0.5 size-5 shrink-0 text-probabilistic" aria-hidden />
            <div className="flex flex-col gap-0.5">
              <span className="text-body font-bold uppercase tracking-wide text-probabilistic">
                OFAC-sanctioned · Lazarus-associated
              </span>
              <span className="text-caption text-foreground/80">{origin.sanction_provenance}</span>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <span className="type-label">Origin wallet</span>
          <code className="break-all font-mono text-body text-foreground">{origin.value}</code>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-caption text-muted-foreground">
          {origin.chain && (
            <span className="inline-flex items-center gap-1.5">
              <span className="type-label">Chain</span>
              <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-micro text-foreground">
                {origin.chain}
              </span>
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <span className="type-label">Reference evidence</span>
            <EvidenceCite
              ids={origin.reference_evidence_id === null ? [] : [origin.reference_evidence_id]}
            />
          </span>
        </div>
      </div>
    </Card>
  );
}
