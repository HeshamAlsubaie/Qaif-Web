/**
 * Self-documenting legend for the funds-flow graph. It names every encoding the canvas uses so the
 * graph needs no external key: the sanctioned root, confidence-decay fade, directional money-flow
 * arrows, and the `+N` expand affordance. Everything is amber — a trace is probabilistic (R4).
 */
import { Ban } from 'lucide-react';

function FadeSwatch() {
  return (
    <span className="flex items-center gap-1" aria-hidden>
      <span className="size-3.5 rounded-full border-[2.5px] border-dashed border-probabilistic bg-probabilistic/25" />
      <span className="size-3 rounded-full border-[2px] border-dashed border-probabilistic/70 bg-probabilistic/15 opacity-80" />
      <span className="size-2.5 rounded-full border-[2px] border-dashed border-probabilistic/50 bg-probabilistic/10 opacity-55" />
    </span>
  );
}

function ArrowSwatch() {
  return (
    <svg width="34" height="10" viewBox="0 0 34 10" className="text-probabilistic" aria-hidden>
      <line
        x1="1"
        y1="5"
        x2="26"
        y2="5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="6 4"
      />
      <path d="M26 1 L33 5 L26 9 Z" fill="currentColor" />
    </svg>
  );
}

export function CryptoGraphLegend() {
  return (
    <div className="pointer-events-none select-none rounded-lg border border-border/70 bg-surface-1/90 p-3 shadow-lg backdrop-blur">
      <div className="mb-2 text-micro font-semibold uppercase tracking-wider text-muted-foreground">
        Funds-flow key · all probabilistic
      </div>
      <ul className="flex flex-col gap-2">
        <li className="flex items-center gap-2.5">
          <span className="flex size-4 items-center justify-center rounded-full border-2 border-probabilistic bg-probabilistic/20">
            <Ban className="size-2.5 text-probabilistic" aria-hidden />
          </span>
          <span className="text-caption text-foreground">
            Root <span className="text-muted-foreground">· OFAC-sanctioned origin</span>
          </span>
        </li>
        <li className="flex items-center gap-2.5">
          <FadeSwatch />
          <span className="text-caption text-foreground">
            Node fade <span className="text-muted-foreground">· confidence decays per hop</span>
          </span>
        </li>
        <li className="flex items-center gap-2.5">
          <ArrowSwatch />
          <span className="text-caption text-foreground">
            Arrow <span className="text-muted-foreground">· money direction (in &amp; out)</span>
          </span>
        </li>
        <li className="flex items-center gap-2.5">
          <span className="rounded border border-probabilistic/60 bg-probabilistic/10 px-1 font-mono text-micro text-probabilistic">
            +N
          </span>
          <span className="text-caption text-foreground">
            Expandable <span className="text-muted-foreground">· click to reveal hop children</span>
          </span>
        </li>
      </ul>
    </div>
  );
}
