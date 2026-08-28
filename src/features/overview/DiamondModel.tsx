import { Crosshair, Info, Network, Target, Users, type LucideIcon } from 'lucide-react';

import { TierBadge } from '@/components/forensic/TierBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buildDiamond, type DiamondVertex, type VertexKey } from '@/features/overview/diamond';
import { type CorrelationsResponse, type FindingsResponse, type GraphResponse } from '@/types/api';

const VERTEX_META: Record<VertexKey, { label: string; icon: LucideIcon; empty: string }> = {
  adversary: { label: 'Adversary', icon: Crosshair, empty: 'No attribution yet' },
  capability: { label: 'Capability', icon: Target, empty: 'No malware / tooling identified' },
  infrastructure: {
    label: 'Infrastructure',
    icon: Network,
    empty: 'No infrastructure entities yet',
  },
  victim: { label: 'Victim', icon: Users, empty: 'No victim organisation identified' },
};

function Vertex({ vkey, vertex }: { vkey: VertexKey; vertex: DiamondVertex }) {
  const meta = VERTEX_META[vkey];
  const Icon = meta.icon;
  const hidden = vertex.total - vertex.items.length;
  return (
    <div className="flex min-h-[132px] flex-col gap-3 rounded-md border border-border bg-surface-0 p-4">
      <div className="flex items-center gap-2">
        <span className="bg-primary/12 flex size-6 items-center justify-center rounded text-primary">
          <Icon className="size-[15px]" aria-hidden />
        </span>
        <span className="type-label">{meta.label}</span>
        {vertex.total > 0 && (
          <span className="ml-auto text-micro tabular-nums text-muted-foreground">
            {vertex.total}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-2">
        {vertex.items.length === 0 ? (
          <span className="text-body italic text-muted-foreground/70">{meta.empty}</span>
        ) : (
          vertex.items.map((item, i) => (
            <div
              key={`${item.type}-${item.label}-${i}`}
              className="flex items-center justify-between gap-2 rounded border border-border/60 bg-surface-1 px-2 py-1.5"
            >
              <span className="min-w-0 truncate text-body text-foreground" title={item.label}>
                {item.label}
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="font-mono text-[10px] text-muted-foreground">{item.type}</span>
                <TierBadge tier={item.tier} showLabel={false} />
              </span>
            </div>
          ))
        )}
        {hidden > 0 && (
          <span className="px-1 text-micro text-muted-foreground">+{hidden} more</span>
        )}
      </div>
    </div>
  );
}

interface DiamondModelProps {
  graph: GraphResponse | undefined;
  findings: FindingsResponse | undefined;
  correlations: CorrelationsResponse | undefined;
}

/**
 * The Diamond Model panel. Renders the four vertices from whatever maps today, each item
 * tier-badged. Vertices with no data say so honestly rather than inventing an adversary or victim.
 */
export function DiamondModel({ graph, findings, correlations }: DiamondModelProps) {
  const diamond = buildDiamond(graph, findings, correlations);
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
        <div className="flex flex-col gap-1">
          <span className="type-label">Analytic pivot</span>
          <CardTitle>Diamond Model</CardTitle>
        </div>
        <TierBadge tier="probabilistic" showLabel={false} />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Vertex vkey="adversary" vertex={diamond.adversary} />
          <Vertex vkey="capability" vertex={diamond.capability} />
          <Vertex vkey="infrastructure" vertex={diamond.infrastructure} />
          <Vertex vkey="victim" vertex={diamond.victim} />
        </div>
        <div className="flex items-start gap-2 border-t border-border/60 pt-3 text-micro text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>
            Interim mapping of existing entities &amp; findings into the four vertices — each item
            keeps its own tier. Attribution is probabilistic and often absent. A dedicated Diamond
            Model engine arrives later; nothing here is fabricated.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
