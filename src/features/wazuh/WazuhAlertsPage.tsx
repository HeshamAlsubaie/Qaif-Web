import { ChevronRight, RadioTower, ShieldAlert, WifiOff } from 'lucide-react';
import * as React from 'react';
import { useNavigate } from 'react-router-dom';

import { useWazuhAlerts } from '@/api/queries';
import type { WazuhAlertsParams } from '@/api/endpoints';
import { PageHeader } from '@/components/common/PageHeader';
import { QueryBoundary } from '@/components/common/QueryBoundary';
import { EmptyState } from '@/components/common/States';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatUtc } from '@/lib/format';
import type { WazuhAlert, WazuhAlertsResponse } from '@/types/api';

import { severityBand } from './severity';

/**
 * The Wazuh SIEM alert feed — a READ-ONLY signal stream that LAUNCHES investigation. It is bare
 * (ToolShell, no case sidebar) because it is case-INDEPENDENT: nothing here is QAIF evidence and
 * nothing is under chain of custody. Each row is clickable → the alert action page, where the user
 * decides what to do (search an indicator, or open a case). The feed degrades honestly: a
 * `dormant`/`unavailable` source or an empty result renders a calm explanatory state, never a crash
 * and never a fabricated alert.
 */

const LIMIT_OPTIONS = [25, 50, 100, 200];

// Severity floors offered as a quick SIEM triage filter (Wazuh scores rules 0–15).
const LEVEL_OPTIONS: { label: string; value: number | undefined }[] = [
  { label: 'All levels', value: undefined },
  { label: '≥ 4 (Medium)', value: 4 },
  { label: '≥ 8 (High)', value: 8 },
  { label: '≥ 12 (Critical)', value: 12 },
];

export function WazuhAlertsPage() {
  const [params, setParams] = React.useState<WazuhAlertsParams>({ limit: 50 });
  const [agentDraft, setAgentDraft] = React.useState('');
  const query = useWazuhAlerts(params);

  const applyAgent = (e: React.FormEvent) => {
    e.preventDefault();
    const agent = agentDraft.trim();
    setParams((p) => ({ ...p, agent: agent || undefined }));
  };

  return (
    <>
      <PageHeader
        kicker="Free search · SIEM"
        title="Wazuh Alerts"
        sub="Read-only alert feed from the Wazuh Indexer. Alerts launch investigation — they are not evidence and not under chain of custody."
      />

      {/* Filters. Level and limit apply immediately; the agent narrows on submit. */}
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-micro font-semibold uppercase tracking-wider text-muted-foreground">
            Min severity
          </span>
          <select
            value={params.minLevel ?? ''}
            onChange={(e) =>
              setParams((p) => ({
                ...p,
                minLevel: e.target.value === '' ? undefined : Number(e.target.value),
              }))
            }
            className="h-9 rounded-md border border-border bg-surface-0 px-2.5 text-body text-foreground outline-none focus:border-primary/70"
          >
            {LEVEL_OPTIONS.map((o) => (
              <option key={o.label} value={o.value ?? ''}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-micro font-semibold uppercase tracking-wider text-muted-foreground">
            Limit
          </span>
          <select
            value={params.limit ?? 50}
            onChange={(e) => setParams((p) => ({ ...p, limit: Number(e.target.value) }))}
            className="h-9 rounded-md border border-border bg-surface-0 px-2.5 text-body text-foreground outline-none focus:border-primary/70"
          >
            {LIMIT_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>

        <form onSubmit={applyAgent} className="flex flex-col gap-1">
          <span className="text-micro font-semibold uppercase tracking-wider text-muted-foreground">
            Agent
          </span>
          <div className="flex gap-2">
            <input
              value={agentDraft}
              onChange={(e) => setAgentDraft(e.target.value)}
              placeholder="id or name — e.g. ubuntu"
              className="h-9 w-52 rounded-md border border-border bg-surface-0 px-2.5 font-mono text-body text-foreground outline-none focus:border-primary/70"
            />
            <button
              type="submit"
              className="h-9 rounded-md border border-border bg-surface-2 px-3 text-caption font-medium text-foreground transition-colors hover:bg-surface-3"
            >
              Apply
            </button>
            {params.agent && (
              <button
                type="button"
                onClick={() => {
                  setAgentDraft('');
                  setParams((p) => ({ ...p, agent: undefined }));
                }}
                className="h-9 rounded-md px-2 text-caption text-muted-foreground transition-colors hover:text-foreground"
              >
                Clear
              </button>
            )}
          </div>
        </form>

        {query.isFetching && !query.isPending && (
          <span className="ml-auto self-center text-micro text-muted-foreground">Refreshing…</span>
        )}
      </div>

      <QueryBoundary query={query} loadingMessage="Loading Wazuh alerts…">
        {(data) => <AlertFeed data={data} />}
      </QueryBoundary>
    </>
  );
}

function AlertFeed({ data }: { data: WazuhAlertsResponse }) {
  // Source off / not configured → an HONEST calm state, distinct from a transport failure.
  if (data.status !== 'ok') {
    return (
      <Card>
        <EmptyState
          icon={WifiOff}
          title="Wazuh source unavailable"
          message={
            data.detail ??
            (data.status === 'dormant'
              ? 'The Wazuh source is not configured. Set its connection details to enable the live feed.'
              : 'The Wazuh Indexer is unreachable or rejected the connection. The feed will resume when it is back.')
          }
        />
      </Card>
    );
  }

  if (data.alerts.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={RadioTower}
          title="No alerts"
          message="The Wazuh source is connected but returned no alerts for the current filters."
        />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-micro text-muted-foreground">
        {data.count} alert{data.count === 1 ? '' : 's'}, newest first · source connected
      </span>
      <ul className="flex flex-col gap-1.5">
        {data.alerts.map((alert) => (
          <AlertRow key={alert.id} alert={alert} />
        ))}
      </ul>
    </div>
  );
}

function AlertRow({ alert }: { alert: WazuhAlert }) {
  const navigate = useNavigate();
  const band = severityBand(alert.rule.level);
  const indicators = alert.extracted_indicators.length;

  return (
    <li>
      <button
        type="button"
        onClick={() => navigate(`/alerts/${encodeURIComponent(alert.id)}`, { state: { alert } })}
        className="group flex w-full items-stretch gap-3 overflow-hidden rounded-md border border-border bg-surface-1 text-left transition-colors hover:border-primary/40 hover:bg-surface-2"
      >
        {/* Severity rail — colour-banded, distinct from the forensic hues. */}
        <span className={cn('w-1 shrink-0', band.rail)} aria-hidden />

        <span className="flex min-w-0 flex-1 flex-col gap-1 py-2.5 pr-3">
          <span className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-micro leading-none',
                band.pill,
              )}
            >
              <ShieldAlert className="size-3" aria-hidden />
              L{alert.rule.level ?? '?'} · {band.label}
            </span>
            <span className="truncate text-body font-medium text-foreground">
              {alert.rule.description}
            </span>
          </span>

          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground">
            <span className="font-mono">agent: {alert.agent.name}</span>
            <span className="flex items-center gap-1">
              <span title={alert.original_timestamp ?? 'no original timestamp'}>
                {alert.normalized_utc ? formatUtc(alert.normalized_utc) : '—'}
              </span>
              <Badge variant="muted">UTC</Badge>
            </span>
            <span className="font-mono text-micro">rule {alert.rule.id}</span>
            {indicators > 0 && (
              <Badge variant="outline">
                {indicators} indicator{indicators === 1 ? '' : 's'}
              </Badge>
            )}
          </span>
        </span>

        <ChevronRight
          className="mr-2 size-5 shrink-0 self-center text-muted-foreground transition-colors group-hover:text-primary"
          aria-hidden
        />
      </button>
    </li>
  );
}
