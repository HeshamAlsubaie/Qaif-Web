import * as React from 'react';
import { NavLink } from 'react-router-dom';

import { useCase } from '@/api/queries';
import { useSelectedCase } from '@/app/CaseContext';
import { cn } from '@/lib/utils';
import { NAV_SECTIONS } from '@/components/shell/navConfig';

/**
 * The console's primary navigation — a horizontal tab strip that replaced the old left nav bar. The
 * case interior is a set of card-based views; this strip is how you move between them. Search-first:
 * with no case open only the case-INDEPENDENT tools show; case-scoped views appear once a case is
 * loaded. A thin divider marks each new nav group so the strip stays grouped without headings.
 *
 * The AI Suggestions tab carries the pending-review count in violet — a genuine AI-quarantine signal
 * (R6), not chrome — pulled from the case header counts when a case is loaded.
 */
export function CaseTabs() {
  const { caseId } = useSelectedCase();
  const caseQuery = useCase(caseId);
  const aiCount = caseQuery.data?.counts.ai_suggestions ?? 0;

  const sections = caseId === null ? NAV_SECTIONS.filter((s) => !s.caseOnly) : NAV_SECTIONS;

  return (
    <nav
      aria-label="Sections"
      className="flex items-center gap-1 overflow-x-auto border-b border-border bg-surface-2 px-6"
    >
      {sections.map((section, i) => (
        <React.Fragment key={section.path}>
          {section.group && i > 0 && (
            <span className="mx-1.5 h-5 w-px shrink-0 bg-border" aria-hidden />
          )}
          <NavLink
            to={section.path}
            end={section.path === '/'}
            className={({ isActive }) =>
              cn(
                'relative flex shrink-0 items-center gap-2 whitespace-nowrap px-3 py-3 text-caption font-medium transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground',
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary" />
                )}
                <section.icon className="size-4 shrink-0" aria-hidden />
                <span>{section.label}</span>
                {section.path === '/suggestions' && aiCount > 0 && (
                  <span
                    className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full border border-ai/50 bg-ai/15 px-1.5 text-[10px] font-bold tabular-nums text-ai"
                    title="AI suggestions pending review"
                  >
                    {aiCount}
                  </span>
                )}
              </>
            )}
          </NavLink>
        </React.Fragment>
      ))}
    </nav>
  );
}
