import {
  CircleSlash,
  Cloud,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  type LucideIcon,
} from 'lucide-react';
import { type ReactNode } from 'react';

import { ExternalClaimBadge } from '@/components/forensic/ExternalClaimBadge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { titleCase } from '@/lib/format';
import type { LookupResponse } from '@/types/api';

import { DetectedTypeBadge } from './IocResults';
import {
  ANONYMIZER_LABELS,
  ANONYMIZER_ORDER,
  cloudHostingDisplay,
  formatReputationValue,
  normalizeArtifact,
  type AnonymizerState,
  type CloudHosting,
  type NormalizedArtifact,
  type Verdict,
} from './artifact';

/**
 * The merged ARTIFACT card — ONE card for the whole indicator, built from {@link normalizeArtifact}.
 * The header leads with what the eye should hit first: the VERDICT (computed from reputation) and any
 * anonymizer flags. Below it, normalized intelligence is laid out as compact TABLES (reputation,
 * metadata, hash detections, related artifacts) — data only, no prose, no source names.
 *
 * Honesty is preserved exactly: the {@link ExternalClaimBadge} marks the whole card as third-party
 * intelligence (never confirmed case evidence), and every section is present-only.
 */

interface VerdictStyle {
  label: string;
  icon: LucideIcon;
  className: string;
}

// Threat verdict of EXTERNAL intel — a different axis from the forensic tier vocabulary, and always
// carried alongside the ExternalClaimBadge, so red/amber/green here can't be read as a case tier.
const VERDICT_STYLES: Record<Verdict, VerdictStyle> = {
  malicious: {
    label: 'Malicious',
    icon: ShieldAlert,
    className: 'border-destructive/50 bg-destructive/15 text-destructive',
  },
  suspicious: {
    label: 'Suspicious',
    icon: ShieldQuestion,
    className: 'border-probabilistic/55 bg-probabilistic/15 text-probabilistic',
  },
  clean: {
    label: 'Clean',
    icon: ShieldCheck,
    className:
      'border-integrity-verified-border bg-integrity-verified-muted text-integrity-verified',
  },
};

function VerdictPill({ verdict }: { verdict: Verdict }) {
  const style = VERDICT_STYLES[verdict];
  const Icon = style.icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-caption font-semibold uppercase tracking-wide leading-none',
        style.className,
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      {style.label}
    </span>
  );
}

function AnonymizerChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-destructive/40 bg-destructive/10 px-2.5 py-1 text-caption font-semibold leading-none text-destructive">
      <ShieldAlert className="size-3.5 shrink-0" aria-hidden />
      {label}: YES
    </span>
  );
}

// The three anonymizer states, each visually distinct so "unknown" (not checked) can NEVER be read
// as a clean "NO": YES is a red flag, NO is a solid muted negative, and unknown is a DASHED muted
// "no data" pill — the border style alone separates a checked negative from a missing check.
const ANON_STATE_STYLE: Record<
  AnonymizerState,
  { icon: LucideIcon; className: string; text: string; title: string }
> = {
  yes: {
    icon: ShieldAlert,
    className: 'border-destructive/40 bg-destructive/10 text-destructive',
    text: 'YES',
    title: 'A source asserts this anonymizer',
  },
  no: {
    icon: ShieldCheck,
    className: 'border-border bg-surface-2 text-muted-foreground',
    text: 'NO',
    title: 'A source checked and reported this as false',
  },
  unknown: {
    icon: ShieldQuestion,
    className: 'border-dashed border-border bg-transparent text-muted-foreground',
    text: 'unknown',
    title: 'No source reported this — not checked, NOT a clean result',
  },
};

/** An ALWAYS-visible VPN/Proxy/Tor row: real YES/NO when a source has it, explicit unknown when not. */
function AnonymizerStatusPill({ label, state }: { label: string; state: AnonymizerState }) {
  const style = ANON_STATE_STYLE[state];
  const Icon = style.icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-caption font-semibold leading-none',
        style.className,
      )}
      title={style.title}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {label}: {style.text}
    </span>
  );
}

/**
 * The ALWAYS-visible Cloud / Hosting field for an IP: the mapped cloud provider (with the raw isp in
 * muted parens for transparency), or the raw isp for a non-cloud IP, or an explicit "unknown" when no
 * source returned metadata. `usage_type` follows as its own row when present — the hosting-type
 * signal. Mapped only from real metadata; never a fabricated provider.
 */
function CloudHostingRows({ cloud }: { cloud: CloudHosting }) {
  const known = cloud.provider !== null;
  const hasData = cloud.provider !== null || cloud.isp !== null;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="inline-flex items-center gap-1.5 text-micro font-semibold uppercase tracking-wide text-muted-foreground">
          <Cloud className="size-3.5 shrink-0" aria-hidden />
          Cloud / Hosting
        </span>
        {hasData ? (
          <span className="text-caption text-foreground">
            {cloudHostingDisplay(cloud)}
            {known && cloud.isp && (
              <span className="ml-1.5 font-mono text-micro text-muted-foreground">
                ({cloud.isp})
              </span>
            )}
          </span>
        ) : (
          <span
            className="text-caption italic text-muted-foreground"
            title="No source returned ISP / hosting metadata — not checked, NOT a fabricated provider"
          >
            unknown
          </span>
        )}
      </div>
      {cloud.usageType && (
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-micro font-semibold uppercase tracking-wide text-muted-foreground">
            Usage type
          </span>
          <span className="text-caption text-foreground">{cloud.usageType}</span>
        </div>
      )}
    </div>
  );
}

/** A section wrapper: a small uppercase heading over its content, present-only by construction. */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-micro font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

/** A compact, aligned table. Scrolls horizontally on its own so the card never overflows the page. */
function DataTable({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full border-collapse text-caption">
        <thead>
          <tr className="bg-surface-2/60">
            {head.map((h) => (
              <th
                key={h}
                className="px-3 py-1.5 text-left text-micro font-semibold uppercase tracking-wide text-muted-foreground"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, i) => (
            <tr key={i} className="border-t border-border/60">
              {cells.map((cell, j) => (
                <td key={j} className="px-3 py-1.5 align-top text-foreground">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ChipRow({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span
          key={item}
          className="inline-flex items-center rounded-md border border-border bg-surface-2 px-2 py-0.5 font-mono text-micro text-foreground"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function ArtifactSections({ artifact }: { artifact: NormalizedArtifact }) {
  const {
    reputation,
    metadata,
    families,
    detections,
    matchCount,
    sampleIds,
    services,
    resolvedIps,
    associations,
  } = artifact;

  return (
    <div className="flex flex-col gap-5">
      {reputation.length > 0 && (
        <Section title="Reputation">
          <DataTable
            head={['Metric', 'Value', 'Scale']}
            rows={reputation.map((r) => [
              <span key="n">{titleCase(r.name)}</span>,
              <span key="v" className="font-mono tabular-nums">
                {formatReputationValue(r.value)}
              </span>,
              <span key="s" className="text-muted-foreground">
                {r.scale || '—'}
              </span>,
            ])}
          />
        </Section>
      )}

      {metadata.length > 0 && (
        <Section title="Metadata">
          <DataTable
            head={['Field', 'Value']}
            rows={metadata.map((m) => [
              <span key="k">{m.label}</span>,
              <span key="v" className="break-all font-mono">
                {m.value}
              </span>,
            ])}
          />
        </Section>
      )}

      {families.length > 0 && (
        <Section title="Malware families">
          <ChipRow items={families} />
        </Section>
      )}

      {detections && (
        <Section title="Detections">
          {detections.count !== undefined ? (
            <span className="font-mono text-body tabular-nums text-foreground">
              {detections.count}
            </span>
          ) : detections.text !== undefined ? (
            <span className="break-all font-mono text-caption text-foreground">
              {detections.text}
            </span>
          ) : detections.rows ? (
            <DataTable
              head={['Field', 'Value']}
              rows={detections.rows.map((r) => [
                <span key="k">{r.label}</span>,
                <span key="v" className="break-all font-mono">
                  {r.value}
                </span>,
              ])}
            />
          ) : null}
        </Section>
      )}

      {(matchCount !== null || sampleIds.length > 0) && (
        <Section title="Sandbox samples">
          <div className="flex flex-col gap-2">
            {matchCount !== null && (
              <span className="text-caption text-muted-foreground">
                Matching samples:{' '}
                <span className="font-mono tabular-nums text-foreground">{matchCount}</span>
              </span>
            )}
            {sampleIds.length > 0 && (
              <DataTable head={['Sample ID']} rows={sampleIds.map((id) => [<span key="id" className="font-mono">{id}</span>])} />
            )}
          </div>
        </Section>
      )}

      {resolvedIps.length > 0 && (
        <Section title="Resolved IPs">
          <DataTable head={['IP']} rows={resolvedIps.map((v) => [<span key="v" className="font-mono">{v}</span>])} />
        </Section>
      )}

      {services.length > 0 && (
        <Section title="Services">
          <DataTable head={['Service']} rows={services.map((v) => [<span key="v" className="font-mono">{v}</span>])} />
        </Section>
      )}

      {associations.length > 0 && (
        <Section title="Associations">
          <DataTable
            head={['Associated artifact']}
            rows={associations.map((v) => [<span key="v" className="font-mono">{v}</span>])}
          />
        </Section>
      )}
    </div>
  );
}

export function ArtifactCard({ data }: { data: LookupResponse }) {
  const artifact = normalizeArtifact(data);
  // VPN/Proxy/Tor are ALWAYS shown for an IP — present-and-honest (real YES/NO, or explicit
  // unknown), never present-only-hidden and never a fabricated NO. For non-IPs (no anonymizer
  // concept) the old present-only YES chips stay.
  const isIp = data.detected_type === 'ip';

  const header = (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <DetectedTypeBadge type={data.detected_type} recognized={data.recognized} />
          <span className="break-all font-mono text-body-lg font-semibold text-foreground">
            {data.indicator}
          </span>
        </div>
        <ExternalClaimBadge className="shrink-0" />
      </div>
      {(artifact.verdict || isIp || artifact.anonymizers.length > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          {artifact.verdict && <VerdictPill verdict={artifact.verdict} />}
          {isIp
            ? ANONYMIZER_ORDER.map((kind) => (
                <AnonymizerStatusPill
                  key={kind}
                  label={ANONYMIZER_LABELS[kind]}
                  state={artifact.anonymizerStatus[kind]}
                />
              ))
            : artifact.anonymizers.map((a) => <AnonymizerChip key={a.kind} label={a.label} />)}
        </div>
      )}
      {/* Cloud / Hosting — always visible for an IP, derived from real isp/usage_type metadata. */}
      {isIp && <CloudHostingRows cloud={artifact.cloudHosting} />}
    </div>
  );

  // Honest empty: nothing came back from any source — one clean line, NOT a fabricated card body.
  if (!artifact.hasData) {
    return (
      <Card>
        <CardHeader>{header}</CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-caption text-muted-foreground">
            <CircleSlash className="size-4 shrink-0" aria-hidden />
            No intelligence found — every source was reached with no record, or was unavailable.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>{header}</CardHeader>
      <CardContent>
        <ArtifactSections artifact={artifact} />
      </CardContent>
    </Card>
  );
}
