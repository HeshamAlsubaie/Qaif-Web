import { Scissors } from 'lucide-react';

import { MetricTile } from '@/components/common/MetricTile';
import { Card } from '@/components/ui/card';
import type { CryptoTraceSummary } from '@/types/api';

const plural = (n: number, one: string, many = `${one}s`): string => (n === 1 ? one : many);

/**
 * The FLOW SUMMARY — the trace's density stated as a readable sentence and a stat block, so the
 * scale is DISCLOSED (and the truncation is a surfaced finding), never hidden behind a hairball.
 * Every number is straight from the `/crypto` summary; nothing is derived or invented.
 */
export function CryptoFlowSummary({ summary }: { summary: CryptoTraceSummary }) {
  const {
    total_wallets,
    total_transactions,
    total_funded_edges,
    max_hop,
    truncation_findings,
  } = summary;

  return (
    <Card className="flex flex-col gap-4 p-5">
      <p className="text-body leading-relaxed text-foreground">
        Funds traced to{' '}
        <strong className="font-semibold text-probabilistic">
          {total_wallets.toLocaleString()} {plural(total_wallets, 'address', 'addresses')}
        </strong>{' '}
        across{' '}
        <strong className="font-semibold text-probabilistic">
          {max_hop} {plural(max_hop, 'hop')}
        </strong>{' '}
        via{' '}
        <strong className="font-semibold text-probabilistic">
          {total_transactions.toLocaleString()} {plural(total_transactions, 'transaction')}
        </strong>{' '}
        ({total_funded_edges.toLocaleString()} funded {plural(total_funded_edges, 'edge')})
        {truncation_findings > 0 && (
          <>
            {' '}
            — with{' '}
            <strong className="font-semibold text-probabilistic">
              {truncation_findings} {plural(truncation_findings, 'branch', 'branches')} truncated
            </strong>{' '}
            at the breadth cap.
          </>
        )}
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricTile label="Addresses" value={total_wallets.toLocaleString()} accent="probabilistic" />
        <MetricTile
          label="Transactions"
          value={total_transactions.toLocaleString()}
          accent="probabilistic"
        />
        <MetricTile label="Funded edges" value={total_funded_edges.toLocaleString()} />
        <MetricTile label="Max hop depth" value={max_hop} />
      </div>

      {truncation_findings > 0 && (
        <div className="flex items-start gap-2.5 rounded-md border border-probabilistic/30 bg-surface-2/60 px-3 py-2.5">
          <Scissors className="mt-0.5 size-4 shrink-0 text-probabilistic" aria-hidden />
          <span className="text-caption text-muted-foreground">
            {truncation_findings} {plural(truncation_findings, 'branch', 'branches')} were truncated
            at the breadth cap. The fan-out was bounded deliberately — this is disclosed as{' '}
            {plural(truncation_findings, 'a finding', 'findings')} below, not silently dropped.
          </span>
        </div>
      )}
    </Card>
  );
}
