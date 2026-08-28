import * as React from 'react';

import { useSelectedCase } from '@/app/CaseContext';
import { NoCaseSelected } from '@/components/common/NoCaseSelected';
import { PageHeader } from '@/components/common/PageHeader';

interface CaseScopedProps {
  kicker: string;
  title: string;
  sub?: React.ReactNode;
  actions?: React.ReactNode;
  /** Rendered with the resolved (non-null) case id once a case is loaded. */
  children: (caseId: number) => React.ReactNode;
}

/**
 * The standard frame for a case-scoped detail page: a page header, then either an honest
 * "no case loaded" state or the page body with the resolved case id. Keeps every section page from
 * re-implementing the null-case guard, so none of them can accidentally fire a call with no case.
 */
export function CaseScoped({ kicker, title, sub, actions, children }: CaseScopedProps) {
  const { caseId } = useSelectedCase();
  return (
    <>
      <PageHeader kicker={kicker} title={title} sub={sub} actions={actions} />
      {caseId === null ? <NoCaseSelected /> : children(caseId)}
    </>
  );
}
