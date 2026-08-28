import * as React from 'react';
import { NavLink } from 'react-router-dom';

import { useCase } from '@/api/queries';
import { useSelectedCase } from '@/app/CaseContext';
import { cn } from '@/lib/utils';
import { NAV_SECTIONS } from '@/components/shell/navConfig';

/**
 * Thin, labelled left nav. Active state uses the single blue accent. The AI Suggestions item shows
 * the pending-review count in violet — a genuine AI-quarantine signal (R6), not chrome — pulled
 * from the case header counts when a case is loaded.
 */
export function SideNav() {
  const { caseId } = useSelectedCase();
  const caseQuery = useCase(caseId);
  const aiCount = caseQuery.data?.counts.ai_suggestions ?? 0;

  return (
    <nav
      aria-label="Sections"
      className="flex h-full flex-col gap-0.5 overflow-y-auto border-r border-border bg-surface-2 px-3 py-4"
    >
      {NAV_SECTIONS.map((section) => (
        <React.Fragment key={section.path}>
          {section.group && (
            <span className="px-3 pb-2 pt-4 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/70">
              {section.group}
            </span>
          )}
          <NavLink
            to={section.path}
            end={section.path === '/'}
            className={({ isActive }) =>
              cn(
                'group relative flex items-center gap-3 rounded-md px-3 py-2 text-body font-medium transition-colors',
                isActive
                  ? 'bg-primary/12 font-semibold text-primary'
                  : 'text-muted-foreground hover:bg-surface-3 hover:text-foreground',
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-primary" />
                )}
                <section.icon className="size-[17px] shrink-0" aria-hidden />
                <span className="flex-1 truncate">{section.label}</span>
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
      <div className="flex-1" />
      <div className="border-t border-border/60 px-3 pt-3 text-[10px] leading-relaxed text-muted-foreground/60">
        Layer-6 read-only console.
        <br />
        Detail views arrive in Stage&nbsp;C.
      </div>
    </nav>
  );
}
