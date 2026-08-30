import { titleCase } from '@/lib/format';
import type { LookupResponse, LookupSourceResult } from '@/types/api';

/**
 * Normalize a `POST /lookup` response — many per-source results — into ONE source-agnostic artifact
 * view. The backend already normalizes each source's payload into the same shape (anonymizer /
 * reputation / metadata / families / detections / …); this merges those shapes ACROSS sources into a
 * single set of sections so the UI renders one artifact card, never one card per source.
 *
 * Source identity is deliberately dropped here: the card shows normalized intelligence about the
 * indicator, not "AbuseIPDB says X, Triage says Y". The external-claim honesty (nothing here is
 * confirmed case evidence) is carried by the ExternalClaimBadge on the card, not by naming sources.
 *
 * Everything is PRESENT-ONLY: a section is populated only from real data. Absent fields are omitted
 * entirely — never rendered as empty rows, "N/A", or fabricated defaults (e.g. no "VPN: OFF").
 */

export type Verdict = 'malicious' | 'suspicious' | 'clean';

export interface AnonymizerChip {
  kind: string;
  label: string;
}

export interface ReputationRow {
  name: string;
  value: number;
  scale: string;
}

export interface MetadataRow {
  key: string;
  label: string;
  value: string;
}

export interface DetectionsView {
  count?: number;
  text?: string;
  rows?: MetadataRow[];
}

export interface NormalizedArtifact {
  verdict: Verdict | null;
  anonymizers: AnonymizerChip[];
  reputation: ReputationRow[];
  metadata: MetadataRow[];
  families: string[];
  detections: DetectionsView | null;
  matchCount: number | null;
  sampleIds: string[];
  services: string[];
  resolvedIps: string[];
  associations: string[];
  /** True when at least one section carries real data — the card is worth rendering. */
  hasData: boolean;
  okCount: number;
  errorCount: number;
  notFoundCount: number;
}

// -- small, defensive readers (payload is `Record<string, unknown>`) ---------

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/** A primitive rendered as a display string, or null when it carries no signal. */
function asDisplayString(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() ? value : null;
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : null;
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return null;
}

/** Pull a human-facing label out of an array element that may be a string or an object. */
function elementToString(value: unknown): string | null {
  const direct = asDisplayString(value);
  if (direct !== null) return direct;
  const rec = asRecord(value);
  if (!rec) return null;
  for (const key of ['value', 'name', 'ip', 'domain', 'address', 'label']) {
    const candidate = asDisplayString(rec[key]);
    if (candidate !== null) return candidate;
  }
  return null;
}

function uniq(values: string[]): string[] {
  return [...new Set(values)];
}

const ANONYMIZER_LABELS: Record<string, string> = {
  tor: 'Tor',
  vpn: 'VPN',
  proxy: 'Proxy',
};

// Metadata keys that are surfaced through their own dedicated sections, not the generic table.
const METADATA_HANDLED_ELSEWHERE = new Set(['match_count', 'sample_ids']);

/**
 * Map a reputation reading to a badness score in [0,1] using only its numeric value and its own
 * scale string. The scale ("0-100 (higher = more abusive …)") tells us the range and direction, so
 * this never hard-codes per-source semantics. Returns null when the scale has no usable range.
 */
function badness(value: number, scale: string): number | null {
  const s = scale.toLowerCase();
  const range = s.match(/(-?\d+(?:\.\d+)?)\s*[-–]\s*(-?\d+(?:\.\d+)?)/);
  const min = range ? Number.parseFloat(range[1]) : 0;
  const max = range ? Number.parseFloat(range[2]) : 100;
  if (!(max > min)) return null;
  const norm = Math.min(1, Math.max(0, (value - min) / (max - min)));
  // Default: higher = worse (the common reputation convention). Only invert when the scale says so.
  const lowerWorse = /lower\s*=\s*(more|worse|higher)/.test(s);
  return lowerWorse ? 1 - norm : norm;
}

/**
 * Compute a single verdict from the merged reputation readings — the WORST (most abusive) reading
 * decides, so one source scoring an indicator malicious is not diluted by a quieter one. Returns
 * null when no reputation reading yields a usable score (present-only: no reputation → no verdict).
 */
export function reputationVerdict(reputation: ReputationRow[]): Verdict | null {
  let worst: number | null = null;
  for (const row of reputation) {
    const b = badness(row.value, row.scale);
    if (b === null) continue;
    worst = worst === null ? b : Math.max(worst, b);
  }
  if (worst === null) return null;
  if (worst >= 0.75) return 'malicious';
  if (worst >= 0.25) return 'suspicious';
  return 'clean';
}

function normalizeDetections(value: unknown): DetectionsView | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? { count: value } : null;
  if (typeof value === 'string') return value.trim() ? { text: value } : null;
  const rec = asRecord(value);
  if (!rec) return null;
  const rows = recordToRows(rec);
  return rows.length ? { rows } : null;
}

/** Flatten a record's primitive entries into labelled rows, skipping empty/nested values. */
function recordToRows(rec: Record<string, unknown>): MetadataRow[] {
  const rows: MetadataRow[] = [];
  for (const [key, raw] of Object.entries(rec)) {
    const value = asDisplayString(raw);
    if (value === null) continue;
    rows.push({ key, label: titleCase(key), value });
  }
  return rows;
}

/**
 * Merge every per-source payload into one normalized artifact. Only `status === 'ok'` results with a
 * payload contribute sections; error / not_found results are counted (for the honest empty state)
 * but add nothing.
 */
export function normalizeArtifact(data: LookupResponse): NormalizedArtifact {
  const results: LookupSourceResult[] = data.results;
  const okCount = results.filter((r) => r.status === 'ok' && r.payload).length;
  const errorCount = results.filter((r) => r.status === 'error').length;
  const notFoundCount = results.filter((r) => r.status === 'not_found').length;

  const payloads = results
    .filter((r) => r.status === 'ok' && r.payload)
    .map((r) => r.payload as Record<string, unknown>);

  // Anonymizer chips — only entries flagged true, deduped by kind (present-only, never "OFF").
  const anonByKind = new Map<string, AnonymizerChip>();
  for (const p of payloads) {
    for (const entry of asArray(p.anonymizer)) {
      const rec = asRecord(entry);
      if (!rec || rec.value !== true || typeof rec.kind !== 'string') continue;
      const kind = rec.kind;
      if (!anonByKind.has(kind)) {
        anonByKind.set(kind, { kind, label: ANONYMIZER_LABELS[kind] ?? titleCase(kind) });
      }
    }
  }

  // Reputation — deduped by metric name, keeping the most-abusive reading when sources overlap.
  const repByName = new Map<string, ReputationRow>();
  for (const p of payloads) {
    for (const entry of asArray(p.reputation)) {
      const rec = asRecord(entry);
      if (!rec || typeof rec.name !== 'string' || typeof rec.value !== 'number') continue;
      const scale = typeof rec.scale === 'string' ? rec.scale : '';
      const row: ReputationRow = { name: rec.name, value: rec.value, scale };
      const existing = repByName.get(rec.name);
      if (!existing) {
        repByName.set(rec.name, row);
      } else {
        const a = badness(existing.value, existing.scale) ?? -1;
        const b = badness(row.value, scale) ?? -1;
        if (b > a) repByName.set(rec.name, row);
      }
    }
  }
  const reputation = [...repByName.values()];

  // Metadata — merge records, first non-empty value wins per key; hash-specific keys pulled out.
  const mergedMeta: Record<string, unknown> = {};
  for (const p of payloads) {
    const rec = asRecord(p.metadata);
    if (!rec) continue;
    for (const [key, value] of Object.entries(rec)) {
      if (asDisplayString(value) === null && !Array.isArray(value)) continue;
      if (!(key in mergedMeta)) mergedMeta[key] = value;
    }
  }
  const matchCount = typeof mergedMeta.match_count === 'number' ? mergedMeta.match_count : null;
  const sampleIds = uniq(
    asArray(mergedMeta.sample_ids)
      .map(asDisplayString)
      .filter((v): v is string => v !== null),
  );
  const metadata = recordToRows(
    Object.fromEntries(
      Object.entries(mergedMeta).filter(([key]) => !METADATA_HANDLED_ELSEWHERE.has(key)),
    ),
  );

  const families = uniq(
    payloads.flatMap((p) => asArray(p.families).map(asDisplayString).filter((v): v is string => v !== null)),
  );

  const detections = payloads.map((p) => normalizeDetections(p.detections)).find(Boolean) ?? null;

  const collectList = (key: string): string[] =>
    uniq(
      payloads.flatMap((p) =>
        asArray(p[key]).map(elementToString).filter((v): v is string => v !== null),
      ),
    );
  const services = collectList('services');
  const resolvedIps = collectList('resolved_ips');
  const associations = collectList('associations');

  const anonymizers = [...anonByKind.values()];

  const hasData =
    anonymizers.length > 0 ||
    reputation.length > 0 ||
    metadata.length > 0 ||
    families.length > 0 ||
    detections !== null ||
    matchCount !== null ||
    sampleIds.length > 0 ||
    services.length > 0 ||
    resolvedIps.length > 0 ||
    associations.length > 0;

  return {
    verdict: reputationVerdict(reputation),
    anonymizers,
    reputation,
    metadata,
    families,
    detections,
    matchCount,
    sampleIds,
    services,
    resolvedIps,
    associations,
    hasData,
    okCount,
    errorCount,
    notFoundCount,
  };
}

/** Format a reputation value without a trailing `.0` (100.0 → "100", 12.5 → "12.5"). */
export function formatReputationValue(value: number): string {
  return Number.isInteger(value) ? String(value) : String(value);
}
