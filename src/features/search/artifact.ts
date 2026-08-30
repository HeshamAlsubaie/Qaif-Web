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

/**
 * The three anonymizer flavours the IP card ALWAYS shows, and their honest three-state reading:
 *   - 'yes'     — at least one source asserted this flag TRUE;
 *   - 'no'      — a source asserted it and NONE said true (a real, checked negative);
 *   - 'unknown' — NO source reported this flag at all (not checked — never a clean "NO").
 * The distinction between 'no' and 'unknown' is the point: a missing check must never read as a
 * clean result an investigator could clear the IP on.
 */
export const ANONYMIZER_ORDER = ['vpn', 'proxy', 'tor'] as const;
export type AnonymizerKind = (typeof ANONYMIZER_ORDER)[number];
export type AnonymizerState = 'yes' | 'no' | 'unknown';
export type AnonymizerStatus = Record<AnonymizerKind, AnonymizerState>;

export const ANONYMIZER_LABELS: Record<string, string> = {
  vpn: 'VPN',
  proxy: 'Proxy',
  tor: 'Tor',
};

/**
 * Cloud / hosting profile for the IP card, derived ONLY from real metadata (`isp` + `usage_type`).
 * `provider` is a clean label ("AWS (Amazon)"…) ONLY when the raw `isp` string matches a known
 * provider via {@link cloudProviderLabel} — a transparent display mapping of real data, never a
 * guess. `isp` / `usageType` are the raw strings verbatim. All three are null when a source gave
 * no metadata, so the card can show an honest "unknown" instead of a fabricated provider.
 */
export interface CloudHosting {
  provider: string | null;
  isp: string | null;
  usageType: string | null;
}

// A TRANSPARENT substring→label mapping of the real `isp` string. First match wins; case-insensitive.
// This is display normalization of real data (it renames what the source already said), not
// enrichment — no lookup, no inference, no guess.
const CLOUD_PROVIDER_MAP: readonly (readonly [string, string])[] = [
  ['amazon', 'AWS (Amazon)'],
  ['google', 'Google Cloud'],
  ['microsoft', 'Azure (Microsoft)'],
  ['azure', 'Azure (Microsoft)'],
  ['oracle', 'Oracle Cloud'],
  ['digitalocean', 'DigitalOcean'],
  ['linode', 'Linode'],
  ['ovh', 'OVH'],
  ['hetzner', 'Hetzner'],
  ['alibaba', 'Alibaba'],
];

/** The mapped cloud label when the raw `isp` matches a known provider, else null (non-cloud/unknown). */
export function cloudProviderLabel(isp: string): string | null {
  const lower = isp.toLowerCase();
  for (const [needle, label] of CLOUD_PROVIDER_MAP) {
    if (lower.includes(needle)) return label;
  }
  return null;
}

/**
 * The Cloud/Hosting field value shown on the IP card: the mapped provider when the isp is a known
 * cloud, else the raw isp verbatim, else "unknown". Always truthful — mapped only from real
 * metadata. `usage_type` is presented as its own adjacent row, so it is not concatenated here.
 */
export function cloudHostingDisplay(c: CloudHosting): string {
  return c.provider ?? c.isp ?? 'unknown';
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
  /** Always-present three-state VPN/Proxy/Tor reading for the IP card (yes / no / unknown). */
  anonymizerStatus: AnonymizerStatus;
  /** Cloud/hosting profile derived from real `isp`/`usage_type` metadata (always shown on the IP card). */
  cloudHosting: CloudHosting;
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

// Metadata keys that are surfaced through their own dedicated sections, not the generic table.
// `isp`/`usage_type` drive the always-visible Cloud/Hosting + Usage-type rows, so they are pulled
// out of the generic metadata table to avoid showing the same real value twice.
const METADATA_HANDLED_ELSEWHERE = new Set(['match_count', 'sample_ids', 'isp', 'usage_type']);

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
  // Three-state per kind: collect EVERY asserted bool (true AND false) across all sources, so a
  // source that checked and said "not vpn" reads as a real NO, and a kind no source reported reads
  // as unknown — never a fabricated clean NO.
  const anonBools: Record<AnonymizerKind, boolean[]> = { vpn: [], proxy: [], tor: [] };
  for (const p of payloads) {
    for (const entry of asArray(p.anonymizer)) {
      const rec = asRecord(entry);
      if (!rec || typeof rec.kind !== 'string' || typeof rec.value !== 'boolean') continue;
      const kind = rec.kind;
      if (kind === 'vpn' || kind === 'proxy' || kind === 'tor') anonBools[kind].push(rec.value);
      if (rec.value === true && !anonByKind.has(kind)) {
        anonByKind.set(kind, { kind, label: ANONYMIZER_LABELS[kind] ?? titleCase(kind) });
      }
    }
  }
  const anonState = (values: boolean[]): AnonymizerState =>
    values.length === 0 ? 'unknown' : values.some((v) => v) ? 'yes' : 'no';
  const anonymizerStatus: AnonymizerStatus = {
    vpn: anonState(anonBools.vpn),
    proxy: anonState(anonBools.proxy),
    tor: anonState(anonBools.tor),
  };
  // A checked negative (a real NO) is data too — an IP whose only signal is "Tor: NO" must render
  // the card (with the honest NO + unknowns), not fall through to the empty state.
  const hasAnonymizerData = ANONYMIZER_ORDER.some((k) => anonBools[k].length > 0);

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

  // Cloud / hosting — derived ONLY from the real `isp` / `usage_type` metadata (never fabricated).
  const rawIsp = asDisplayString(mergedMeta.isp);
  const rawUsageType = asDisplayString(mergedMeta.usage_type);
  const cloudHosting: CloudHosting = {
    provider: rawIsp ? cloudProviderLabel(rawIsp) : null,
    isp: rawIsp,
    usageType: rawUsageType,
  };
  // Real isp/usage_type is data too — an IP whose only signal is its ISP must render the card (with
  // the Cloud/Hosting row), not fall through to "no intelligence found".
  const hasCloudData = rawIsp !== null || rawUsageType !== null;

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
    hasAnonymizerData ||
    hasCloudData ||
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
    anonymizerStatus,
    cloudHosting,
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
