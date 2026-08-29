import { ShieldCheck } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * The QAIF brand mark — the same shield + wordmark as the AppShell brand corner, kept consistent
 * across the bare, sidebar-free surfaces (the search-forward landing and the free-tool pages).
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <span className="flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-inner">
        <ShieldCheck className="size-[22px]" aria-hidden />
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-h4 font-bold tracking-tight text-foreground">QAIF</span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Investigator Console
        </span>
      </span>
    </div>
  );
}
