import { Suspense, lazy } from 'react';
import { Routes, Route, Outlet, Navigate } from 'react-router-dom';
import { PageShell } from './components/chrome.jsx';
import { Seo } from './components/Seo.tsx';
import { appRoutes } from './routes.jsx';
import { NotFoundPage } from './pages/NotFoundPage.jsx';
import { DemoStatesPage, DemoStateEnterPage } from './pages/DemoStatesPage.jsx';
import { hasMemberSession } from './lib/services/authService.js';
import { SCREEN_ROUTES } from './constants/routes.ts';

import { AnyBotPage } from './pages/AnyBotPage.jsx';

const AccountApp = lazy(() =>
  import('./pages/AccountApp.jsx').then((mod) => ({ default: mod.AccountApp })),
);

const AdminApp = lazy(() =>
  import('./admin/AdminApp.jsx').then((mod) => ({ default: mod.AdminApp })),
);

function AppLayout() {
  return (
    <PageShell>
      <Suspense fallback={null}>
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
            <Suspense fallback={<div className="admin-shell admin-shell--gate"><p className="admin-loading">Loading admin…</p></div>}>
              <AdminApp />
            </Suspense>
          }
        />
        <Route path="/admin/hanzb" element={<AnyBotPage />} />
        <Route path="/admin/hanzb/*" element={<AnyBotPage />} />
        <Route
          path="/account/*"
          element={
            <Suspense fallback={<div className="portal-sk-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}><div className="portal-spin" style={{ width: 32, height: 32 }} /></div>}>
              <AccountApp />
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
