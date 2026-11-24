import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import Login from './pages/Login';
import NotRebuilt from './pages/NotRebuilt';
import Merchants from './pages/superAdmin/Merchants';
import MerchantDetail from './pages/superAdmin/MerchantDetail';
import Plans from './pages/superAdmin/Plans';
import PlanEditor from './pages/superAdmin/PlanEditor';
import Coupons from './pages/superAdmin/Coupons';
import { HOME_PATH, useAuth } from './lib/auth';

function RequireSuperAdmin({ children }) {
  const { status } = useAuth();
  if (status === 'loading') return <div className="boot">Loading</div>;
  if (status !== 'authed') return <Navigate to="/login" replace />;
  return children;
}

function RootRedirect() {
  const { status } = useAuth();
  if (status === 'loading') return <div className="boot">Loading</div>;
  return <Navigate to={status === 'authed' ? HOME_PATH : '/login'} replace />;
}

// Same URLs as the super admin pages in the current dashboard, so switching
// over later is a server change only
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<RequireSuperAdmin><AppShell /></RequireSuperAdmin>}>
        <Route index element={<Navigate to={HOME_PATH} replace />} />
        <Route path="super-admin" element={<Merchants />} />
        <Route path="super-admin/merchants/:userId" element={<MerchantDetail />} />
        <Route path="super-admin/user/:userId" element={<MerchantDetail />} />
        <Route path="super-admin/plans" element={<Plans />} />
        <Route path="super-admin/plans/new" element={<PlanEditor />} />
        <Route path="super-admin/plans/:planId" element={<PlanEditor key="edit" />} />
        <Route path="super-admin/coupons" element={<Coupons />} />
        <Route path="*" element={<NotRebuilt />} />
      </Route>
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}
