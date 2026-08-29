/**
 * The slide-in inspector for a clicked wallet or funds-flow edge — the same visual grammar as the
 * case graph's GraphDetailPanel (a right-docked aside, MetaRow fields, the shared TierBadge), but
 * over the crypto trace's REAL fields: address, hop distance, confidence, in/out funding counts,
 * sanction status (root only), and the incoming funding transactions (txid, amount, UTC — R8).
 *
 * Everything shown comes from the already-loaded `/crypto` data; nothing is fabricated. A wallet
 * with hidden children also gets an explicit expand/collapse control, mirroring the canvas `+N`.
 */
import { ArrowDown, Ban, ChevronsDownUp, ChevronsUpDown, X } from 'lucide-react';
import * as React from 'react';

import { EvidenceCite } from '@/components/common/EvidenceCite';
import { TierBadge } from '@/components/forensic/TierBadge';
import { Button } from '@/components/ui/button';
import { formatUtc } from '@/lib/format';

import {
  type CryptoGraphEdge,
  type CryptoGraphModel,
  type CryptoGraphNode,
} from './cryptoGraph';
import { formatConfidence, shortenMiddle } from './cryptoModel';

export type CryptoGraphSelection =
  | { kind: 'node'; node: CryptoGraphNode }
  | { kind: 'edge'; edge: CryptoGraphEdge };

const TX_SHOWN = 8;

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-micro font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="text-body text-foreground">{children}</div>
    </div>
  );
}

function AddressBlock({ label, address }: { label: string; address: string }) {
  return (
    <div className="rounded-md border border-border bg-surface-2 p-3">
      <span className="text-micro font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <p className="mt-1 break-all font-mono text-body text-foreground">{address}</p>
    </div>
  );
}

function FundingTxList({ model, entityId }: { model: CryptoGraphModel; entityId: number }) {
  const txs = model.fundingTxsOf.get(entityId) ?? [];
  if (txs.length === 0) {
    return (
      <span className="text-caption italic text-muted-foreground">
        No funding transactions resolved for this wallet in the trace.
      </span>
    );
  }
  const shown = txs.slice(0, TX_SHOWN);
  const hidden = txs.length - shown.length;
  return (
    <div className="flex flex-col gap-2">
      {shown.map((t, i) => (
        <div
          key={`${t.txid}-${i}`}
          className="flex flex-col gap-1 rounded-md border border-border/60 bg-surface-1 p-2.5"
        >
          <div className="flex items-center justify-between gap-2">
            <code className="truncate font-mono text-micro text-foreground/80" title={t.txid}>
              {shortenMiddle(t.txid, 12, 10)}
            </code>
            {t.amount && (
              <span className="shrink-0 font-mono text-caption tabular-nums text-foreground">
                {t.amount}
                {t.chain && <span className="ml-1 text-micro text-muted-foreground">{t.chain}</span>}
              </span>
            )}
          </div>
          <span className="font-mono text-micro text-muted-foreground">{formatUtc(t.timestamp)}</span>
        </div>
      ))}
      {hidden > 0 && (
        <span className="text-micro text-muted-foreground">
          + {hidden.toLocaleString()} more funding {hidden === 1 ? 'transaction' : 'transactions'}
        </span>
      )}
    </div>
  );
}

function NodeDetail({
  node,
  model,
  isExpanded,
  onToggleExpand,
}: {
  node: CryptoGraphNode;
  model: CryptoGraphModel;
  isExpanded: boolean;
  onToggleExpand: (id: number) => void;
}) {
  const neighborCount = model.neighborsOf.get(node.entityId)?.length ?? 0;
  const inCount = model.inCount.get(node.entityId) ?? 0;
  const outCount = model.outCount.get(node.entityId) ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <span className="text-body font-medium text-foreground">
          {node.isRoot ? 'Origin wallet' : 'Wallet'}
        </span>
        <TierBadge tier="probabilistic" confidence={node.confidence} />
      </div>

      {node.sanctionProvenance && (
        <div className="flex items-start gap-2.5 rounded-md border border-probabilistic/50 bg-probabilistic/10 px-3 py-2.5">
          <Ban className="mt-0.5 size-5 shrink-0 text-probabilistic" aria-hidden />
          <div className="flex flex-col gap-0.5">
            <span className="text-body font-bold uppercase tracking-wide text-probabilistic">
              OFAC-sanctioned · Lazarus-associated
            </span>
            <span className="text-caption text-foreground/80">{node.sanctionProvenance}</span>
          </div>
        </div>
      )}

      <AddressBlock label="Address" address={node.address} />

      <div className="grid grid-cols-2 gap-4">
        <MetaRow label="Hop distance">
          <span className="tabular-nums">
            {node.hop} {node.isRoot && <span className="text-micro text-muted-foreground">(root)</span>}
          </span>
        </MetaRow>
        <MetaRow label="Confidence">
          <span className="font-mono text-probabilistic">{formatConfidence(node.confidence)}</span>
        </MetaRow>
        <MetaRow label="Funding in">
          <span className="tabular-nums">{inCount.toLocaleString()}</span>
        </MetaRow>
        <MetaRow label="Funding out">
          <span className="tabular-nums">{outCount.toLocaleString()}</span>
        </MetaRow>
      </div>

      {node.chain && (
        <MetaRow label="Chain">
          <span className="font-mono text-caption">{node.chain}</span>
        </MetaRow>
      )}

      {node.isRoot && (
        <div className="flex flex-col gap-1.5">
          <span className="text-micro font-medium uppercase tracking-wider text-muted-foreground">
            Reference evidence
          </span>
          <EvidenceCite
            ids={node.referenceEvidenceId === null ? [] : [node.referenceEvidenceId]}
          />
        </div>
      )}

      {neighborCount > 0 && (
        <Button variant="outline" size="sm" onClick={() => onToggleExpand(node.entityId)}>
          {isExpanded ? (
            <>
              <ChevronsDownUp aria-hidden />
              Collapse {neighborCount} {neighborCount === 1 ? 'counterparty' : 'counterparties'}
            </>
          ) : (
            <>
              <ChevronsUpDown aria-hidden />
              Expand {neighborCount} {neighborCount === 1 ? 'counterparty' : 'counterparties'}
            </>
          )}
        </Button>
      )}

      <div className="flex flex-col gap-1.5 border-t border-border/60 pt-3">
        <span className="text-micro font-medium uppercase tracking-wider text-muted-foreground">
          Funding transactions
        </span>
        <FundingTxList model={model} entityId={node.entityId} />
      </div>
    </div>
  );
}

function EdgeDetail({ edge, model }: { edge: CryptoGraphEdge; model: CryptoGraphModel }) {
  const source = model.nodeById.get(edge.sourceId);
  const target = model.nodeById.get(edge.targetId);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <span className="rounded bg-surface-3 px-2 py-0.5 font-mono text-caption font-semibold uppercase tracking-wide text-foreground">
          Funds flow
        </span>
        <TierBadge tier="probabilistic" confidence={edge.rep.confidence} />
      </div>

      <div className="rounded-md border border-border bg-surface-2 p-3">
        <span className="text-micro font-medium uppercase tracking-wider text-muted-foreground">
          Direction (money out)
        </span>
        <div className="mt-2 flex flex-col gap-2">
          <code className="break-all font-mono text-caption text-foreground">
            {source ? source.address : `#${edge.sourceId}`}
          </code>
          <ArrowDown className="ml-1 size-4 text-muted-foreground" aria-hidden />
          <code className="break-all font-mono text-caption text-foreground">
            {target ? target.address : `#${edge.targetId}`}
          </code>
        </div>
      </div>

      <MetaRow label="Transactions on this flow">
        <span className="tabular-nums">{edge.txCount.toLocaleString()}</span>
      </MetaRow>

      <div className="flex flex-col gap-1.5">
        <span className="text-micro font-medium uppercase tracking-wider text-muted-foreground">
          Representative transaction
        </span>
        <div className="flex flex-col gap-1 rounded-md border border-border/60 bg-surface-1 p-2.5">
          <code className="break-all font-mono text-micro text-foreground/80">{edge.rep.txid}</code>
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-micro text-muted-foreground">
              {formatUtc(edge.rep.timestamp)}
            </span>
            {edge.rep.amount && (
              <span className="font-mono text-caption tabular-nums text-foreground">
                {edge.rep.amount}
                {edge.rep.chain && (
                  <span className="ml-1 text-micro text-muted-foreground">{edge.rep.chain}</span>
                )}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface CryptoGraphDetailPanelProps {
  selection: CryptoGraphSelection;
  model: CryptoGraphModel;
  expanded: ReadonlySet<number>;
  onToggleExpand: (id: number) => void;
  onClose: () => void;
}

export function CryptoGraphDetailPanel({
  selection,
  model,
  expanded,
  onToggleExpand,
  onClose,
}: CryptoGraphDetailPanelProps) {
  const kicker = selection.kind === 'node' ? 'Wallet' : 'Funds flow';
  return (
    <aside
      className="absolute inset-y-0 right-0 z-10 flex w-[340px] max-w-[85%] flex-col border-l border-border bg-surface-1/95 shadow-2xl backdrop-blur duration-200 animate-in slide-in-from-right-4 fade-in"
      aria-label={`${kicker} detail`}
    >
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <span className="text-micro font-semibold uppercase tracking-wider text-primary">
          {kicker}
        </span>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close detail panel">
          <X aria-hidden />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {selection.kind === 'node' ? (
          <NodeDetail
            node={selection.node}
            model={model}
            isExpanded={expanded.has(selection.node.entityId)}
            onToggleExpand={onToggleExpand}
          />
        ) : (
          <EdgeDetail edge={selection.edge} model={model} />
        )}
      </div>
    </aside>
  );
}
