import { ShieldCheck } from 'lucide-react';

import { DesignSystemPage } from '@/features/design-system/DesignSystemPage';
import { getApiBaseUrl } from '@/api/client';

/**
 * Stage A app shell: a sober console header over the single visual deliverable, the design-system
 * page. Feature views (graph / timeline / tables) arrive in stages B and C.
 */
export function App() {
  return (
    <div className="min-h-screen bg-surface-0 text-foreground">
      <header className="sticky top-0 z-10 border-b border-border bg-surface-0/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="size-5 text-primary" aria-hidden />
            <span className="text-body-lg font-semibold tracking-tight">QAIF</span>
            <span className="type-label mt-0.5">Investigator Console</span>
          </div>
          <div className="type-caption font-mono">
            api · <span className="text-foreground/80">{getApiBaseUrl()}</span>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <DesignSystemPage />
      </main>
    </div>
  );
}
