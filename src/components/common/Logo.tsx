import qaifLogo from '@/assets/qaif-logo.png';
import qaifMark from '@/assets/qaif-mark.png';
import { cn } from '@/lib/utils';

/**
 * The ONE QAIF brand-logo component — the single source of truth for the app's mark. Every brand
 * site (the console top bar, the bare tool/landing shells) routes through this, so swapping the logo
 * is one edit here, never a per-location `<img>`.
 *
 * Two variants:
 *   - `mark` (default) — the FIGURE ONLY (the pre-cropped `qaif-mark.png`, wordmark removed). For
 *     short bars where the "QAIF / Investigator Console" text already sits beside it.
 *   - `full` — the full portrait lockup (figure + stacked wordmark, `qaif-logo.png`). For the
 *     landing page, where the logo is the sole identity element.
 *
 * `alt="QAIF"` always. Sizing defaults per variant are overridable via `className` (twMerge wins),
 * so a caller can size the mark to its bar without re-importing the asset.
 */
export function Logo({
  variant = 'mark',
  className,
}: {
  variant?: 'mark' | 'full';
  className?: string;
}) {
  const isFull = variant === 'full';
  return (
    <img
      src={isFull ? qaifLogo : qaifMark}
      alt="QAIF"
      className={cn(
        'select-none object-contain',
        isFull ? 'h-auto w-[360px] max-h-[48vh] max-w-[86vw]' : 'size-8 shrink-0',
        className,
      )}
    />
  );
}
