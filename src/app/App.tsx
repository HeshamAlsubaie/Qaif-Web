import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom';

import { CaseProvider } from '@/app/CaseContext';
import { AppShell } from '@/components/shell/AppShell';
import { NAV_SECTIONS } from '@/components/shell/navConfig';
import { DesignSystemPage } from '@/features/design-system/DesignSystemPage';
import { OverviewPage } from '@/features/overview/OverviewPage';
import { StageCPage } from '@/features/placeholder/StageCPage';

// Overview is fully built; every other nav section routes to the honest Stage C page. The Stage A
// design-system showcase stays reachable at /design-system (not in the nav).
const sectionRoutes = NAV_SECTIONS.filter((s) => s.stageC).map((s) => ({
  path: s.path.replace(/^\//, ''),
  element: <StageCPage />,
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
 * Stage B app: the console shell + router. Server state (TanStack Query) is provided above in
 * providers.tsx; the selected case lives in CaseProvider so every view shares one case context.
 */
export function App() {
  return (
    <CaseProvider>
      <RouterProvider router={router} />
    </CaseProvider>
  );
}
