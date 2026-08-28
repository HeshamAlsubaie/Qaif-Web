/**
 * Self-documenting tier legend (like the Overview's). It shows what confirmed vs probabilistic look
 * like AS GRAPH ELEMENTS — a solid node border + solid line vs a dashed border + dashed line — so
 * the encoding needs no external key. The line samples are SVG using solid vs dashed strokes, which
 * is exactly what survives a grayscale print: the dashes still read even without colour.
 */
function LineSample({ dashed, className }: { dashed: boolean; className: string }) {
  return (
    <svg width="34" height="10" viewBox="0 0 34 10" className={className} aria-hidden>
      <line
        x1="1"
        y1="5"
        x2="33"
        y2="5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        {...(dashed ? { strokeDasharray: '6 4' } : {})}
      />
    </svg>
  );
}

function NodeSample({ dashed, className }: { dashed: boolean; className: string }) {
  return (
    <span
      className={`inline-block size-3.5 rounded-full border-[2.5px] ${dashed ? 'border-dashed' : 'border-solid'} ${className}`}
    />
  );
}

export function GraphLegend() {
  return (
    <div className="pointer-events-none select-none rounded-lg border border-border/70 bg-surface-1/90 p-3 shadow-lg backdrop-blur">
      <div className="mb-2 text-micro font-semibold uppercase tracking-wider text-muted-foreground">
        Tier encoding
      </div>
      <ul className="flex flex-col gap-2">
        <li className="flex items-center gap-2.5">
          <NodeSample dashed={false} className="border-confirmed" />
          <LineSample dashed={false} className="text-confirmed" />
          <span className="text-caption text-foreground">
            Confirmed <span className="text-muted-foreground">· grounded</span>
          </span>
        </li>
        <li className="flex items-center gap-2.5">
          <NodeSample dashed className="border-probabilistic" />
          <LineSample dashed className="text-probabilistic" />
          <span className="text-caption text-foreground">
            Probabilistic <span className="text-muted-foreground">· inferred</span>
          </span>
        </li>
      </ul>
      <p className="mt-2 max-w-[22ch] text-micro leading-tight text-muted-foreground">
        Solid vs dashed carries the tier — it survives a grayscale print.
      </p>
    </div>
  );
}
