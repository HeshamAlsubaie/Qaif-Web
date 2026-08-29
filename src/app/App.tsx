import { type ReactElement } from 'react';
import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom';

import { CaseProvider } from '@/app/CaseContext';
import { AppShell } from '@/components/shell/AppShell';
import { NAV_SECTIONS } from '@/components/shell/navConfig';
import { CryptoPage } from '@/features/crypto/CryptoPage';
import { DesignSystemPage } from '@/features/design-system/DesignSystemPage';
import { EvidencePage } from '@/features/evidence/EvidencePage';
import { GraphPage } from '@/features/graph/GraphPage';
import { IpsPage } from '@/features/ips/IpsPage';
import { LandingPage } from '@/features/landing/LandingPage';
import { OpenCasePage } from '@/features/landing/OpenCasePage';
import { ToolShell } from '@/features/landing/ToolShell';
import { SandboxPage } from '@/features/sandbox/SandboxPage';
import { AlertActionPage } from '@/features/wazuh/AlertActionPage';
import { WazuhAlertsPage } from '@/features/wazuh/WazuhAlertsPage';
import { OverviewPage } from '@/features/overview/OverviewPage';
import { StageCPage } from '@/features/placeholder/StageCPage';
import { ReportPage } from '@/features/report/ReportPage';
import { SearchPage } from '@/features/search/SearchPage';
import { SuggestionsPage } from '@/features/suggestions/SuggestionsPage';
import { ThreatsPage } from '@/features/threats/ThreatsPage';
import { TimelinePage } from '@/features/timeline/TimelinePage';

// Built section pages (Stage C1). Any nav section without an entry here routes to the honest
// Stage C placeholder, so the whole console stays navigable.
const PAGES: Record<string, ReactElement> = {
  '/search': <SearchPage />,
  '/overview': <OverviewPage />,
  '/threats': <ThreatsPage />,
  '/ips': <IpsPage />,
  '/crypto': <CryptoPage />,
  '/graph': <GraphPage />,
  '/timeline': <TimelinePage />,
  '/evidence': <EvidencePage />,
  '/suggestions': <SuggestionsPage />,
  '/report': <ReportPage />,
};

const sectionRoutes = NAV_SECTIONS.filter((s) => s.path !== '/').map((s) => ({
  path: s.path.replace(/^\//, ''),
  element: PAGES[s.path] ?? <StageCPage />,
}));

const router = createBrowserRouter([
  // Search-first front door: '/' is the bare full-screen search console — NO shell, NO sidebar. It
  // renders its own minimal brand chrome. Only a CASE gets the full AppShell navigator (below).
  { path: '/', element: <LandingPage /> },

  // Free-search TOOLS reachable from the landing — bare (ToolShell), NO console sidebar, because
  // they are case-INDEPENDENT. Stage 2/3 build their guts; for now each is honest, never faked.
  {
    // The Wazuh SIEM feed — read-only signal source, bare (no case sidebar), case-INDEPENDENT.
    path: 'alerts',
    element: (
      <ToolShell>
        <WazuhAlertsPage />
      </ToolShell>
    ),
  },
  {
    // Alert action page: click a feed row → decide what to do (search / open a case).
    path: 'alerts/:id',
    element: (
      <ToolShell>
        <AlertActionPage />
      </ToolShell>
    ),
  },
  {
    // The public "drop a file for malware analysis" sandbox — bare (no case sidebar), case-
    // INDEPENDENT. A free public submission to Triage: no case, no custody, never evidence.
    path: 'sandbox',
    element: (
      <ToolShell>
        <SandboxPage />
      </ToolShell>
    ),
  },
  {
    path: 'cases/new',
    element: (
      <ToolShell>
        <OpenCasePage />
      </ToolShell>
    ),
  },

  {
    // Pathless layout route: the CASE console — wrapped in the AppShell (full sidebar nav). This is
    // the only surface with the navigator, and it means something only once a case is selected.
    element: <AppShell />,
    children: [
      ...sectionRoutes,
      { path: 'design-system', element: <DesignSystemPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

/**
 * The console app: shell + router. Server state (TanStack Query) is provided in providers.tsx; the
 * selected case lives in CaseProvider so every view shares one case context.
 */
export function App() {
  return (
    <CaseProvider>
      <RouterProvider router={router} />
    </CaseProvider>
  );
}
