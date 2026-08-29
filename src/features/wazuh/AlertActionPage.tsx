import {
  ArrowLeft,
  ArrowUpRight,
  FileCode2,
  Fingerprint,
  FilePlus2,
  Search,
  ShieldAlert,
  Target,
} from 'lucide-react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';

import { useRole } from '@/app/RoleContext';
import { InvestigatorOnly } from '@/components/common/InvestigatorOnly';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/States';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatUtc } from '@/lib/format';
import type { WazuhAlert, WazuhIndicator, WazuhMitre } from '@/types/api';

import { severityBand } from './severity';

// File PATHS (and anything we can't recognise) are forensic context, NOT reputation-lookup targets —
// they render as non-clickable artifacts. Every other extracted type is a searchable pivot.
const ARTIFACT_TYPES = new Set(['file_path', 'unknown']);

const TYPE_LABEL: Record<string, string> = {
  file_hash: 'hash',
  ip: 'ip',
  domain: 'domain',
  url: 'url',
  file_path: 'path',
};

function isSearchable(type: string): boolean {
  return !ARTIFACT_TYPES.has(type);
}

function typeLabel(type: string): string {
  return TYPE_LABEL[type] ?? type;
}

/** Name the hash algorithm from the digest length — honest (derived from the value), never assumed. */
function hashAlgo(value: string): string | null {
  if (value.length === 64) return 'SHA-256';
  if (value.length === 40) return 'SHA-1';
  if (value.length === 32) return 'MD5';
  return null;
}

/** True only when the rule actually carries a MITRE mapping with at least one value. */
function hasMitre(mitre: WazuhMitre | null | undefined): mitre is WazuhMitre {
  return (
    !!mitre && (mitre.id.length > 0 || mitre.tactic.length > 0 || mitre.technique.length > 0)
  );
}

/**
 * The alert action page — "what do you want to do with this signal?". Reached by clicking an alert
 * in the feed; the alert travels via router state (the feed is the source of truth — there is no
 * get-one-alert read). It shows the full alert (rule, agent, both R8 timestamps, raw log, extracted
 * indicators) and offers LAUNCH actions:
 *   - Search an extracted indicator → the universal search (free `/lookup` + `/match`), pre-filled.
 *   - Open a case for this alert → the Stage-3 open-case form, pre-seeded from the alert.
 * An alert is NOT evidence and NOT custody — these are launches, not collection. If the page is
 * loaded without the alert (a reload/deep-link), it says so honestly and points back to the feed.
 */
export function AlertActionPage() {
  const location = useLocation();
  const params = useParams();
  const alert = (location.state as { alert?: WazuhAlert } | null)?.alert;

  // Deep-link / reload with no carried alert: be honest, don't fabricate one from the id.
  if (!alert) {
    return (
      <>
        <PageHeader kicker="Wazuh alert" title="Alert not loaded" />
        <Card>
          <EmptyState
            icon={ShieldAlert}
            title="This alert wasn’t carried into the page"
            message={
              <>
                Alert <span className="font-mono">{params.id}</span> must be opened from the live
                feed (the feed is the source of truth — there is no single-alert lookup). Head back
                and click it again.
              </>
            }
          />
          <div className="flex justify-center pb-6">
            <Button asChild variant="outline" size="sm">
              <Link to="/alerts">
                <ArrowLeft aria-hidden />
                Back to alerts
              </Link>
            </Button>
          </div>
        </Card>
      </>
    );
  }

  return <AlertActions alert={alert} />;
}

function AlertActions({ alert }: { alert: WazuhAlert }) {
  const band = severityBand(alert.rule.level);

  return (
    <>
      <PageHeader
        kicker="Wazuh alert · launch action"
        title={alert.rule.description}
        sub="A Wazuh alert is a signal, not evidence. Choose how to investigate it — nothing here is under chain of custody."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/alerts">
              <ArrowLeft aria-hidden />
              Back to alerts
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-5">
        {/* Alert detail. */}
        <Card>
          <CardHeader className="flex-row flex-wrap items-center gap-3 space-y-0">
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded border px-2 py-0.5 text-caption leading-none',
                band.pill,
              )}
            >
              <ShieldAlert className="size-3.5" aria-hidden />
              L{alert.rule.level ?? '?'} · {band.label}
            </span>
            <CardTitle className="text-body-lg">{alert.rule.description}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
              <Field label="Agent">
                <span className="font-mono">
                  {alert.agent.name} <span className="text-muted-foreground">({alert.agent.id})</span>
                </span>
              </Field>
              {alert.agent.ip && (
                <Field label="Agent IP">
                  <span className="font-mono">{alert.agent.ip}</span>
                </Field>
              )}
              <Field label="Rule ID">
                <span className="font-mono">{alert.rule.id}</span>
              </Field>
              <Field label="Alert ID">
                <span className="break-all font-mono text-caption">{alert.id}</span>
              </Field>
              {/* R8: the normalized UTC instant and the preserved original offset, side by side. */}
              <Field label="Time (UTC)">
                {alert.normalized_utc ? formatUtc(alert.normalized_utc) : '—'}
              </Field>
              <Field label="Original timestamp">
                <span className="break-all font-mono text-caption">
                  {alert.original_timestamp ?? 'unrecorded'}
                </span>
              </Field>
              {alert.index && (
                <Field label="Index">
                  <span className="break-all font-mono text-caption">{alert.index}</span>
                </Field>
              )}
            </div>

            {hasMitre(alert.rule.mitre) && <MitreBlock mitre={alert.rule.mitre} />}

            {alert.rule.groups.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Rule groups
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {alert.rule.groups.map((g) => (
                    <Badge key={g} variant="muted">
                      {g}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Raw log
              </span>
              <code className="break-all rounded-md border border-border bg-surface-0 p-2.5 text-caption text-foreground">
                {alert.full_log}
              </code>
            </div>
          </CardContent>
        </Card>

        <SearchAction alert={alert} />
        <OpenCaseAction alert={alert} />
      </div>
    </>
  );
}

/**
 * The rule's MITRE ATT&CK mapping — forensic CONTEXT carried verbatim from the alert, not a QAIF
 * attribution. Only sub-fields that are actually present render (technique / tactic / id), each as
 * neutral badges. The block is shown only when {@link hasMitre} — an alert without a mapping shows
 * nothing here, never an invented technique.
 */
function MitreBlock({ mitre }: { mitre: WazuhMitre }) {
  const rows = [
    { label: 'Technique', values: mitre.technique },
    { label: 'Tactic', values: mitre.tactic },
    { label: 'Technique ID', values: mitre.id },
  ].filter((row) => row.values.length > 0);

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-surface-0 p-3">
      <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Target className="size-3.5" aria-hidden />
        MITRE ATT&CK
      </span>
      <div className="flex flex-col gap-1.5">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-wrap items-baseline gap-1.5">
            <span className="w-24 shrink-0 text-caption text-muted-foreground">{row.label}</span>
            {row.values.map((value) => (
              <Badge key={value} variant="outline">
                {value}
              </Badge>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * The alert's extracted indicators as TYPED chips. A hash / IP / domain (etc.) is a click-to-search
 * PIVOT — clicking runs the free universal search (`/lookup` + `/match`) pre-filled, the same launch
 * the feed already uses. A file PATH is a non-clickable artifact, visually distinct, shown as context
 * only (a path is not a reputation lookup). If the alert carries none (routine alerts often don't),
 * that is said honestly, with the agent name offered as a starting search — never a silent no-op.
 */
function SearchAction({ alert }: { alert: WazuhAlert }) {
  const navigate = useNavigate();
  const runSearch = (query: string) => navigate('/', { state: { prefill: query } });

  const indicators = alert.extracted_indicators;
  const pivots = indicators.filter((ind) => isSearchable(ind.type));
  const artifacts = indicators.filter((ind) => !isSearchable(ind.type));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-body-lg">
          <Search className="size-4 text-primary" aria-hidden />
          Extracted indicators
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {indicators.length === 0 ? (
          <>
            <span className="type-caption">
              This alert carried no extracted indicators (routine alerts often don’t). You can still
              search the agent as a starting point.
            </span>
            <div>
              <Button variant="outline" size="sm" onClick={() => runSearch(alert.agent.name)}>
                <Search aria-hidden />
                Search agent <span className="font-mono">{alert.agent.name}</span>
              </Button>
            </div>
          </>
        ) : (
          <>
            <span className="type-caption">
              A hash, IP, or domain is a click-to-search pivot — it runs a free lookup across every
              enabled source (nothing is written). A file path is context only, not a lookup.
            </span>

            {pivots.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {pivots.map((ind) => (
                  <IndicatorPivot
                    key={`${ind.type}:${ind.value}`}
                    indicator={ind}
                    onSearch={runSearch}
                  />
                ))}
              </div>
            )}

            {artifacts.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  File artifacts · context only, not searchable
                </span>
                <div className="flex flex-wrap gap-2">
                  {artifacts.map((ind) => (
                    <ArtifactChip key={`${ind.type}:${ind.value}`} indicator={ind} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

/** A clickable pivot chip: runs the universal search on this indicator's value. */
function IndicatorPivot({
  indicator,
  onSearch,
}: {
  indicator: WazuhIndicator;
  onSearch: (query: string) => void;
}) {
  const algo = indicator.type === 'file_hash' ? hashAlgo(indicator.value) : null;
  const label = algo ? `${typeLabel(indicator.type)} · ${algo}` : typeLabel(indicator.type);

  return (
    <button
      type="button"
      onClick={() => onSearch(indicator.value)}
      title={`Search ${indicator.value}`}
      className="group inline-flex max-w-full items-center gap-1.5 rounded-md border border-border bg-surface-1 px-2.5 py-1.5 text-left transition-colors hover:border-primary/50 hover:bg-surface-2"
    >
      {indicator.type === 'file_hash' ? (
        <Fingerprint className="size-3.5 shrink-0 text-primary" aria-hidden />
      ) : (
        <Search className="size-3.5 shrink-0 text-primary" aria-hidden />
      )}
      <span className="max-w-[20rem] truncate font-mono text-caption text-foreground">
        {indicator.value}
      </span>
      <Badge variant="muted">{label}</Badge>
      <ArrowUpRight
        className="size-3 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
        aria-hidden
      />
    </button>
  );
}

/** A NON-clickable artifact chip (file path): forensic context, deliberately not a search pivot. */
function ArtifactChip({ indicator }: { indicator: WazuhIndicator }) {
  return (
    <span
      title={indicator.value}
      className="inline-flex max-w-full cursor-default items-center gap-1.5 rounded-md border border-dashed border-border bg-surface-2/50 px-2.5 py-1.5"
    >
      <FileCode2 className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <span className="max-w-[24rem] truncate font-mono text-caption text-muted-foreground">
        {indicator.value}
      </span>
      <Badge variant="outline">{typeLabel(indicator.type)}</Badge>
    </span>
  );
}

/**
 * Open a case FOR this alert. Pre-seeds the Stage-3 open-case form (title + mandatory R10 reason)
 * from the alert and navigates to it; the investigator reviews the pre-filled rationale and submits
 * the real `POST /cases` write there. Opening a case is where custody begins — this button only
 * launches it, it does not itself write.
 */
function OpenCaseAction({ alert }: { alert: WazuhAlert }) {
  const navigate = useNavigate();
  const { canWrite } = useRole();

  const title = `Wazuh alert ${alert.rule.id} on ${alert.agent.name}`;
  const reason = `Investigating Wazuh alert: ${alert.rule.description}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-body-lg">
          <FilePlus2 className="size-4 text-primary" aria-hidden />
          Open a case for this alert
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <span className="type-caption">
          Start an investigation under chain of custody. The open-case form is pre-filled from this
          alert; you confirm the rationale and submit the audited write there.
        </span>
        <div className="flex flex-col gap-1.5 rounded-md border border-dashed border-border bg-surface-2/50 p-3 text-caption">
          <span>
            <span className="text-muted-foreground">Title: </span>
            <span className="text-foreground">{title}</span>
          </span>
          <span>
            <span className="text-muted-foreground">Reason: </span>
            <span className="text-foreground">{reason}</span>
          </span>
        </div>
        {canWrite ? (
          <div>
            <Button size="sm" onClick={() => navigate('/cases/new', { state: { title, reason } })}>
              <FilePlus2 aria-hidden />
              Open a case
            </Button>
          </div>
        ) : (
          <InvestigatorOnly action="Opening a case for this alert" />
        )}
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-body text-foreground">{children}</span>
    </div>
  );
}
