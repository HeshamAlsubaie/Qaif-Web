/**
 * Safe narrowing of the opaque Triage `overview.json` into the handful of fields the report view
 * renders. The report arrives boundary-validated only as a JSON object (its full shape varies across
 * Triage versions and sample kinds), so every field here is defensively extracted with a type guard:
 * a missing or oddly-typed section degrades to null/empty, never a crash and never a fabricated value.
 *
 * The extraction mirrors the backend normalizer (modules/ingestion/sandbox/normalize.py): score is
 * read from `analysis` / `sample` / top-level (first integer wins), and signatures are gathered from
 * both the top-level `signatures` block and each target's own, de-duplicated by name.
 */

export interface SandboxSignature {
  name: string;
  desc: string | null;
  ttp: string[];
  score: number | null;
}

export interface SandboxTarget {
  target: string | null;
  family: string[];
  tags: string[];
  score: number | null;
}

export interface SandboxSample {
  target: string | null;
  sha256: string | null;
  md5: string | null;
  size: number | null;
  type: string | null;
}

export interface SandboxOverview {
  /** The overall Triage score (0–10), or null when the sample carries none (e.g. EICAR). */
  score: number | null;
  sample: SandboxSample;
  families: string[];
  signatures: SandboxSignature[];
  targets: SandboxTarget[];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function asInt(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) ? value : null;
}

/** A field that may be a single string or a list of strings (families, tags, ttp all vary). */
function asStringList(value: unknown): string[] {
  if (typeof value === 'string') return value.trim() ? [value.trim()] : [];
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter((item) => item.length > 0);
  }
  return [];
}

/** First integer `score` among the analysis / sample / top-level blocks (mirrors the backend). */
function extractScore(overview: Record<string, unknown>): number | null {
  for (const block of [overview.analysis, overview.sample, overview]) {
    const rec = asRecord(block);
    const score = rec ? asInt(rec.score) : null;
    if (score !== null) return score;
  }
  return null;
}

function extractSample(overview: Record<string, unknown>): SandboxSample {
  const sample = asRecord(overview.sample);
  const sizeRaw = sample ? sample.size : null;
  return {
    target: sample ? asString(sample.target) : null,
    sha256: sample ? asString(sample.sha256) : null,
    md5: sample ? asString(sample.md5) : null,
    size: typeof sizeRaw === 'number' ? sizeRaw : null,
    type: sample ? asString(sample.type) : null,
  };
}

function extractFamilies(overview: Record<string, unknown>): string[] {
  const families: string[] = [];
  const add = (value: unknown) => {
    for (const name of asStringList(value)) if (!families.includes(name)) families.push(name);
  };
  add(asRecord(overview.analysis)?.family);
  for (const target of asArray(overview.targets)) add(asRecord(target)?.family);
  for (const extracted of asArray(overview.extracted)) {
    add(asRecord(asRecord(extracted)?.config)?.family);
  }
  return families;
}

function toSignature(value: unknown): SandboxSignature | null {
  const sig = asRecord(value);
  if (!sig) return null;
  const name = asString(sig.name) ?? asString(sig.label);
  if (name === null) return null;
  return { name, desc: asString(sig.desc), ttp: asStringList(sig.ttp), score: asInt(sig.score) };
}

/** Signatures from the top-level block PLUS each target's own, de-duplicated by name. */
function extractSignatures(overview: Record<string, unknown>): SandboxSignature[] {
  const blocks: unknown[] = [overview.signatures];
  for (const target of asArray(overview.targets)) blocks.push(asRecord(target)?.signatures);

  const seen = new Set<string>();
  const signatures: SandboxSignature[] = [];
  for (const block of blocks) {
    for (const raw of asArray(block)) {
      const sig = toSignature(raw);
      if (sig && !seen.has(sig.name)) {
        seen.add(sig.name);
        signatures.push(sig);
      }
    }
  }
  return signatures;
}

function extractTargets(overview: Record<string, unknown>): SandboxTarget[] {
  return asArray(overview.targets).flatMap((raw) => {
    const target = asRecord(raw);
    if (!target) return [];
    return [
      {
        target: asString(target.target),
        family: asStringList(target.family),
        tags: asStringList(target.tags),
        score: asInt(target.score),
      },
    ];
  });
}

/** Narrow the opaque Triage overview into the fields the report view renders. Never throws. */
export function parseOverview(report: Record<string, unknown>): SandboxOverview {
  return {
    score: extractScore(report),
    sample: extractSample(report),
    families: extractFamilies(report),
    signatures: extractSignatures(report),
    targets: extractTargets(report),
  };
}
