import { Bot, FileArchive, Inbox, ShieldAlert, type LucideIcon } from 'lucide-react';

import { AiBadge } from '@/components/forensic/AiBadge';
import { TierBadge } from '@/components/forensic/TierBadge';
import { EmptyState } from '@/components/common/States';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatRelative, titleCase } from '@/lib/format';
import {
  type EvidenceResponse,
  type FindingsResponse,
  type SuggestionsResponse,
  type Tier,
} from '@/types/api';

interface ActivityItem {
  id: string;
  icon: LucideIcon;
  title: string;
  meta: string;
  iso: string;
  tier?: Tier;
  action?: string;
  ai?: boolean;
}

/**
 * The activity feed is assembled from the case's genuine append-only signals: chain-of-custody
 * entries (R3), recorded findings, and any human suggestion reviews (R6). There is no dedicated
 * audit-trail endpoint yet, so this is the closest honest reconstruction — every row is real,
 * sourced case data, never invented.
 */
function collect(
  evidence: EvidenceResponse | undefined,
  findings: FindingsResponse | undefined,
  suggestions: SuggestionsResponse | undefined,
): ActivityItem[] {
  const items: ActivityItem[] = [];

  for (const ev of evidence?.evidence ?? []) {
    for (const entry of ev.custody_chain) {
      items.push({
        id: `custody-${ev.evidence_id}-${entry.sequence}`,
        icon: FileArchive,
        title: `${titleCase(entry.action)} — ${ev.original_filename}`,
        meta: entry.actor,
        iso: entry.recorded_at,
        action: entry.action,
      });
    }
  }

  for (const f of findings?.confirmed ?? []) {
    items.push({
      id: `finding-c-${f.finding_id}`,
      icon: ShieldAlert,
      title: f.title,
      meta: f.module_id,
      iso: f.observed_at,
      tier: 'confirmed',
    });
  }
  for (const f of findings?.probabilistic ?? []) {
    items.push({
      id: `finding-p-${f.finding_id}`,
      icon: ShieldAlert,
      title: f.title,
      meta: f.module_id,
      iso: f.observed_at,
      tier: 'probabilistic',
    });
  }

  for (const s of suggestions?.items ?? []) {
    if (s.reviewed_at && s.reviewed_by) {
      items.push({
        id: `sugg-${s.suggestion_id}`,
        icon: Bot,
        title: `AI suggestion ${s.status}`,
        meta: s.reviewed_by,
        iso: s.reviewed_at,
        ai: true,
      });
    }
  }

  return items.sort((a, b) => (a.iso < b.iso ? 1 : a.iso > b.iso ? -1 : 0)).slice(0, 12);
}

interface ActivityFeedProps {
  evidence: EvidenceResponse | undefined;
  findings: FindingsResponse | undefined;
  suggestions: SuggestionsResponse | undefined;
}

export function ActivityFeed({ evidence, findings, suggestions }: ActivityFeedProps) {
  const items = collect(evidence, findings, suggestions);
  return (
    <Card>
      <CardHeader>
        <span className="type-label">Audit trail</span>
        <CardTitle>Recent activity</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No activity yet"
            message="Custody events, findings, and suggestion reviews will appear here as the case develops."
          />
        ) : (
          <div className="flex flex-col">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  className="flex gap-3 border-b border-border/60 py-3 last:border-b-0"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-surface-2 text-muted-foreground">
                    <Icon className="size-[15px]" aria-hidden />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="min-w-0 truncate text-body text-foreground"
                        title={item.title}
                      >
                        {item.title}
                      </span>
                      <span className="shrink-0 text-micro text-muted-foreground">
                        {formatRelative(item.iso)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-micro text-muted-foreground">
                        {item.meta}
                      </span>
                      {item.tier && <TierBadge tier={item.tier} showLabel={false} />}
                      {item.ai && <AiBadge reviewed />}
                      {item.action && !item.tier && !item.ai && (
                        <Badge variant="outline">{titleCase(item.action)}</Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
