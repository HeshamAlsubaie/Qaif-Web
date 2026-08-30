import { Logo } from '@/components/common/Logo';
import { cn } from '@/lib/utils';

/**
 * The QAIF brand lockup for the bare, sidebar-free surfaces (the free-tool pages / ToolShell) — the
 * same mark + "QAIF / Investigator Console" wordmark as the AppShell brand corner. The mark itself
 * comes from the single {@link Logo} component (figure-only variant), so the logo lives in ONE place.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <Logo variant="mark" className="size-10" />
      <span className="flex flex-col leading-tight">
        <span className="text-h4 font-bold tracking-tight text-foreground">QAIF</span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Investigator Console
        </span>
      </span>
    </div>
  );
}
