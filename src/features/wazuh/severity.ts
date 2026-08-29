/**
 * Wazuh rule-level → severity band.
 *
 * Wazuh scores rules 0–15. We band them into a legible SIEM severity scale whose palette is
 * DELIBERATELY DISTINCT from the reserved forensic hues (cyan = confirmed, amber = probabilistic,
 * red = broken integrity, violet = AI, green = verified). This is triage chrome for a signal feed,
 * not a forensic tier — so it borrows none of those meanings. The ramp runs slate → indigo →
 * fuchsia, escalating to a filled treatment at the top so a critical alert reads at a glance.
 *
 * A `null` level (an alert with no parseable rule level) degrades to the neutral "unknown" band —
 * never guessed, never forced into a severity.
 */

export interface SeverityBand {
  /** Short human label for the band. */
  label: string;
  /** Classes for a bordered severity pill (border + tinted bg + text). */
  pill: string;
  /** Classes for the left rail / dot accent (solid-ish background). */
  rail: string;
}

const UNKNOWN: SeverityBand = {
  label: 'Unknown',
  pill: 'border-border bg-surface-2 text-muted-foreground',
  rail: 'bg-border',
};

const LOW: SeverityBand = {
  label: 'Low',
  pill: 'border-slate-500/30 bg-slate-500/10 text-slate-300',
  rail: 'bg-slate-500',
};

const MEDIUM: SeverityBand = {
  label: 'Medium',
  pill: 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300',
  rail: 'bg-indigo-500',
};

const HIGH: SeverityBand = {
  label: 'High',
  pill: 'border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-300',
  rail: 'bg-fuchsia-500',
};

const CRITICAL: SeverityBand = {
  label: 'Critical',
  pill: 'border-fuchsia-500 bg-fuchsia-600 font-semibold text-white',
  rail: 'bg-fuchsia-600',
};

/** Map a Wazuh rule level (0–15, or null) to its severity band. */
export function severityBand(level: number | null): SeverityBand {
  if (level === null) return UNKNOWN;
  if (level >= 12) return CRITICAL;
  if (level >= 8) return HIGH;
  if (level >= 4) return MEDIUM;
  return LOW;
}
