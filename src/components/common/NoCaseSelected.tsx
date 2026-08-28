import { Search } from 'lucide-react';

import { EmptyState } from '@/components/common/States';
import { Card } from '@/components/ui/card';

/** Shown on any case-scoped page when no case is loaded. Honest emptiness, not an error. */
export function NoCaseSelected() {
  return (
    <Card>
      <EmptyState
        icon={Search}
        title="No case loaded"
        message="Use the case selector in the top bar to load a case by id. The seeded demo case is 700001."
      />
    </Card>
  );
}
