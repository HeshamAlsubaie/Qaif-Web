import { ShieldCheck } from 'lucide-react';
import { Outlet } from 'react-router-dom';

import { CaseSelector } from '@/components/shell/CaseSelector';
import { CaseTabs } from '@/components/shell/CaseTabs';
import { HealthDot } from '@/components/shell/HealthDot';
import { RoleSwitcher } from '@/components/shell/RoleSwitcher';

/**
 * The console frame: a slim top bar (brand + case selector + role + health), a horizontal tab strip
 * below it for navigating the case interior, and the routed page in the content region. The old left
 * nav bar is gone — the case presents as card-based views reached from the tab strip. Calm navy + a
 * single blue accent; forensic colour appears only inside the pages, on tier/AI/integrity elements.
 */
export function AppShell() {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Top bar — brand corner, case selector, role, health. */}
      <header className="flex shrink-0 items-center gap-4 border-b border-border bg-surface-2 px-6 py-2.5">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-md bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-inner">
            <ShieldCheck className="size-[18px]" aria-hidden />
          </span>
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
        <RoleSwitcher />
        <HealthDot />
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
