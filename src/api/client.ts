import type { z } from 'zod';

/**
 * The fetch foundation for the read-only QAIF backend.
 *
 * Stage A scaffolds this but makes NO live calls — views wire it in stages B/C. Two guarantees are
 * built in from the start:
 *   - the base URL comes only from the environment (`VITE_API_BASE_URL`), never hardcoded per-call;
 *   - every response is validated against its Zod schema before it reaches a component, so an
 *     unexpected or malformed payload is a typed error at the boundary, not a silent render.
 */

const DEFAULT_BASE_URL = 'http://localhost:8000';

/** Resolve the backend base URL from the environment, without a trailing slash. */
export function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL ?? DEFAULT_BASE_URL;
  return raw.replace(/\/+$/, '');
}

/** A structured API failure: a non-2xx response, a network error, or a schema-validation failure. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly kind: 'http' | 'network' | 'validation',
    readonly status?: number,
    readonly detail?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  signal?: AbortSignal;
  /**
   * Extra request headers, merged AFTER Accept/Content-Type so a caller can add the IAM stand-in
   * headers the write routes read (`x-qaif-role`, `x-qaif-actor`). Reads never pass these.
   */
  headers?: Record<string, string>;
}

/**
 * Perform a request against the backend and validate the JSON response with `schema`.
 * Throws {@link ApiError} on transport, HTTP, or validation failure.
 */
export async function apiRequest<T>(
  path: string,
  schema: z.ZodType<T>,
  options: RequestOptions = {},
): Promise<T> {
  const url = `${getApiBaseUrl()}${path}`;
  const init: RequestInit = {
    method: options.method ?? 'GET',
    headers: { Accept: 'application/json' },
    ...(options.signal ? { signal: options.signal } : {}),
  };
  if (options.body !== undefined) {
    init.headers = { ...init.headers, 'Content-Type': 'application/json' };
    init.body = JSON.stringify(options.body);
  }
  if (options.headers) {
    // Caller-supplied headers win, so the write routes' role/actor stand-ins are always applied.
    init.headers = { ...init.headers, ...options.headers };
  }

  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (cause) {
    throw new ApiError(`Network request to ${path} failed`, 'network', undefined, cause);
  }

  if (!response.ok) {
    const detail = await safeJson(response);
    throw new ApiError(
      `Request to ${path} failed (${response.status})`,
      'http',
      response.status,
      detail,
    );
  }

  const json = await safeJson(response);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    throw new ApiError(
      `Response from ${path} failed validation`,
      'validation',
      response.status,
      parsed.error.format(),
    );
  }
  return parsed.data;
}

async function safeJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}
