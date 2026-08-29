/**
 * The CRYPTO view (/crypto) — a case's stored crypto funds-flow trace. It offers TWO modes over the
 * SAME `/crypto` payload (fetched once, never refetched on toggle):
 *
 *   - STORY — a legible forensic narrative: the OFAC/Lazarus origin, flow summary with truncation
 *     disclosure, and the hop-by-hop flow with confidence decay;
 *   - GRAPH — a MetaSleuth-style interactive funds-flow graph (progressive, expandable), reusing the
 *     case graph's Cytoscape engine.
 *
 * The WHOLE payload is probabilistic (R4): a trace is an indicator, never confirmed evidence. The
 * amber tier treatment is carried throughout, and an absent trace (`present:false`) renders a clean
 * empty state, never a fabricated flow.
 */
import { Coins, GitBranch, ListTree } from 'lucide-react';
import * as React from 'react';

import { useCryptoTrace } from '@/api/queries';
import { CaseScoped } from '@/components/common/CaseScoped';
import { QueryBoundary } from '@/components/common/QueryBoundary';
import { EmptyState } from '@/components/common/States';
import { cn } from '@/lib/utils';
import type { CryptoTraceResponse } from '@/types/api';

import { CryptoFindings } from './CryptoFindings';
import { CryptoFlowSummary } from './CryptoFlowSummary';
import { CryptoGraphView } from './CryptoGraphView';
import { CryptoHopFlow } from './CryptoHopFlow';
import { CryptoOriginCard } from './CryptoOriginCard';
import { RefreshLiveNotice } from './RefreshLiveNotice';

type CryptoMode = 'story' | 'graph';

const MODES: { mode: CryptoMode; label: string; icon: typeof ListTree }[] = [
  { mode: 'story', label: 'Story', icon: ListTree },
  { mode: 'graph', label: 'Graph', icon: GitBranch },
];

/** A segmented Story/Graph switch — the same segmented-control grammar the graph toolbar uses. */
function ModeToggle({ mode, onChange }: { mode: CryptoMode; onChange: (m: CryptoMode) => void }) {
  return (
    <div
      className="inline-flex items-center rounded-md border border-border bg-surface-2 p-0.5"
      role="group"
      aria-label="Crypto view mode"
    >
      {MODES.map(({ mode: m, label, icon: Icon }) => {
        const active = m === mode;
        return (
          <button
            key={m}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(m)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded px-3 py-1 text-caption font-medium transition-colors',
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-surface-3 hover:text-foreground',
            )}
          >
            <Icon className="size-3.5" aria-hidden />
            {label}
          </button>
        );
      })}
    </div>
  );
}

/** The STORY mode — the narrative, tier-separated view. */
function CryptoStory({ data }: { data: CryptoTraceResponse }) {
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

/** Holds the mode; both modes read the SAME already-loaded `data` — switching never refetches. */
function CryptoContent({ data }: { data: CryptoTraceResponse }) {
  const [mode, setMode] = React.useState<CryptoMode>('story');
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end">
        <ModeToggle mode={mode} onChange={setMode} />
      </div>
      {mode === 'story' ? <CryptoStory data={data} /> : <CryptoGraphView data={data} />}
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
          <CryptoContent data={data} />
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
