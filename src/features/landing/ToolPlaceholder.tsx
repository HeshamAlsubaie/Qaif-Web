import { type LucideIcon } from 'lucide-react';

import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/States';
import { Card } from '@/components/ui/card';

/**
 * Honest placeholder for a free-search tool whose detail view is not built yet (Wazuh Alerts,
 * Drop-file Triage). Unlike the case-scoped StageC placeholder, this requires NO selected case —
 * these tools are reachable from the landing launcher, outside any case. Nothing is fabricated.
 */
export function ToolPlaceholder({
  kicker,
  title,
  icon,
  message,
}: {
  kicker: string;
  title: string;
  icon: LucideIcon;
  message: string;
}) {
  return (
    <>
      <PageHeader kicker={kicker} title={title} sub="Detail view arrives in Stage 2." />
      <Card>
        <EmptyState icon={icon} title="Not built yet" message={message} />
      </Card>
    </>
  );
}
