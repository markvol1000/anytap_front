import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminLayout } from './components/AdminLayout.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { MembersPage } from './pages/MembersPage.jsx';
import { KycPage } from './pages/KycPage.jsx';
import { CardsPage } from './pages/CardsPage.jsx';
import { WalletsPage } from './pages/WalletsPage.jsx';
import { TransactionsPage } from './pages/TransactionsPage.jsx';
import { ReferralPage } from './pages/ReferralPage.jsx';
import { WithdrawalsPage } from './pages/WithdrawalsPage.jsx';
import { NotificationsPage } from './pages/NotificationsPage.jsx';
import { ContentPage } from './pages/ContentPage.jsx';
import { SettingsPage } from './pages/SettingsPage.jsx';
import { AdminLogsPage } from './pages/AdminLogsPage.jsx';
import '../styles/admin.css';

export function AdminApp() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="members" element={<MembersPage />} />
        <Route path="kyc" element={<KycPage />} />
        <Route path="cards" element={<CardsPage />} />
        <Route path="wallets" element={<WalletsPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="referral" element={<ReferralPage />} />
        <Route path="withdrawals" element={<WithdrawalsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="content" element={<ContentPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="logs" element={<AdminLogsPage />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>
    </Routes>
  );
}
