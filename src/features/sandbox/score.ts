/**
 * Triage sandbox score → a legible malware-risk band.
 *
 * Triage scores a detonation 0–10 (10 = most malicious). We band it into a legible risk scale whose
 * palette is DELIBERATELY DISTINCT from the reserved forensic hues (cyan = confirmed, amber =
 * probabilistic, red = broken integrity, violet = AI, green = verified): this is triage chrome on a
 * PUBLIC, no-custody observation, not a forensic tier, so it borrows none of those meanings. The ramp
 * runs slate → indigo → fuchsia (the same family as the Wazuh SIEM feed), escalating to a filled
 * treatment at the top so a malicious verdict reads at a glance.
 *
 * A `null` score (trivial samples like EICAR carry none) degrades to the neutral "No score" band —
 * never guessed, never fabricated into a number.
 */

export interface ScoreBand {
  /** Short human label for the band. */
  label: string;
  /** Classes for a bordered score pill (border + tinted bg + text). */
  pill: string;
}

const NONE: ScoreBand = {
  label: 'No score',
  pill: 'border-border bg-surface-2 text-muted-foreground',
};

const LOW: ScoreBand = {
  label: 'Low',
  pill: 'border-slate-500/30 bg-slate-500/10 text-slate-300',
};

const SUSPICIOUS: ScoreBand = {
  label: 'Suspicious',
  pill: 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300',
};

const MALICIOUS: ScoreBand = {
  label: 'Malicious',
  pill: 'border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-300',
};

const HIGHLY_MALICIOUS: ScoreBand = {
  label: 'Highly malicious',
  pill: 'border-fuchsia-500 bg-fuchsia-600 font-semibold text-white',
};

/** Map a Triage score (0–10, or null when the sample carries none) to its risk band. */
export function scoreBand(score: number | null): ScoreBand {
  if (score === null) return NONE;
  if (score >= 9) return HIGHLY_MALICIOUS;
  if (score >= 7) return MALICIOUS;
  if (score >= 4) return SUSPICIOUS;
  return LOW;
}
