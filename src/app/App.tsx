import { type ReactElement } from 'react';
import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom';

import { CaseProvider } from '@/app/CaseContext';
import { AppShell } from '@/components/shell/AppShell';
import { NAV_SECTIONS } from '@/components/shell/navConfig';
import { DesignSystemPage } from '@/features/design-system/DesignSystemPage';
import { EvidencePage } from '@/features/evidence/EvidencePage';
import { IpsPage } from '@/features/ips/IpsPage';
import { OverviewPage } from '@/features/overview/OverviewPage';
import { StageCPage } from '@/features/placeholder/StageCPage';
import { ReportPage } from '@/features/report/ReportPage';
import { SuggestionsPage } from '@/features/suggestions/SuggestionsPage';
import { ThreatsPage } from '@/features/threats/ThreatsPage';

// Built section pages (Stage C1). Any nav section without an entry here routes to the honest
// Stage C placeholder, so the whole console stays navigable.
const PAGES: Record<string, ReactElement> = {
  '/threats': <ThreatsPage />,
  '/ips': <IpsPage />,
  '/evidence': <EvidencePage />,
  '/suggestions': <SuggestionsPage />,
  '/report': <ReportPage />,
};

const sectionRoutes = NAV_SECTIONS.filter((s) => s.path !== '/').map((s) => ({
  path: s.path.replace(/^\//, ''),
  element: PAGES[s.path] ?? <StageCPage />,
}));

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <OverviewPage /> },
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
