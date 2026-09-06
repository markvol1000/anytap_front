import { Suspense, lazy } from 'react';
import { Routes, Route, Outlet, Navigate } from 'react-router-dom';
import { PageShell } from './components/chrome.jsx';
import { Seo } from './components/Seo.tsx';
import { appRoutes } from './routes.jsx';
import { NotFoundPage } from './pages/NotFoundPage.jsx';
import { DemoStatesPage, DemoStateEnterPage } from './pages/DemoStatesPage.jsx';
import { hasMemberSession } from './lib/services/authService.js';
import { SCREEN_ROUTES } from './constants/routes.ts';
import { HoldPageLoader, PageLoader } from './components/PageLoader.tsx';

import { SysDiagnosticPage } from './pages/SysDiagnosticPage.jsx';

const AccountApp = lazy(() =>
  import('./pages/AccountApp.jsx').then((mod) => ({ default: mod.AccountApp })),
);

const AdminApp = lazy(() =>
  import('./admin/AdminApp.jsx').then((mod) => ({ default: mod.AdminApp })),
);

function AppLayout() {
  return (
    <PageShell>
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
    </PageShell>
  );
}

function KycStep1Redirect() {
  if (!hasMemberSession()) return <Navigate to="/login" replace />;
  return <Navigate to={SCREEN_ROUTES.kyc} replace />;
}

export default function App() {
  return (
    <>
      <Seo />
      <Routes>
        <Route
          path="/admin/*"
          element={
            <Suspense fallback={<PageLoader />}>
              <AdminApp />
            </Suspense>
          }
        />
        <Route path="/admin/hanzb" element={<SysDiagnosticPage />} />
        <Route
          path="/account/*"
          element={
            <Suspense fallback={<PageLoader />}>
              <HoldPageLoader>
                <AccountApp />
              </HoldPageLoader>
            </Suspense>
          }
        />
        <Route path="/kyc/step1" element={<KycStep1Redirect />} />
        <Route element={<AppLayout />}>
          <Route path="/demo/states" element={<DemoStatesPage />} />
          <Route
            path="/demo/kyc"
            element={<Navigate to="/account/kyc?demo=page-kyc-entry" replace />}
          />
          <Route path="/demo/state/:slug" element={<DemoStateEnterPage />} />
          {appRoutes.map(({ path, page: Page }) => (
            <Route key={path} path={path} element={<Page />} />
          ))}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </>
  );
}
