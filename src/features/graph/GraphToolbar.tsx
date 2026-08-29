/**
 * View controls for the graph: a layout picker plus fit-to-screen, zoom-reset, and re-run layout.
 * Pure chrome — these buttons carry no forensic meaning, so they use the neutral button primitives,
 * never a tier colour.
 *
 * Generic over the layout string so callers supply their OWN option list: the correlation graph and
 * the crypto graph pass the shared ``LAYOUTS``; the general Graph view passes ``GRAPH_LAYOUTS`` (which
 * adds "Diamond"). ``showCanvasControls`` hides the fit/zoom/re-run trio when the active view manages
 * its own (e.g. the Diamond layout renders a self-fitting diagram).
 */
import { Maximize2, RotateCw, Scan } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface GraphToolbarProps<T extends string> {
  layout: T;
  layouts: readonly { name: T; label: string }[];
  onLayoutChange: (name: T) => void;
  onFit: () => void;
  onResetZoom: () => void;
  onRerun: () => void;
  /** Show the fit / reset-zoom / re-run buttons (default true). */
  showCanvasControls?: boolean;
}

export function GraphToolbar<T extends string>({
  layout,
  layouts,
  onLayoutChange,
  onFit,
  onResetZoom,
  onRerun,
  showCanvasControls = true,
}: GraphToolbarProps<T>) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Layout picker — a segmented control. */}
      <div
        className="inline-flex items-center rounded-md border border-border bg-surface-2 p-0.5"
        role="group"
        aria-label="Graph layout"
      >
        {layouts.map((l) => {
          const active = l.name === layout;
          return (
            <button
              key={l.name}
              type="button"
              aria-pressed={active}
              onClick={() => onLayoutChange(l.name)}
              className={cn(
                'rounded px-2.5 py-1 text-caption font-medium transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-surface-3 hover:text-foreground',
              )}
            >
              {l.label}
            </button>
          );
        })}
      </div>

      {showCanvasControls && (
        <>
          <div className="mx-1 h-5 w-px bg-border" aria-hidden />

          <Button variant="outline" size="sm" onClick={onRerun} title="Re-run the current layout">
            <RotateCw aria-hidden />
            Re-run
          </Button>
          <Button variant="outline" size="sm" onClick={onFit} title="Fit the whole graph in view">
            <Maximize2 aria-hidden />
            Fit
          </Button>
          <Button variant="outline" size="sm" onClick={onResetZoom} title="Reset zoom to 100%">
            <Scan aria-hidden />
            Reset zoom
          </Button>
        </>
      )}
    </div>
  );
}
