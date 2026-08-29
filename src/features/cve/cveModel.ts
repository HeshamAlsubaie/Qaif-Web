/**
 * Turn a `POST /lookup` response (detected_type === 'cve') into a typed dashboard model.
 *
 * Nothing here fabricates: each source's `payload.metadata` is validated with the CVE Zod schemas
 * (a view-level boundary on top of the lookup boundary that already pinned every result as an
 * external-source CLAIM). A source that is not `ok`, or whose metadata fails validation, contributes
 * `null` — the dashboard then OMITS that section rather than inventing a value. The five sources'
 * statuses (ok / not_found / not_configured) are surfaced verbatim for the status row.
 */
import {
  cveNvdMetadataSchema,
  cveOtxContextSchema,
  cveSourcePayloadSchema,
  cveVtContextSchema,
} from '@/types/schemas';
import type {
  CveNvdMetadata,
  CveOtxContext,
  CveVtContext,
  LookupResponse,
  LookupSourceResult,
} from '@/types/api';

export interface CveSourceStatus {
  source: string;
  family: string;
  status: string; // 'ok' | 'not_found' | 'not_configured' | 'error'
}

export interface CveModel {
  cveId: string;
  indicator: string;
  nvd: CveNvdMetadata | null;
  otx: CveOtxContext | null;
  vt: CveVtContext | null;
  /** All sources that answered, in a canonical order for the status row. */
  sources: CveSourceStatus[];
}

// Canonical display order for the source-status row; unknown sources sort after these, by name.
const SOURCE_ORDER = ['NVD', 'OTX', 'VirusTotal', 'MISP', 'OpenCTI'];

function metadataOf(result: LookupSourceResult): Record<string, unknown> {
  const parsed = cveSourcePayloadSchema.safeParse(result.payload);
  return parsed.success && parsed.data.metadata ? parsed.data.metadata : {};
}

export function buildCveModel(data: LookupResponse): CveModel {
  const byName = new Map(data.results.map((r) => [r.source, r]));

  const nvdResult = byName.get('NVD');
  let nvd: CveNvdMetadata | null = null;
  if (nvdResult && nvdResult.status === 'ok') {
    const parsed = cveNvdMetadataSchema.safeParse(metadataOf(nvdResult));
    if (parsed.success) nvd = parsed.data;
  }

  const otxResult = byName.get('OTX');
  let otx: CveOtxContext | null = null;
  if (otxResult && otxResult.status === 'ok') {
    const parsed = cveOtxContextSchema.safeParse(metadataOf(otxResult));
    if (parsed.success) otx = parsed.data;
  }

  const vtResult = byName.get('VirusTotal');
  let vt: CveVtContext | null = null;
  if (vtResult && vtResult.status === 'ok') {
    const parsed = cveVtContextSchema.safeParse(metadataOf(vtResult));
    if (parsed.success) vt = parsed.data;
  }

  const sources: CveSourceStatus[] = data.results
    .map((r) => ({ source: r.source, family: r.family, status: r.status }))
    .sort((a, b) => {
      const ia = SOURCE_ORDER.indexOf(a.source);
      const ib = SOURCE_ORDER.indexOf(b.source);
      if (ia !== ib) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      return a.source.localeCompare(b.source);
    });

  return {
    cveId: nvd?.cve_id ?? data.indicator.toUpperCase(),
    indicator: data.indicator,
    nvd,
    otx,
    vt,
    sources,
  };
}

// -- helpers -----------------------------------------------------------------

/**
 * NVD emits UTC timestamps WITHOUT an offset (e.g. `2021-12-10T10:15:09.143`). Append `Z` when no
 * timezone designator is present so the instant is parsed as UTC (R8) rather than shifted through
 * the browser's local zone. A string that already carries `Z` or a `±hh:mm` offset is left intact.
 */
export function asUtcIso(value: string): string {
  return /([zZ])|([+-]\d{2}:?\d{2})$/.test(value) ? value : `${value}Z`;
}

export interface ParsedCpe {
  vendor: string | null;
  product: string | null;
  version: string | null;
  raw: string;
}

/**
 * Parse a CPE 2.3 URI (`cpe:2.3:a:vendor:product:version:...`) into vendor/product/version for a
 * readable row. A field of `*` or `-` (CPE's "any"/"n/a") becomes null. A string that isn't a CPE
 * 2.3 URI returns all-null with the raw value preserved, so it is shown verbatim, never dropped.
 */
export function parseCpe(cpe: string): ParsedCpe {
  const parts = cpe.split(':');
  if (parts.length < 6 || parts[0] !== 'cpe' || parts[1] !== '2.3') {
    return { vendor: null, product: null, version: null, raw: cpe };
  }
  const clean = (s: string): string | null => (s === '*' || s === '-' || s === '' ? null : s);
  const titleize = (s: string | null): string | null => (s ? s.replace(/_/g, ' ') : null);
  return {
    vendor: titleize(clean(parts[3])),
    product: titleize(clean(parts[4])),
    version: clean(parts[5]),
    raw: cpe,
  };
}
