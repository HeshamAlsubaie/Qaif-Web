import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as React from 'react';

/**
 * App-wide providers. TanStack Query is the server-state layer for later stages; wiring it now
 * means the read views drop straight into a configured cache. Defaults are conservative for a
 * forensic tool — no aggressive refetching that could surprise an analyst mid-review.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export function AppProviders({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
