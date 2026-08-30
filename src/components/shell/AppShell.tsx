import { Outlet } from 'react-router-dom';

import { Logo } from '@/components/common/Logo';
import { CaseSelector } from '@/components/shell/CaseSelector';
import { CaseTabs } from '@/components/shell/CaseTabs';

/**
 * The console frame: a slim top bar (brand + case selector) that stays FIXED while the content
 * scrolls under it, a horizontal tab strip for navigating the case interior, and the routed page in
 * the content region. Calm navy + a single blue accent; forensic colour appears only inside the
 * pages, on tier/AI/integrity elements.
 *
 * The old API-health indicator and the Viewer/Investigator dev toggle were removed from the bar; the
 * role is now a fixed config constant (see RoleContext / app/config). The brand mark is the QAIF
 * logo figure (cropped to just the detective — the full lockup carries a stacked wordmark).
 */
export function AppShell() {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Top bar — sticky: it stays pinned to the top while the content region scrolls under it. */}
      <header className="sticky top-0 z-40 flex shrink-0 items-center gap-4 border-b border-border bg-surface-2 px-6 py-2.5">
        <div className="flex items-center gap-2.5">
          <Logo variant="mark" className="size-8" />
          <span className="flex flex-col leading-tight">
            <span className="text-body-lg font-bold tracking-tight text-foreground">QAIF</span>
            <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Investigator Console
            </span>
          </span>
        </div>
        <div className="mx-2 h-8 w-px bg-border" aria-hidden />
        <CaseSelector />
        <div className="flex-1" />
      </header>

      {/* Primary navigation — the horizontal tab strip that replaced the left nav. */}
      <CaseTabs />

      {/* Content */}
      <main className="flex-1 overflow-y-auto bg-surface-0">
        <div className="mx-auto max-w-[1440px] px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
