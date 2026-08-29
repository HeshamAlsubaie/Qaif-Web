import { RefreshCw } from 'lucide-react';

import { ExternalClaimBadge } from '@/components/forensic/ExternalClaimBadge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

/**
 * The "Refresh live" affordance — laid out and HONESTLY marked as not-yet-wired (the same
 * discipline as the case-search "coming next" bar). A live re-trace would hit Etherscan and return
 * EXTERNAL-CLAIM data — a third-party source's current view, distinct from the stored, custodied
 * case evidence shown on this page (R9). Until that endpoint exists, the button is disabled and the
 * distinction is stated up front rather than faking a live result.
 */
export function RefreshLiveNotice() {
  return (
    <Card className="flex flex-wrap items-center justify-between gap-3 border-dashed p-3.5">
      <div className="flex items-start gap-2.5">
        <ExternalClaimBadge />
        <p className="max-w-[64ch] text-caption text-muted-foreground">
          A live re-trace queries Etherscan and returns <strong>external-claim</strong> data — a
          third-party source's current view, <strong>not</strong> the stored case evidence shown
          below. This is laid out but not wired yet.
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        disabled
        title="Live re-trace is not wired yet — no endpoint to call"
      >
        <RefreshCw aria-hidden />
        Refresh live — coming
      </Button>
    </Card>
  );
}
