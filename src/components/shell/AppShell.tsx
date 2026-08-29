import { ShieldCheck } from 'lucide-react';
import { Outlet } from 'react-router-dom';

import { CaseSelector } from '@/components/shell/CaseSelector';
import { HealthDot } from '@/components/shell/HealthDot';
import { RoleSwitcher } from '@/components/shell/RoleSwitcher';
import { SideNav } from '@/components/shell/SideNav';

/**
 * The persistent console frame: a brand corner + slim top bar across the top, a thin labelled left
 * nav down the side, and the routed page in the content region. Calm navy + a single blue accent;
 * forensic colour appears only inside the pages, on tier/AI/integrity elements.
 */
export function AppShell() {
  return (
    <div className="grid h-screen grid-cols-[232px_1fr] grid-rows-[56px_1fr] overflow-hidden">
      {/* Brand corner (above the nav) */}
      <div className="flex items-center gap-2.5 border-b border-r border-border bg-surface-2 px-5">
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

      {/* Top bar */}
      <header className="flex items-center gap-4 border-b border-border bg-surface-2 px-6">
        <CaseSelector />
        <div className="flex-1" />
        <RoleSwitcher />
        <HealthDot />
      </header>

      {/* Left nav */}
      <div className="row-start-2 overflow-hidden">
        <SideNav />
      </div>

      {/* Content */}
      <main className="row-start-2 overflow-y-auto bg-surface-0">
        <div className="mx-auto max-w-[1440px] px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
