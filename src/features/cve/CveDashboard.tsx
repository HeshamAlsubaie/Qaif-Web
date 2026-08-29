/**
 * The CVE dashboard — a VirusTotal-style detailed view rendered when `POST /lookup` returns
 * detected_type === 'cve'. It layers the authoritative NVD record (CVSS, KEV, description, products,
 * references) with OTX/VT threat-intel context and an honest 5-source status row.
 *
 * Forensic discipline carried throughout:
 *   - every datum is an EXTERNAL-SOURCE CLAIM (the lookup Zod boundary pinned tier/confirmed) — NVD
 *     is authoritative but still a claim, badged as such;
 *   - nothing is fabricated: absent data OMITS its section; not_found / not_configured render as
 *     honest states, never blank scaffolding or invented values;
 *   - severity uses its OWN purple→blue color axis (see cveSeverity.ts), deliberately separate from
 *     the reserved forensic hues (cyan/amber tiers, red integrity);
 *   - dates are shown as the UTC instant NVD recorded (R8), via the shared formatUtc helper.
 */
import {
  AlertTriangle,
  Boxes,
  CalendarClock,
  CircleAlert,
  CircleCheck,
  CircleSlash,
  ExternalLink,
  Link2,
  Radar,
  Unplug,
  type LucideIcon,
} from 'lucide-react';
import * as React from 'react';

import { ExternalClaimBadge } from '@/components/forensic/ExternalClaimBadge';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatUtc } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { CveNvdMetadata, CveOtxContext, CveVtContext, LookupResponse } from '@/types/api';

import { asUtcIso, buildCveModel, parseCpe, type CveModel, type CveSourceStatus } from './cveModel';
import { normalizeSeverity, severityStyle } from './cveSeverity';

// -- 1. header ---------------------------------------------------------------

function DateStat({ label, iso }: { label: string; iso: string }) {
  // NVD records in UTC; formatUtc appends the "UTC" label, so the zone is shown once (not doubled).
  return (
    <span className="inline-flex items-center gap-1.5">
      <CalendarClock className="size-3.5 text-muted-foreground" aria-hidden />
      <span className="type-label">{label}</span>
      <span className="font-mono text-caption text-foreground">{formatUtc(asUtcIso(iso))}</span>
    </span>
  );
}

function DashboardHeader({ model }: { model: CveModel }) {
  const nvd = model.nvd;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="type-h2 font-mono">{model.cveId}</h2>
        {nvd?.vuln_status && <Badge variant="outline">{nvd.vuln_status}</Badge>}
      </div>
      {nvd && (nvd.published || nvd.last_modified) && (
        <div className="flex flex-wrap gap-x-6 gap-y-1">
          {nvd.published && <DateStat label="Published" iso={nvd.published} />}
          {nvd.last_modified && <DateStat label="Last modified" iso={nvd.last_modified} />}
        </div>
      )}
    </div>
  );
}

// -- 2. CVSS severity band ---------------------------------------------------

function CvssBand({ cvss }: { cvss: NonNullable<CveNvdMetadata['cvss']> }) {
  const severity = normalizeSeverity(cvss.severity, cvss.base_score);
  const style = severityStyle(severity);
  const hasScore = typeof cvss.base_score === 'number';
  const score = hasScore ? (cvss.base_score as number).toFixed(1) : '—';
  const pct = hasScore ? Math.max(0, Math.min(100, (cvss.base_score as number) * 10)) : 0;
  const meta = [cvss.version ? `CVSS v${cvss.version}` : null, cvss.type, cvss.source]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className={cn('rounded-lg border p-5', style.band)}>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-baseline gap-1.5">
          <span className={cn('text-display leading-none tabular-nums', style.score)}>{score}</span>
          <span className="type-caption">/ 10</span>
        </div>
        <div className="flex flex-col gap-1">
          <span
            className={cn(
              'inline-flex w-fit items-center rounded-md border px-2 py-0.5 text-micro font-semibold uppercase tracking-wide',
              style.chip,
            )}
          >
            {style.label} severity
          </span>
          {meta && <span className="text-micro text-muted-foreground">{meta}</span>}
        </div>
      </div>

      {hasScore && (
        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
          <div className={cn('h-full rounded-full', style.bar)} style={{ width: `${pct}%` }} aria-hidden />
        </div>
      )}

      {cvss.vector && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="type-label">Vector</span>
          <code className="break-all rounded bg-surface-0 px-2 py-1 font-mono text-micro text-foreground">
            {cvss.vector}
          </code>
        </div>
      )}
    </div>
  );
}

// -- 3. CISA KEV callout -----------------------------------------------------

function KevCallout({ kev }: { kev: NonNullable<CveNvdMetadata['cisa_kev']> }) {
  const [open, setOpen] = React.useState(false);
  const action = kev.cisa_required_action ?? '';
  const isLong = action.length > 180;
  const shown = open || !isLong ? action : `${action.slice(0, 180)}…`;

  // KEV — the single most decision-relevant signal — uses the severity-PURPLE axis (violet), made
  // prominent WITHOUT the reserved integrity-red. Violet keeps it on the "how dangerous" axis.
  return (
    <div className="rounded-lg border border-violet-400/60 bg-violet-500/15 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-violet-200" aria-hidden />
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-body-lg font-bold text-violet-100">
            Known Exploited — listed in CISA KEV
          </span>
          {kev.cisa_vulnerability_name && (
            <span className="text-caption text-foreground">{kev.cisa_vulnerability_name}</span>
          )}
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-micro text-muted-foreground">
            {kev.cisa_exploit_add && (
              <span>
                <span className="type-label">Added</span>{' '}
                <span className="font-mono text-foreground">{kev.cisa_exploit_add}</span>
              </span>
            )}
            {kev.cisa_action_due && (
              <span>
                <span className="type-label">Remediation due</span>{' '}
                <span className="font-mono text-foreground">{kev.cisa_action_due}</span>
              </span>
            )}
          </div>
          {action && (
            <div className="mt-1">
              <p className="text-caption leading-relaxed text-foreground">{shown}</p>
              {isLong && (
                <button
                  type="button"
                  onClick={() => setOpen((o) => !o)}
                  className="mt-1 text-micro font-medium text-violet-200 hover:underline"
                >
                  {open ? 'Show less' : 'Show required action'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// -- 5 & 6. disclosed lists (products, references) ---------------------------

function DisclosureCount({ shown, total, noun }: { shown: number; total: number; noun: string }) {
  const truncated = total > shown;
  return (
    <span className="text-micro tabular-nums text-muted-foreground">
      Showing {shown.toLocaleString()} of {total.toLocaleString()} {noun}
      {truncated && (
        <span className="ml-1 text-foreground/70">
          · {(total - shown).toLocaleString()} more capped at source
        </span>
      )}
    </span>
  );
}

function AffectedProducts({ products, total }: { products: string[]; total: number }) {
  if (products.length === 0) return null;
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="flex items-center gap-2 text-body-lg">
          <Boxes className="size-4" aria-hidden />
          Affected products
        </CardTitle>
        <DisclosureCount shown={products.length} total={total} noun="products" />
      </CardHeader>
      <CardContent className="flex flex-col divide-y divide-border/40">
        {products.map((cpe, i) => {
          const p = parseCpe(cpe);
          const named = p.vendor || p.product;
          return (
            <div key={`${cpe}-${i}`} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 py-1.5">
              {named ? (
                <>
                  <span className="text-caption font-medium text-foreground">
                    {[p.vendor, p.product].filter(Boolean).join(' ')}
                  </span>
                  {p.version && (
                    <span className="font-mono text-micro text-muted-foreground">v{p.version}</span>
                  )}
                  <code
                    className="ml-auto max-w-[55%] truncate font-mono text-micro text-muted-foreground/60"
                    title={cpe}
                  >
                    {cpe}
                  </code>
                </>
              ) : (
                <code className="break-all font-mono text-micro text-foreground">{cpe}</code>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function References({ refs, total }: { refs: string[]; total: number }) {
  if (refs.length === 0) return null;
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="flex items-center gap-2 text-body-lg">
          <Link2 className="size-4" aria-hidden />
          References
        </CardTitle>
        <DisclosureCount shown={refs.length} total={total} noun="references" />
      </CardHeader>
      <CardContent className="flex flex-col gap-1.5">
        {refs.map((url, i) => (
          <a
            key={`${url}-${i}`}
            href={url}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1.5 text-caption text-primary hover:underline"
          >
            <ExternalLink className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{url}</span>
          </a>
        ))}
      </CardContent>
    </Card>
  );
}

// -- 7. threat-intel context -------------------------------------------------

// OTX lists are noisy (a popular CVE draws dozens of pulses) — that noise is OTX's data quality, not
// ours, so we report VERBATIM, first-N ordering, NEVER filtering or judging WHICH items show. We just
// cap the COUNT and disclose the total, the same bound-and-disclose pattern as products/references.
const OTX_LIST_CAP = 10;

function DisclosedTagList({
  label,
  noun,
  items,
  total,
}: {
  label: string;
  noun: string;
  items: string[];
  total: number;
}) {
  if (items.length === 0) return null;
  const shown = items.slice(0, OTX_LIST_CAP);
  const capped = total > shown.length;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="type-label">{label}</span>
        {capped && <DisclosureCount shown={shown.length} total={total} noun={noun} />}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {shown.map((item, i) => (
          <span
            key={`${item}-${i}`}
            className="rounded border border-border bg-surface-2 px-1.5 py-0.5 text-micro text-foreground"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function OtxContext({ otx }: { otx: CveOtxContext }) {
  // `pulse_count` is the TRUE total from OTX; `pulses` is already source-bounded. Disclose against
  // the true total for pulses; for the family/actor lists we only have the returned set, so disclose
  // against its length (still honest: "N of {what we received}", capped for legibility).
  const pulseTotal = otx.pulse_count ?? otx.pulses.length;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="type-label">OTX</span>
        <span className="text-caption text-muted-foreground">
          {pulseTotal.toLocaleString()} pulse{pulseTotal === 1 ? '' : 's'} discussing this CVE
        </span>
      </div>
      <DisclosedTagList
        label="Threat actors"
        noun="actors"
        items={otx.adversaries}
        total={otx.adversaries.length}
      />
      <DisclosedTagList
        label="Malware families"
        noun="families"
        items={otx.malware_families}
        total={otx.malware_families.length}
      />
      <DisclosedTagList label="Pulses" noun="pulses" items={otx.pulses} total={pulseTotal} />
    </div>
  );
}

function VtContext({ vt }: { vt: CveVtContext }) {
  const counts = Object.entries(vt.related_counts);
  return (
    <div className="flex flex-col gap-2 border-t border-border/50 pt-3">
      <span className="type-label">VirusTotal</span>
      {vt.description && <p className="text-caption text-foreground">{vt.description}</p>}
      {counts.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {counts.map(([key, value]) => (
            <span
              key={key}
              className="rounded border border-border bg-surface-2 px-1.5 py-0.5 text-micro text-muted-foreground"
            >
              {key.replace(/_/g, ' ')}: <span className="font-mono text-foreground">{value}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ThreatIntel({ otx, vt }: { otx: CveOtxContext | null; vt: CveVtContext | null }) {
  const hasOtx =
    otx !== null &&
    ((otx.pulse_count ?? 0) > 0 ||
      otx.pulses.length > 0 ||
      otx.malware_families.length > 0 ||
      otx.adversaries.length > 0);
  const hasVt =
    vt !== null && (Boolean(vt.description) || Object.keys(vt.related_counts).length > 0);
  if (!hasOtx && !hasVt) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-body-lg">
            <Radar className="size-4" aria-hidden />
            Threat intelligence
          </CardTitle>
          <ExternalClaimBadge className="shrink-0" />
        </div>
        <CardDescription>
          In-the-wild context layered on the authoritative record — who is discussing or exploiting
          this CVE.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {hasOtx && otx && <OtxContext otx={otx} />}
        {hasVt && vt && <VtContext vt={vt} />}
      </CardContent>
    </Card>
  );
}

// -- 8. source status row ----------------------------------------------------

interface StatusStyle {
  label: string;
  icon: LucideIcon;
  className: string;
}

// Calm, non-alarming — the same grammar as the IOC-search source cards. `ok` uses the blue chrome
// accent (informative, NOT a forensic tier hue); everything else is neutral slate, distinguished by
// icon + label, not colour. `not_configured` is a first-class, honest state (a dormant source), NOT
// an error and NOT hidden — no red anywhere: an unreachable/dormant source is expected, not a break.
const STATUS_STYLES: Record<string, StatusStyle> = {
  ok: { label: 'Has data', icon: CircleCheck, className: 'border-primary/40 bg-primary/10 text-primary' },
  not_found: {
    label: 'No data',
    icon: CircleSlash,
    className: 'border-border bg-surface-2 text-muted-foreground',
  },
  not_configured: {
    label: 'Not configured',
    icon: Unplug,
    className: 'border-dashed border-border bg-surface-2 text-muted-foreground',
  },
  error: {
    label: 'Unavailable',
    icon: CircleAlert,
    className: 'border-border bg-surface-2 text-muted-foreground',
  },
};

const FALLBACK_STATUS: StatusStyle = {
  label: 'Unknown',
  icon: CircleSlash,
  className: 'border-border bg-surface-2 text-muted-foreground',
};

function SourceStatusChip({ source }: { source: CveSourceStatus }) {
  const style = STATUS_STYLES[source.status] ?? FALLBACK_STATUS;
  const Icon = style.icon;
  // Vertical layout: the source NAME gets its own full-width row (no truncate), so a dormant
  // source is always identifiable — the wider "Not configured" pill + external-claim badge sit on
  // the row BELOW and wrap, instead of squeezing "MISP"/"OpenCTI" down to a single clipped letter.
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-surface-1 px-3 py-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-caption font-medium text-foreground">{source.source}</span>
        <span className="shrink-0 text-micro text-muted-foreground">{source.family}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-micro font-semibold leading-none',
            style.className,
          )}
        >
          <Icon className="size-3 shrink-0" aria-hidden />
          {style.label}
        </span>
        <ExternalClaimBadge />
      </div>
    </div>
  );
}

function SourceStatusRow({ sources }: { sources: CveSourceStatus[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-body-lg">Sources</CardTitle>
        <CardDescription>
          Every source is a third-party CLAIM — NVD is authoritative but still an external claim, not
          confirmed QAIF evidence. A dormant source (unset URL/credential) reads as “not configured”:
          an honest state, never an error and never hidden.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {sources.map((s) => (
            <SourceStatusChip key={s.source} source={s} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// -- orchestrator ------------------------------------------------------------

export function CveDashboard({ data }: { data: LookupResponse }) {
  const model = React.useMemo(() => buildCveModel(data), [data]);
  const nvd = model.nvd;

  return (
    <div className="flex flex-col gap-4">
      <DashboardHeader model={model} />

      {nvd?.cvss && <CvssBand cvss={nvd.cvss} />}
      {nvd?.cisa_kev?.known_exploited && <KevCallout kev={nvd.cisa_kev} />}

      {!nvd && (
        <div className="flex items-start gap-2 rounded-md border border-border bg-surface-2 px-3 py-2.5 text-caption text-muted-foreground">
          <CircleSlash className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            NVD returned no authoritative record for this id (see the source status below). The CVE
            may be reserved, rejected, or unknown to NVD — nothing is inferred in its place.
          </span>
        </div>
      )}

      {nvd?.description && (
        <Card>
          <CardHeader>
            <CardTitle className="text-body-lg">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-body leading-relaxed text-foreground">{nvd.description}</p>
          </CardContent>
        </Card>
      )}

      {nvd && (
        <AffectedProducts products={nvd.affected_products} total={nvd.affected_products_total} />
      )}
      {nvd && <References refs={nvd.references} total={nvd.references_total} />}

      <ThreatIntel otx={model.otx} vt={model.vt} />
      <SourceStatusRow sources={model.sources} />
    </div>
  );
}
