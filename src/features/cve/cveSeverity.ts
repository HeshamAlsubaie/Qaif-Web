/**
 * CVSS SEVERITY — a color axis DELIBERATELY SEPARATE from the forensic tier language.
 *
 * QAIF's reserved forensic hues are OFF-LIMITS here:
 *   - cyan  = the CONFIRMED tier (R4)
 *   - amber = the PROBABILISTIC tier (R4) AND the crypto sanction flag
 *   - red   = an integrity break (hash mismatch / custody gap)
 *
 * CVSS severity answers a DIFFERENT question ("how dangerous is this vulnerability?"), so it must
 * never borrow a tier/integrity hue or a reader would misread it as one. It is therefore given its
 * own axis: a purple→blue ramp drawn from Tailwind's DEFAULT palette (violet / fuchsia / blue /
 * slate) — none of which is a forensic token. CRITICAL = deep violet, HIGH = magenta/violet,
 * MEDIUM = blue, LOW = slate. Amber/orange/yellow and red are intentionally absent from the ramp.
 *
 * The class strings are FULL LITERALS (not built by interpolation) so Tailwind's JIT emits them.
 */

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';

export interface SeverityStyle {
  /** Human label for the severity chip. */
  label: string;
  /** The prominent band container (border + wash). */
  band: string;
  /** The severity chip / pill. */
  chip: string;
  /** The score-bar fill. */
  bar: string;
  /** Emphasised text (the score numeral). */
  score: string;
}

const STYLES: Record<Severity, SeverityStyle> = {
  CRITICAL: {
    label: 'Critical',
    band: 'border-violet-500/50 bg-violet-500/10',
    chip: 'border-violet-400/60 bg-violet-500/20 text-violet-100',
    bar: 'bg-violet-500',
    score: 'text-violet-100',
  },
  HIGH: {
    label: 'High',
    band: 'border-fuchsia-500/50 bg-fuchsia-500/10',
    chip: 'border-fuchsia-400/60 bg-fuchsia-500/20 text-fuchsia-100',
    bar: 'bg-fuchsia-500',
    score: 'text-fuchsia-100',
  },
  MEDIUM: {
    label: 'Medium',
    band: 'border-blue-500/50 bg-blue-500/10',
    chip: 'border-blue-400/60 bg-blue-500/20 text-blue-100',
    bar: 'bg-blue-500',
    score: 'text-blue-100',
  },
  LOW: {
    label: 'Low',
    band: 'border-slate-500/50 bg-slate-500/10',
    chip: 'border-slate-400/50 bg-slate-500/20 text-slate-100',
    bar: 'bg-slate-400',
    score: 'text-slate-100',
  },
  NONE: {
    label: 'None',
    band: 'border-border bg-surface-2',
    chip: 'border-border bg-surface-3 text-muted-foreground',
    bar: 'bg-surface-3',
    score: 'text-foreground',
  },
};

/**
 * Normalize a severity to the ramp. Prefers the source's own label; when it's missing but a base
 * score is present, derives the band from the CVSS score ranges (never inventing — a score IS a
 * severity by the CVSS spec). Anything unrecognized falls back to NONE (a neutral, honest band).
 */
export function normalizeSeverity(
  severity: string | null | undefined,
  baseScore: number | null | undefined,
): Severity {
  const upper = (severity ?? '').trim().toUpperCase();
  if (upper === 'CRITICAL' || upper === 'HIGH' || upper === 'MEDIUM' || upper === 'LOW') {
    return upper;
  }
  if (typeof baseScore === 'number') {
    if (baseScore >= 9.0) return 'CRITICAL';
    if (baseScore >= 7.0) return 'HIGH';
    if (baseScore >= 4.0) return 'MEDIUM';
    if (baseScore > 0) return 'LOW';
  }
  return 'NONE';
}

export function severityStyle(severity: Severity): SeverityStyle {
  return STYLES[severity];
}
