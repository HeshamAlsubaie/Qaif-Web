/**
 * Turn a DENSE crypto trace (hundreds of wallets, hundreds of transactions) into a small, legible
 * per-HOP model — the shape the view needs to tell a fund-flow STORY instead of drawing a hairball.
 *
 * Nothing here fabricates: it only groups, sorts, and averages what `/crypto` returned. The origin
 * is kept OUT of the hop sections (it is the header's subject) so a hop section never repeats it;
 * its confidence is exposed separately as the decay baseline.
 */
import type {
  CryptoTraceResponse,
  CryptoTransaction,
  CryptoWallet,
} from '@/types/api';

export interface HopGroup {
  hop: number;
  wallets: CryptoWallet[];
  transactions: CryptoTransaction[];
  /** Representative confidence for the hop: mean of its wallets' scores (txs' as a fallback). */
  confidence: number | null;
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function present(values: (number | null)[]): number[] {
  return values.filter((v): v is number => v !== null);
}

/**
 * Group wallets and transactions by hop, sorted ascending. Each group carries a representative
 * confidence so the view can show decay per hop. `hop 0` (the origin/seed) is included here for
 * completeness, but the page renders sections for hop ≥ 1 and treats hop 0 as the header subject.
 */
export function buildHopGroups(data: CryptoTraceResponse): HopGroup[] {
  const byHop = new Map<number, HopGroup>();
  const ensure = (hop: number): HopGroup => {
    let g = byHop.get(hop);
    if (g === undefined) {
      g = { hop, wallets: [], transactions: [], confidence: null };
      byHop.set(hop, g);
    }
    return g;
  };
  for (const w of data.wallets) ensure(w.hop).wallets.push(w);
  for (const t of data.transactions) ensure(t.hop).transactions.push(t);

  const groups = [...byHop.values()].sort((a, b) => a.hop - b.hop);
  for (const g of groups) {
    const fromWallets = mean(present(g.wallets.map((w) => w.confidence)));
    g.confidence = fromWallets ?? mean(present(g.transactions.map((t) => t.confidence)));
  }
  return groups;
}

/**
 * The confidence to scale the decay bars against — the origin's own score, falling back to the
 * highest hop confidence present. Returns null only when the whole trace carries no confidence.
 */
export function decayBaseline(data: CryptoTraceResponse, groups: HopGroup[]): number | null {
  if (data.origin?.confidence != null) return data.origin.confidence;
  const hopConfidences = present(groups.map((g) => g.confidence));
  return hopConfidences.length ? Math.max(...hopConfidences) : null;
}

/** `~62%` — the codebase's confidence convention, guarded for null. */
export function formatConfidence(c: number | null | undefined): string {
  if (c === null || c === undefined) return '—';
  return `~${Math.round(c * 100)}%`;
}

/** Shorten a long hex address/txid to `0x1234abcd…9f0a`, keeping head + tail for recognition. */
export function shortenMiddle(value: string, head = 10, tail = 8): string {
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}
