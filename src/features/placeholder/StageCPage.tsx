import { Info } from 'lucide-react';
import { useLocation } from 'react-router-dom';

import { useSelectedCase } from '@/app/CaseContext';
import { NoCaseSelected } from '@/components/common/NoCaseSelected';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/States';
import { NAV_SECTIONS } from '@/components/shell/navConfig';
import { Card } from '@/components/ui/card';

/**
 * Every non-Overview section renders here for now: a real page header plus an honest
 * "coming in Stage C" state. This keeps the whole nav navigable without fabricating a section view
 * whose backend/design does not exist yet.
 */
export function StageCPage() {
  const location = useLocation();
  const { caseId } = useSelectedCase();
  const section = NAV_SECTIONS.find((s) => s.path === location.pathname);
  const label = section?.label ?? 'Section';

  return (
    <>
      <PageHeader
        kicker={section?.group ?? 'Section'}
        title={label}
        sub="Detail view is scheduled for Stage C."
      />
      {caseId === null ? (
        <NoCaseSelected />
      ) : (
        <Card>
          <EmptyState
            icon={Info}
            title="Not built yet"
            message={
              <>
                The <span className="font-medium text-foreground">{label}</span> detail view is part
                of Stage&nbsp;C. The data layer and shell are ready; this page will render its
                section for the loaded case once built. Nothing is faked here in the meantime.
              </>
            }
          />
        </Card>
      )}
    </>
  );
}
