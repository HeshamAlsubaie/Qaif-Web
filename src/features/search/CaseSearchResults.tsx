import {
  BadgeCheck,
  Boxes,
  CircleDashed,
  Folder,
  HardDrive,
  Inbox,
  type LucideIcon,
} from 'lucide-react';
import * as React from 'react';

import { EmptyState } from '@/components/common/States';
import { TierBadge } from '@/components/forensic/TierBadge';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatInZone, formatUtc, isUtcZone } from '@/lib/format';
import type {
  SearchCaseHit,
  SearchEntityHit,
  SearchEvidenceHit,
  SearchFindingHit,
  SearchResponse,
} from '@/types/api';

/**
 * Case-search results. These are INTERNAL case data — confirmed and probabilistic case findings —
 * NOT external claims: they use {@link TierBadge}, never the ExternalClaimBadge, so the
 * external-vs-internal line the Search view draws stays intact.
 *
 * R4 is STRUCTURAL here, mirroring the response: confirmed and probabilistic findings render as two
 * SEPARATE, visually distinct groups (cyan/solid vs amber/dashed), never one merged list with a
 * badge. The tiers cannot be conflated by a rendering slip because they arrive — and stay — apart.
 */

type Accent = 'confirmed' | 'probabilistic' | 'neutral';

const ACCENT_ICON: Record<Accent, string> = {
  confirmed: 'text-confirmed',
  probabilistic: 'text-probabilistic',
  neutral: 'text-muted-foreground',
};

const ACCENT_TITLE: Record<Accent, string> = {
  confirmed: 'text-confirmed',
  probabilistic: 'text-probabilistic',
  neutral: 'text-foreground',
};

function CaseRef({ caseId }: { caseId: number }) {
  return <span className="font-mono text-micro text-muted-foreground">case #{caseId}</span>;
}

/** Describe the ORIGINAL recorded time as R8 provenance, distinct from the UTC instant. */
function describeOriginal(iso: string, tz: string): string {
  const zone = tz.trim();
  // A blank zone means the source did not record one — say so honestly, as the Timeline does.
  if (zone === '') return 'none recorded — UTC assumed';
  // Recorded in UTC ⇒ the original reading IS the UTC instant; do not fabricate a local time.
  if (isUtcZone(zone)) return 'recorded in UTC';
  const local = formatInZone(iso, zone);
  return local ? `recorded ${local} ${zone}` : `original zone ${zone}`;
}

/**
 * R8: the reconciled UTC instant and the original recorded time are shown as TWO DISTINCT facts —
 * never one clock under two zone labels (the previous bug), never a local time implied to be UTC.
 * The UTC instant is always shown, explicitly labelled UTC (the reconciliation basis); the original
 * zone follows as provenance. Mirrors the Timeline view's proven R8 formatting.
 */
function Stamp({ iso, tz, label }: { iso: string; tz: string; label: string }) {
  return (
    <span className="text-micro tabular-nums text-muted-foreground">
      {label} <span className="text-foreground">{formatUtc(iso)}</span> ·{' '}
      {describeOriginal(iso, tz)}
    </span>
  );
}

/**
 * A platform-generated timestamp with NO original-tz companion (e.g. a case's opened_at). R8's
 * provenance requirement is about INGESTED data, not platform clocks — so this is simply the UTC
 * instant, labelled UTC. No original zone is shown because none exists (never invented).
 */
function UtcStamp({ iso, label }: { iso: string; label: string }) {
  return (
    <span className="text-micro tabular-nums text-muted-foreground">
      {label} <span className="text-foreground">{formatUtc(iso)}</span>
    </span>
  );
}

function Group({
  icon: Icon,
  title,
  count,
  accent,
  truncated,
  children,
}: {
  icon: LucideIcon;
  title: string;
  count: number;
  accent: Accent;
  truncated?: boolean;
  children: React.ReactNode;
}) {
  if (count === 0) return null;
  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2 space-y-0">
        <Icon className={cn('size-4', ACCENT_ICON[accent])} aria-hidden />
        <span className={cn('text-h4 leading-none tracking-tight', ACCENT_TITLE[accent])}>
          {title}
        </span>
        <span className="text-caption tabular-nums text-muted-foreground">· {count}</span>
        {truncated && (
          <span className="text-micro italic text-muted-foreground">showing first {count}</span>
        )}
      </CardHeader>
      <CardContent className="flex flex-col divide-y divide-border/60 p-0">{children}</CardContent>
    </Card>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-1 px-4 py-3">{children}</div>;
}

function FindingRow({ f }: { f: SearchFindingHit }) {
  return (
    <Row>
      <div className="flex items-start justify-between gap-3">
        <span className="font-medium text-foreground">{f.title}</span>
        <TierBadge
          tier={f.tier}
          confidence={f.tier === 'probabilistic' ? f.confidence : null}
          className="shrink-0"
        />
      </div>
      <span className="type-caption">{f.description}</span>
      {f.tier === 'probabilistic' && (f.method_description || f.limitations) && (
        <span className="text-micro text-muted-foreground">
          {f.method_description && (
            <>
              <span className="font-semibold uppercase tracking-wide">Method:</span>{' '}
              {f.method_description}
            </>
          )}
          {f.method_description && f.limitations && ' · '}
          {f.limitations && (
            <>
              <span className="font-semibold uppercase tracking-wide">Limits:</span> {f.limitations}
            </>
          )}
        </span>
      )}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-mono text-micro text-muted-foreground">{f.module_id}</span>
        <Badge variant="muted">{f.severity}</Badge>
        <CaseRef caseId={f.case_id} />
        <Stamp iso={f.observed_at} tz={f.observed_at_original_tz} label="observed" />
      </div>
    </Row>
  );
}

function EntityRow({ e }: { e: SearchEntityHit }) {
  return (
    <Row>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <span className="break-all font-mono text-foreground">{e.value}</span>
          {e.normalized_value !== e.value && (
            <span className="break-all font-mono text-micro text-muted-foreground">
              norm: {e.normalized_value}
            </span>
          )}
        </div>
        <TierBadge
          tier={e.tier}
          confidence={e.tier === 'probabilistic' ? e.confidence : null}
          className="shrink-0"
        />
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Badge variant="outline">{e.entity_type}</Badge>
        <CaseRef caseId={e.case_id} />
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <Stamp iso={e.first_seen} tz={e.first_seen_original_tz} label="first seen" />
        <Stamp iso={e.last_seen} tz={e.last_seen_original_tz} label="last seen" />
      </div>
    </Row>
  );
}

function EvidenceRow({ e }: { e: SearchEvidenceHit }) {
  return (
    <Row>
      <span className="font-medium text-foreground">{e.original_filename}</span>
      <span className="break-all font-mono text-micro text-muted-foreground">{e.sha256}</span>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Badge variant="outline">{e.evidence_type}</Badge>
        {e.source_description && (
          <span className="text-micro text-muted-foreground">{e.source_description}</span>
        )}
        <CaseRef caseId={e.case_id} />
        <Stamp iso={e.acquired_at} tz={e.acquired_at_original_tz} label="acquired" />
      </div>
    </Row>
  );
}

function CaseRow({ c }: { c: SearchCaseHit }) {
  return (
    <Row>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-foreground">{c.case_number}</span>
        <span className="text-foreground">{c.title}</span>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Badge variant="outline">{c.classification}</Badge>
        <Badge variant="muted">{c.status}</Badge>
        <CaseRef caseId={c.case_id} />
        <UtcStamp iso={c.opened_at} label="opened" />
      </div>
    </Row>
  );
}

export function CaseSearchResults({ data }: { data: SearchResponse }) {
  const total =
    data.cases.length +
    data.evidence.length +
    data.entities.length +
    data.findings_confirmed.length +
    data.findings_probabilistic.length;

  if (total === 0) {
    return (
      <Card>
        <EmptyState
          icon={Inbox}
          title="No matches"
          message={
            <>
              Nothing across all cases matches{' '}
              <span className="font-mono text-foreground">{data.query}</span>.
            </>
          }
        />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <span className="type-caption">
        {total} match{total === 1 ? '' : 'es'} for{' '}
        <span className="font-mono text-foreground">{data.query}</span> across all cases.
      </span>

      {/* R4: confirmed and probabilistic findings are two DISTINCT groups, never merged. */}
      <Group
        icon={BadgeCheck}
        title="Confirmed findings"
        count={data.findings_confirmed.length}
        accent="confirmed"
        truncated={data.truncated.findings_confirmed}
      >
        {data.findings_confirmed.map((f) => (
          <FindingRow key={`c-${f.finding_id}`} f={f} />
        ))}
      </Group>

      <Group
        icon={CircleDashed}
        title="Probabilistic findings"
        count={data.findings_probabilistic.length}
        accent="probabilistic"
        truncated={data.truncated.findings_probabilistic}
      >
        {data.findings_probabilistic.map((f) => (
          <FindingRow key={`p-${f.finding_id}`} f={f} />
        ))}
      </Group>

      <Group
        icon={Boxes}
        title="Entities"
        count={data.entities.length}
        accent="neutral"
        truncated={data.truncated.entities}
      >
        {data.entities.map((e) => (
          <EntityRow key={e.entity_id} e={e} />
        ))}
      </Group>

      <Group
        icon={HardDrive}
        title="Evidence"
        count={data.evidence.length}
        accent="neutral"
        truncated={data.truncated.evidence}
      >
        {data.evidence.map((e) => (
          <EvidenceRow key={e.evidence_id} e={e} />
        ))}
      </Group>

      <Group
        icon={Folder}
        title="Cases"
        count={data.cases.length}
        accent="neutral"
        truncated={data.truncated.cases}
      >
        {data.cases.map((c) => (
          <CaseRow key={c.case_id} c={c} />
        ))}
      </Group>
    </div>
  );
}
