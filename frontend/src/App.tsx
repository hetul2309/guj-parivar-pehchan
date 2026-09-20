import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Header } from './components/shared/Header';
import { LoginPage } from './pages/login/LoginPage';
import { RegisterPage } from './pages/login/RegisterPage';
import { CitizenDashboard } from './pages/citizen/CitizenDashboard';
import { OperatorKiosk } from './pages/operator/OperatorKiosk';
import { IdentityReviewPage } from './pages/officer/IdentityReviewPage';
import { OfficerGrievancePage } from './pages/officer/OfficerGrievancePage';
import { SmsOutboxPage } from './pages/debug/SmsOutboxPage';
import { ShieldAlert, ArrowRight } from 'lucide-react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Officer & Administrative Pages
import OfficerDashboardPage from './pages/officer/DashboardPage';
import OfficerMapPage from './pages/officer/MapPage';
import OfficerApplicationsPage from './pages/officer/ApplicationsPage';
import OfficerMigrationsPage from './pages/officer/MigrationsPage';
import AdminSchemesPage from './pages/admin/SchemesPage';
import AdminAuditPage from './pages/admin/AuditPage';
import CitizenPrivacyPage from './pages/citizen/privacy/PrivacyPage';

// Role Guard Component
const RoleGuard: React.FC<{ allowedRoles: string[]; children: React.ReactElement }> = ({ allowedRoles, children }) => {
  const userJson = localStorage.getItem('family_id_user');
  const user = userJson ? JSON.parse(userJson) : null;
  const role = user?.role || 'citizen';

  // super_admin has master access to all portals
  if (!allowedRoles.includes(role) && role !== 'super_admin') {
    return (
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm max-w-lg mx-auto text-center space-y-4 my-12 animate-fade-in">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-black text-slate-900">વિશેષાધિકાર વિભાગ (Restricted Section)</h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          આ વિભાગ માત્ર અધિકૃત VCE ઓપરેટર અથવા સરકારી ચકાસણી અધિકારીઓ માટે છે. નાગરિક તરીકે તમે તમારા નાગરિક પોર્ટલનો ઉપયોગ કરી શકો છો.
        </p>
        <p className="text-xs text-slate-400">
          This portal section is reserved for verified Operators and Government Officers.
        </p>
        <div className="pt-2">
          <Link
            to="/citizen"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl shadow-sm transition"
          >
            <span>નાગરિક પોર્ટલ પર જાઓ (Go to Citizen Portal)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  return children;
};

export const App: React.FC = () => {
  const { i18n } = useTranslation();
  const userJson = localStorage.getItem('family_id_user');
  const user = userJson ? JSON.parse(userJson) : null;
  const defaultHome = user?.role === 'operator' ? '/operator' : (user?.role === 'citizen' || !user ? '/citizen' : '/officer/dashboard');

  return (
    <Router>
      <div key={i18n.language} className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 antialiased selection:bg-teal-600 selection:text-white">
        <ToastContainer />
        <Header />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Routes>
            <Route path="/" element={<Navigate to={defaultHome} replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/signup" element={<RegisterPage />} />
            
            {/* Citizen Core Routes (Accessible to Citizen, Operator, Officer) */}
            <Route path="/citizen/*" element={<CitizenDashboard />} />
            <Route path="/citizen/privacy" element={<CitizenPrivacyPage />} />

            {/* Operator Routes (Accessible only to Operator and Super Admin) */}
            <Route
              path="/operator/*"
              element={
                <RoleGuard allowedRoles={['operator']}>
                  <OperatorKiosk />
                </RoleGuard>
              }
            />

            {/* Officer Routes (Accessible only to Officer, Dept Admin and Super Admin) */}
            <Route
              path="/officer/dashboard"
              element={
                <RoleGuard allowedRoles={['officer', 'dept_admin']}>
                  <OfficerDashboardPage />
                </RoleGuard>
              }
            />
            <Route
              path="/officer/applications"
              element={
                <RoleGuard allowedRoles={['officer', 'dept_admin']}>
                  <OfficerApplicationsPage />
                </RoleGuard>
              }
            />
            <Route
              path="/officer/map"
              element={
                <RoleGuard allowedRoles={['officer', 'dept_admin']}>
                  <OfficerMapPage />
                </RoleGuard>
              }
            />
            <Route
              path="/officer/identity-review"
              element={
                <RoleGuard allowedRoles={['officer']}>
                  <IdentityReviewPage />
                </RoleGuard>
              }
            />
            <Route
              path="/officer/grievances"
              element={
                <RoleGuard allowedRoles={['officer']}>
                  <OfficerGrievancePage />
                </RoleGuard>
              }
            />
            <Route
              path="/officer/migrations"
              element={
                <RoleGuard allowedRoles={['officer']}>
                  <OfficerMigrationsPage />
                </RoleGuard>
              }
            />

            {/* Department Admin Routes */}
            <Route
              path="/admin/schemes"
              element={
                <RoleGuard allowedRoles={['dept_admin', 'officer']}>
                  <AdminSchemesPage />
                </RoleGuard>
              }
            />
            <Route
              path="/admin/audit"
              element={
                <RoleGuard allowedRoles={['dept_admin']}>
                  <AdminAuditPage />
                </RoleGuard>
              }
            />

            {/* Debug Route */}
            <Route
              path="/sms-outbox"
              element={
                <RoleGuard allowedRoles={['officer', 'dept_admin']}>
                  <SmsOutboxPage />
                </RoleGuard>
              }
            />

            <Route path="*" element={<Navigate to={defaultHome} replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;
