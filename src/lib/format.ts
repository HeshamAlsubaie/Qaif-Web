/** Display helpers. All timestamps arrive as UTC ISO-8601 strings from the backend (R8). */

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

/**
 * Format an instant explicitly in UTC — used on the evidence/custody views where the label says
 * "UTC" and precision matters (R8). Rendering it in the browser's local zone there would contradict
 * the label and undercut the court-integrity story.
 */
export function formatUtc(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return (
    d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'UTC',
      hour12: false,
    }) + ' UTC'
  );
}

/**
 * True when a recorded original timezone IS UTC (an IANA "UTC"/"Z" or an explicit zero offset).
 * Used to decide whether the original recorded reading differs from the reconciled UTC instant — if
 * it does not, callers say "recorded in UTC" rather than repeating one clock under a second label.
 */
export function isUtcZone(tz: string): boolean {
  const t = tz.trim();
  return t === 'UTC' || t === 'Z' || /^[+-]00:?00$/.test(t);
}

/**
 * Render a UTC ISO instant as the WALL-CLOCK reading in `tz` — the original recorded time (R8
 * provenance): the SAME instant expressed in the zone it was recorded in, never a fabricated time.
 * Supports IANA zone names (via Intl) and fixed ±HH:MM offsets (applied manually, since Intl
 * rejects raw offsets). Returns null when `tz` is neither, so a caller can fall back to showing the
 * zone label alone rather than inventing a clock reading.
 */
export function formatInZone(iso: string, tz: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const opts: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  };
  const zone = tz.trim();
  try {
    return d.toLocaleString(undefined, { ...opts, timeZone: zone });
  } catch {
    // `zone` is not an IANA name Intl accepts — fall back to a fixed ±HH:MM / ±HHMM offset.
    const m = /^([+-])(\d{2}):?(\d{2})$/.exec(zone);
    if (!m) return null;
    const minutes = (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3]));
    const shifted = new Date(d.getTime() + minutes * 60_000);
    return shifted.toLocaleString(undefined, { ...opts, timeZone: 'UTC' });
  }
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
}

/** A relative "3 minutes ago" label for the activity feed. */
export function formatRelative(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const diffMs = d.getTime() - Date.now();
  const abs = Math.abs(diffMs);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31_536_000_000],
    ['month', 2_592_000_000],
    ['day', 86_400_000],
    ['hour', 3_600_000],
    ['minute', 60_000],
    ['second', 1_000],
  ];
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  for (const [unit, ms] of units) {
    if (abs >= ms || unit === 'second') {
      return rtf.format(Math.round(diffMs / ms), unit);
    }
  }
  return formatDate(iso);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let val = bytes / 1024;
  let i = 0;
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024;
    i += 1;
  }
  return `${val.toFixed(val >= 10 ? 0 : 1)} ${units[i]}`;
}

/** Turn a snake/dotted token into a human label ("analysis.ioc" → "Analysis Ioc"). */
export function titleCase(s: string): string {
  return s
    .replace(/[_.]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}
