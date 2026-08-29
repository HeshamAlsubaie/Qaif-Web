import { ArrowLeft, FilePlus2, Search, ShieldAlert } from 'lucide-react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';

import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/States';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatUtc } from '@/lib/format';
import type { WazuhAlert, WazuhIndicator } from '@/types/api';

import { severityBand } from './severity';

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

            {alert.rule.groups.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                {alert.rule.groups.map((g) => (
                  <Badge key={g} variant="muted">
                    {g}
                  </Badge>
                ))}
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
 * Launch the free universal search for an indicator carried by this alert. Each extracted indicator
 * is offered explicitly; the search runs on the landing page (`/lookup` + `/match`), pre-filled. If
 * the alert carries no indicators (routine alerts often don't), we fall back to searching the agent
 * name, clearly labelled as such — never a silent no-op.
 */
function SearchAction({ alert }: { alert: WazuhAlert }) {
  const navigate = useNavigate();
  const runSearch = (query: string) => navigate('/', { state: { prefill: query } });

  const indicators = alert.extracted_indicators;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-body-lg">
          <Search className="size-4 text-primary" aria-hidden />
          Search an indicator
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {indicators.length > 0 ? (
          <>
            <span className="type-caption">
              This alert carried {indicators.length} indicator{indicators.length === 1 ? '' : 's'}.
              Search one across every enabled intelligence source (free lookup — nothing is written).
            </span>
            <div className="flex flex-wrap gap-2">
              {indicators.map((ind: WazuhIndicator) => (
                <Button
                  key={`${ind.type}:${ind.value}`}
                  variant="outline"
                  size="sm"
                  onClick={() => runSearch(ind.value)}
                >
                  <Search aria-hidden />
                  <span className="font-mono">{ind.value}</span>
                  <Badge variant="muted">{ind.type}</Badge>
                </Button>
              ))}
            </div>
          </>
        ) : (
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
        )}
      </CardContent>
    </Card>
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
        <div>
          <Button
            size="sm"
            onClick={() => navigate('/cases/new', { state: { title, reason } })}
          >
            <FilePlus2 aria-hidden />
            Open a case
          </Button>
        </div>
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
