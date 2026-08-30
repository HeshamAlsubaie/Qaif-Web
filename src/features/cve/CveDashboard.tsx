/**
 * The CVE card — the artifact-card treatment for a `POST /lookup` with detected_type === 'cve'. One
 * card per CVE, source-agnostic: the authoritative NVD record and the in-the-wild context are merged
 * into normalized sections (CVSS, KEV, affected products, references, threat intel), never headlined
 * by source name. Data only — no prose, no descriptions, present-only (an absent section is omitted).
 *
 * Forensic discipline kept: the whole card is an EXTERNAL-SOURCE CLAIM (the lookup Zod boundary
 * pinned tier/confirmed), badged with the {@link ExternalClaimBadge} — never confirmed QAIF evidence.
 * Severity uses its OWN purple→blue axis (cveSeverity.ts), separate from the reserved forensic hues.
 * Dates are the UTC instant NVD recorded (R8), via formatUtc.
 */
import { AlertTriangle, Boxes, CalendarClock, CircleSlash, Link2, Radar } from 'lucide-react';
import * as React from 'react';

import { ExternalClaimBadge } from '@/components/forensic/ExternalClaimBadge';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatUtc } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { CveNvdMetadata, CveOtxContext, CveVtContext, LookupResponse } from '@/types/api';

import { asUtcIso, buildCveModel, parseCpe, type CveModel } from './cveModel';
import { normalizeSeverity, severityStyle } from './cveSeverity';

// -- shared table + section primitives (the artifact-card visual language) ----

function Section({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="text-micro font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

function DataTable({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
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
      {items.map((item, i) => (
        <span
          key={`${item}-${i}`}
          className="inline-flex items-center rounded-md border border-border bg-surface-2 px-2 py-0.5 text-micro text-foreground"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

// A disclosed count ("showing N of M") — a truncation disclosure, not prose; never a silent cap.
function DisclosureCount({ shown, total, noun }: { shown: number; total: number; noun: string }) {
  if (total <= shown) return null;
  return (
    <span className="text-micro tabular-nums text-muted-foreground">
      {shown.toLocaleString()} of {total.toLocaleString()} {noun}
    </span>
  );
}

// -- header ------------------------------------------------------------------

function DateStat({ label, iso }: { label: string; iso: string }) {
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
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="type-h2 font-mono">{model.cveId}</h2>
          {nvd?.vuln_status && <Badge variant="outline">{nvd.vuln_status}</Badge>}
        </div>
        <ExternalClaimBadge className="shrink-0" />
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

// -- CVSS severity band ------------------------------------------------------

function CvssBand({ cvss }: { cvss: NonNullable<CveNvdMetadata['cvss']> }) {
  const severity = normalizeSeverity(cvss.severity, cvss.base_score);
  const style = severityStyle(severity);
  const hasScore = typeof cvss.base_score === 'number';
  const score = hasScore ? (cvss.base_score as number).toFixed(1) : '—';
  const pct = hasScore ? Math.max(0, Math.min(100, (cvss.base_score as number) * 10)) : 0;
  const meta = [cvss.version ? `CVSS v${cvss.version}` : null, cvss.type].filter(Boolean).join(' · ');

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

// -- CISA KEV flag (flag + dates only, no prose) -----------------------------

function KevCallout({ kev }: { kev: NonNullable<CveNvdMetadata['cisa_kev']> }) {
  return (
    <div className="rounded-lg border border-violet-400/60 bg-violet-500/15 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-violet-200" aria-hidden />
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-body-lg font-bold text-violet-100">
            Known Exploited — CISA KEV
          </span>
          {kev.cisa_vulnerability_name && (
            <span className="font-mono text-caption text-foreground">
              {kev.cisa_vulnerability_name}
            </span>
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
        </div>
      </div>
    </div>
  );
}

// -- affected products (table) -----------------------------------------------

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
      <CardContent>
        <DataTable
          head={['Vendor', 'Product', 'Version', 'CPE']}
          rows={products.map((cpe) => {
            const p = parseCpe(cpe);
            return [
              <span key="ve">{p.vendor ?? '—'}</span>,
              <span key="pr">{p.product ?? '—'}</span>,
              <span key="vs" className="font-mono">{p.version ?? '—'}</span>,
              <code key="cpe" className="break-all font-mono text-micro text-muted-foreground">
                {cpe}
              </code>,
            ];
          })}
        />
      </CardContent>
    </Card>
  );
}

// -- references (table) ------------------------------------------------------

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
      <CardContent>
        <DataTable
          head={['Reference']}
          rows={refs.map((url) => [
            <a
              key="u"
              href={url}
              target="_blank"
              rel="noreferrer noopener"
              className="break-all text-primary hover:underline"
            >
              {url}
            </a>,
          ])}
        />
      </CardContent>
    </Card>
  );
}

// -- threat intelligence (normalized chips, no source names) -----------------

const TAG_CAP = 10;

function ThreatIntel({ otx, vt }: { otx: CveOtxContext | null; vt: CveVtContext | null }) {
  const pulseTotal = otx ? (otx.pulse_count ?? otx.pulses.length) : 0;
  const relatedCounts = vt ? Object.entries(vt.related_counts) : [];

  const hasActors = (otx?.adversaries.length ?? 0) > 0;
  const hasFamilies = (otx?.malware_families.length ?? 0) > 0;
  const hasPulses = pulseTotal > 0 || (otx?.pulses.length ?? 0) > 0;
  const hasRelated = relatedCounts.length > 0;
  if (!hasActors && !hasFamilies && !hasPulses && !hasRelated) return null;

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
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {hasActors && otx && (
          <Section
            title="Threat actors"
            aside={<DisclosureCount shown={Math.min(TAG_CAP, otx.adversaries.length)} total={otx.adversaries.length} noun="actors" />}
          >
            <ChipRow items={otx.adversaries.slice(0, TAG_CAP)} />
          </Section>
        )}
        {hasFamilies && otx && (
          <Section
            title="Malware families"
            aside={<DisclosureCount shown={Math.min(TAG_CAP, otx.malware_families.length)} total={otx.malware_families.length} noun="families" />}
          >
            <ChipRow items={otx.malware_families.slice(0, TAG_CAP)} />
          </Section>
        )}
        {hasPulses && otx && (
          <Section
            title="Pulses"
            aside={<DisclosureCount shown={Math.min(TAG_CAP, otx.pulses.length)} total={pulseTotal} noun="pulses" />}
          >
            <ChipRow items={otx.pulses.slice(0, TAG_CAP)} />
          </Section>
        )}
        {hasRelated && (
          <Section title="Related artifacts">
            <DataTable
              head={['Kind', 'Count']}
              rows={relatedCounts.map(([key, value]) => [
                <span key="k">{key.replace(/_/g, ' ')}</span>,
                <span key="v" className="font-mono tabular-nums">{value}</span>,
              ])}
            />
          </Section>
        )}
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
        <div className="flex items-center gap-2 rounded-md border border-border bg-surface-2 px-3 py-2.5 text-caption text-muted-foreground">
          <CircleSlash className="size-4 shrink-0" aria-hidden />
          No authoritative record found for this id.
        </div>
      )}

      {nvd?.description && (
        <Card>
          <CardHeader>
            <CardTitle className="text-body-lg">Description</CardTitle>
          </CardHeader>
          <CardContent>
            {/* The vulnerability definition — data (what the CVE is), not UI prose. */}
            <p className="text-body leading-relaxed text-foreground">{nvd.description}</p>
          </CardContent>
        </Card>
      )}

      {nvd && (
        <AffectedProducts products={nvd.affected_products} total={nvd.affected_products_total} />
      )}
      {nvd && <References refs={nvd.references} total={nvd.references_total} />}

      <ThreatIntel otx={model.otx} vt={model.vt} />
    </div>
  );
}
