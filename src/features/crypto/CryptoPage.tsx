/**
 * The CRYPTO view (/crypto) — a case's stored crypto funds-flow trace, presented as a LEGIBLE
 * FORENSIC STORY rather than a hairball. The trace here is DENSE and REAL (hundreds of wallets and
 * transactions traced from an OFAC-sanctioned, Lazarus-associated origin), so the view leads with
 * the subject and the aggregates, then unfolds the flow hop-by-hop with confidence decay visible —
 * defaulting to origin + primary flow + summary, expandable on demand.
 *
 * The WHOLE payload is probabilistic (R4): a trace is an indicator, never confirmed evidence. The
 * amber tier treatment is carried throughout, and an absent trace (`present:false`) renders a clean
 * empty state, never a fabricated flow.
 */
import { Coins } from 'lucide-react';

import { useCryptoTrace } from '@/api/queries';
import { CaseScoped } from '@/components/common/CaseScoped';
import { QueryBoundary } from '@/components/common/QueryBoundary';
import { EmptyState } from '@/components/common/States';
import type { CryptoTraceResponse } from '@/types/api';

import { CryptoFindings } from './CryptoFindings';
import { CryptoFlowSummary } from './CryptoFlowSummary';
import { CryptoHopFlow } from './CryptoHopFlow';
import { CryptoOriginCard } from './CryptoOriginCard';
import { RefreshLiveNotice } from './RefreshLiveNotice';

function CryptoBody({ data }: { data: CryptoTraceResponse }) {
  return (
    <div className="flex flex-col gap-5">
      <RefreshLiveNotice />
      {data.origin && <CryptoOriginCard origin={data.origin} />}
      <CryptoFlowSummary summary={data.summary} />
      <CryptoHopFlow data={data} />
      <CryptoFindings findings={data.findings} />
    </div>
  );
}

function CryptoQuery({ caseId }: { caseId: number }) {
  const crypto = useCryptoTrace(caseId);
  return (
    <QueryBoundary
      query={crypto}
      loadingMessage="Loading crypto funds-flow trace…"
      isEmpty={(d) => !d.present}
      emptyTitle="No crypto trace for this case"
      emptyMessage="This case has no stored crypto funds-flow trace. When a wallet is traced on-chain, its origin, hop-by-hop flow, and confidence decay appear here — all probabilistic (R4)."
    >
      {(data) =>
        data.present ? (
          <CryptoBody data={data} />
        ) : (
          <EmptyState
            icon={Coins}
            title="No crypto trace for this case"
            message="Nothing has been traced on-chain for this case yet."
          />
        )
      }
    </QueryBoundary>
  );
}

/** Crypto — the case's on-chain funds-flow trace, shaped as a readable, hop-by-hop story. */
export function CryptoPage() {
  return (
    <CaseScoped
      kicker="Findings"
      title="Crypto"
      sub="On-chain funds-flow trace from a sanctioned origin — probabilistic, with confidence decaying per hop (R4)."
    >
      {(caseId) => <CryptoQuery caseId={caseId} />}
    </CaseScoped>
  );
}
