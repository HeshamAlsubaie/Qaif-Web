import { type UseQueryResult } from '@tanstack/react-query';
import * as React from 'react';

import { EmptyState, ErrorState, LoadingState } from '@/components/common/States';
import { describeApiError } from '@/lib/apiError';

interface QueryBoundaryProps<T> {
  query: UseQueryResult<T>;
  /** Return true when the (successful) data should render as empty rather than as content. */
  isEmpty?: (data: T) => boolean;
  emptyTitle?: string;
  emptyMessage?: React.ReactNode;
  loadingMessage?: string;
  children: (data: T) => React.ReactNode;
}

/**
 * Maps a TanStack Query result to the three distinct visual states, keeping "failed to load"
 * (ErrorState) strictly separate from "loaded but empty" (EmptyState). The caller decides
 * emptiness via `isEmpty` — the boundary never guesses that an error means no data.
 */
export function QueryBoundary<T>({
  query,
  isEmpty,
  emptyTitle,
  emptyMessage,
  loadingMessage,
  children,
}: QueryBoundaryProps<T>) {
  if (query.isPending) return <LoadingState message={loadingMessage ?? 'Loading…'} />;
  if (query.isError) {
    const { title, message } = describeApiError(query.error);
    return <ErrorState title={title} message={message} onRetry={() => void query.refetch()} />;
  }
  if (isEmpty?.(query.data)) {
    return <EmptyState title={emptyTitle ?? 'No data yet'} message={emptyMessage} />;
  }
  return <>{children(query.data)}</>;
}
