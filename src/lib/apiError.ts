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
    if (error.status === 404) {
      return { title: 'Not found', message: 'The requested case or resource does not exist.' };
    }
    return {
      title: 'Request failed',
      message: `The API returned ${error.status ?? 'an error'}.`,
    };
  }
  return {
    title: 'Request failed',
    message: error instanceof Error ? error.message : 'An unknown error occurred.',
  };
}
