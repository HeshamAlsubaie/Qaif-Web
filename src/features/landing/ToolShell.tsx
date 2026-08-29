import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

import { BrandMark } from './BrandMark';

/**
 * Bare chrome for a free-search TOOL page (sandbox, Wazuh alerts, open-a-case). Like the landing and
 * unlike the console, it has NO sidebar navigator: these are case-INDEPENDENT tools, and the full
 * navigator belongs only to an opened case. It offers just the brand mark and a way back to search.
 */
export function ToolShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-surface-0">
      <header className="flex items-center justify-between gap-4 border-b border-border bg-surface-2 px-6 py-3.5">
        <Link to="/" aria-label="QAIF — back to search" className="rounded-md">
          <BrandMark />
        </Link>
        <Link
          to="/"
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-caption font-medium text-muted-foreground transition-colors hover:bg-surface-3 hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to search
        </Link>
      </header>
      <main className="mx-auto w-full max-w-[1080px] flex-1 px-6 py-10">{children}</main>
    </div>
  );
}
