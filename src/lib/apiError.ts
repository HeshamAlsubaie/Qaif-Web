import { ApiError, getApiBaseUrl } from '@/api/client';

/**
 * Turn any thrown error into a title + message for an ErrorState. Crucially it distinguishes a
 * transport/HTTP/validation failure (a real error) from emptiness — a forensic tool must never
 * present "failed to load" as if it were "no data".
 */
export function describeApiError(error: unknown): { title: string; message: string } {
  if (error instanceof ApiError) {
    if (error.kind === 'network') {
      return {
        title: 'API unreachable',
        message: `Cannot reach the API at ${getApiBaseUrl()}. Is the backend running?`,
      };
    }
    if (error.kind === 'validation') {
      return {
        title: 'Contract mismatch',
        message:
          'The API response did not match the expected schema. This is a version drift, not empty data.',
      };
    }
    // The backend's own message (a FastAPI `detail`) is the most honest thing to show for a rejected
    // write — e.g. "Investigator role required" (403) or the mandatory-reason 422 — so prefer it.
    const detail = backendDetail(error);
    if (error.status === 403) {
      return { title: 'Not permitted', message: detail ?? 'This action requires the Investigator role.' };
    }
    if (error.status === 404) {
      return { title: 'Not found', message: detail ?? 'The requested case or resource does not exist.' };
    }
    if (error.status === 422) {
      return { title: 'Rejected', message: detail ?? 'The request was rejected as invalid.' };
    }
    return {
      title: 'Request failed',
      message: detail ?? `The API returned ${error.status ?? 'an error'}.`,
    };
  }
  return {
    title: 'Request failed',
    message: error instanceof Error ? error.message : 'An unknown error occurred.',
  };
}

/**
 * Extract a human-readable message from a FastAPI error body. A raised `HTTPException` serializes as
 * `{ detail: "..." }`; a validation failure as `{ detail: [{ msg, ... }] }`. Return the string form
 * of whichever is present, or `undefined` so the caller keeps its own default message.
 */
function backendDetail(error: ApiError): string | undefined {
  const body = error.detail;
  if (!body || typeof body !== 'object' || !('detail' in body)) return undefined;
  const inner = (body as { detail: unknown }).detail;
  if (typeof inner === 'string') return inner;
  if (Array.isArray(inner)) {
    const first = inner[0];
    if (first && typeof first === 'object' && 'msg' in first) {
      const msg = (first as { msg: unknown }).msg;
      if (typeof msg === 'string') return msg;
    }
  }
  return undefined;
}
