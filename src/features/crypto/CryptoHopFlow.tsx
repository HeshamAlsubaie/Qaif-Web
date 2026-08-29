import { ArrowRight, ChevronDown, ChevronRight, TrendingDown } from 'lucide-react';
import * as React from 'react';

import { TierBadge } from '@/components/forensic/TierBadge';
import { cn } from '@/lib/utils';
import { formatInZone, formatUtc, isUtcZone } from '@/lib/format';
import type { CryptoTraceResponse, CryptoTransaction, CryptoWallet } from '@/types/api';

import {
  buildHopGroups,
  decayBaseline,
  formatConfidence,
  shortenMiddle,
  type HopGroup,
} from './cryptoModel';

const WALLETS_SHOWN = 12;
const TXNS_SHOWN = 6;

/** A confidence bar whose width is the hop's confidence relative to the origin baseline. */
function DecayBar({ confidence, baseline }: { confidence: number | null; baseline: number | null }) {
  const pct =
    confidence !== null && baseline && baseline > 0
      ? Math.max(4, Math.min(100, (confidence / baseline) * 100))
      : confidence !== null
        ? Math.max(4, Math.min(100, confidence * 100))
        : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
      <div
        className="h-full rounded-full bg-probabilistic/80"
        style={{ width: `${pct}%` }}
        aria-hidden
      />
    </div>
  );
}

/**
 * The at-a-glance DECAY STRIP: one pill per hop (origin included), each showing its confidence and
 * a bar. Read left-to-right, the shrinking bars ARE the forensic point — confidence falls the
 * further a wallet sits from the sanctioned origin.
 */
function DecayStrip({
  groups,
  baseline,
}: {
  groups: HopGroup[];
  baseline: number | null;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface-1 p-4">
      <span className="inline-flex items-center gap-1.5 type-label">
        <TrendingDown className="size-3.5" aria-hidden />
        Confidence decays with distance from origin
      </span>
      <div className="grid grid-flow-col auto-cols-fr gap-3">
        {groups.map((g) => (
          <div key={g.hop} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-caption font-medium text-foreground">
                {g.hop === 0 ? 'Origin' : `Hop ${g.hop}`}
              </span>
              <span className="font-mono text-caption text-probabilistic">
                {formatConfidence(g.confidence)}
              </span>
            </div>
            <DecayBar confidence={g.confidence} baseline={baseline} />
            <span className="text-micro text-muted-foreground">
              {g.wallets.length.toLocaleString()}{' '}
              {g.wallets.length === 1 ? 'address' : 'addresses'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** One address leg of a transaction — first address shortened, with a `+N` when there are more. */
function AddrGroup({ addresses }: { addresses: string[] }) {
  if (addresses.length === 0) return <span className="text-muted-foreground">—</span>;
  const [first, ...rest] = addresses;
  return (
    <span className="inline-flex items-center gap-1">
      <code className="rounded bg-surface-3 px-1.5 py-0.5 font-mono text-micro text-foreground">
        {shortenMiddle(first)}
      </code>
      {rest.length > 0 && (
        <span className="text-micro text-muted-foreground" title={rest.join('\n')}>
          +{rest.length}
        </span>
      )}
    </span>
  );
}

/** One FUNDED transaction: who paid whom, how much, its txid, and when (UTC + original tz, R8). */
function TransactionRow({ txn }: { txn: CryptoTransaction }) {
  const showOriginal = !isUtcZone(txn.original_tz);
  const originalLocal = showOriginal ? formatInZone(txn.timestamp, txn.original_tz) : null;
  return (
    <div className="flex flex-col gap-2 border-b border-border/50 py-3 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2">
        <AddrGroup addresses={txn.source_addresses} />
        <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <AddrGroup addresses={txn.target_addresses} />
        {txn.amount && (
          <span className="ml-auto font-mono text-caption tabular-nums text-foreground">
            {txn.amount}
            {txn.chain && <span className="ml-1 text-micro text-muted-foreground">{txn.chain}</span>}
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-micro text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="type-label">txid</span>
          <code className="font-mono text-micro text-foreground/80" title={txn.txid}>
            {shortenMiddle(txn.txid, 12, 10)}
          </code>
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="type-label">when</span>
          <span className="font-mono text-foreground/80">{formatUtc(txn.timestamp)}</span>
        </span>
        {originalLocal && (
          <span className="text-muted-foreground">
            recorded {originalLocal} ({txn.original_tz})
          </span>
        )}
      </div>
    </div>
  );
}

function WalletChips({ wallets }: { wallets: CryptoWallet[] }) {
  const [showAll, setShowAll] = React.useState(false);
  const shown = showAll ? wallets : wallets.slice(0, WALLETS_SHOWN);
  const hidden = wallets.length - shown.length;
  return (
    <div className="flex flex-col gap-2">
      <span className="type-label">
        Addresses at this hop · {wallets.length.toLocaleString()}
      </span>
      <div className="flex max-h-72 flex-wrap gap-1.5 overflow-y-auto">
        {shown.map((w) => (
          <code
            key={w.entity_id}
            className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-micro text-foreground/90"
            title={`${w.value} · ${formatConfidence(w.confidence)}`}
          >
            {shortenMiddle(w.value)}
          </code>
        ))}
      </div>
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="self-start text-caption text-primary hover:underline"
        >
          Show all {wallets.length.toLocaleString()} addresses (+{hidden.toLocaleString()})
        </button>
      )}
    </div>
  );
}

function TransactionList({ transactions }: { transactions: CryptoTransaction[] }) {
  const [showAll, setShowAll] = React.useState(false);
  const shown = showAll ? transactions : transactions.slice(0, TXNS_SHOWN);
  const hidden = transactions.length - shown.length;
  if (transactions.length === 0) {
    return (
      <span className="text-caption italic text-muted-foreground">
        No representative transactions recorded at this hop.
      </span>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <span className="type-label">
        Representative transactions · {transactions.length.toLocaleString()}
      </span>
      <div className="rounded-md border border-border/60 bg-surface-1 px-3">
        {shown.map((t) => (
          <TransactionRow key={t.entity_id} txn={t} />
        ))}
      </div>
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="self-start text-caption text-primary hover:underline"
        >
          Show all {transactions.length.toLocaleString()} transactions (+{hidden.toLocaleString()})
        </button>
      )}
    </div>
  );
}

/** A collapsible per-hop section. Defaults open for the primary flow (hop 1), collapsed deeper. */
function HopSection({
  group,
  baseline,
  defaultOpen,
}: {
  group: HopGroup;
  baseline: number | null;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  const tier = group.wallets[0]?.tier ?? group.transactions[0]?.tier ?? 'probabilistic';
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-4 text-left hover:bg-surface-2/60"
      >
        {open ? (
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        ) : (
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="text-body font-semibold text-foreground">Hop {group.hop}</span>
            {group.hop === 1 && (
              <span className="text-micro font-medium uppercase tracking-wide text-muted-foreground">
                Direct counterparties · primary flow
              </span>
            )}
            <TierBadge tier={tier} confidence={group.confidence} className="ml-auto" />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-40 shrink-0">
              <DecayBar confidence={group.confidence} baseline={baseline} />
            </div>
            <span className="text-caption text-muted-foreground">
              {group.wallets.length.toLocaleString()}{' '}
              {group.wallets.length === 1 ? 'address' : 'addresses'} ·{' '}
              {group.transactions.length.toLocaleString()}{' '}
              {group.transactions.length === 1 ? 'transaction' : 'transactions'}
            </span>
          </div>
        </div>
      </button>
      {open && (
        <div className="flex flex-col gap-5 border-t border-border/60 p-4">
          <WalletChips wallets={group.wallets} />
          <TransactionList transactions={group.transactions} />
        </div>
      )}
    </div>
  );
}

/**
 * The HOP-BY-HOP fund flow — the legible core. A decay strip headlines the confidence fall-off;
 * then one collapsible section per hop (≥ 1), the primary flow (hop 1) open by default and deeper
 * hops collapsed, so a dense trace stays a readable story rather than a 275-node hairball.
 */
export function CryptoHopFlow({ data }: { data: CryptoTraceResponse }) {
  const groups = React.useMemo(() => buildHopGroups(data), [data]);
  const baseline = React.useMemo(() => decayBaseline(data, groups), [data, groups]);
  const hopSections = groups.filter((g) => g.hop >= 1);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="type-h4">Hop-by-hop fund flow</h2>
        <span className="type-caption">
          Grouped by distance from the sanctioned origin. Hop&nbsp;1 (the direct counterparties) is
          shown expanded; deeper hops collapse — expand to read them.
        </span>
      </div>

      {groups.length > 0 && <DecayStrip groups={groups} baseline={baseline} />}

      <div className={cn('flex flex-col gap-3')}>
        {hopSections.map((g) => (
          <HopSection key={g.hop} group={g} baseline={baseline} defaultOpen={g.hop === 1} />
        ))}
      </div>
    </div>
  );
}
