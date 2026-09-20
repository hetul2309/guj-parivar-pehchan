import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Header } from './components/shared/Header';
import { LoginPage } from './pages/login/LoginPage';
import { RegisterPage } from './pages/login/RegisterPage';
import { CitizenDashboard } from './pages/citizen/CitizenDashboard';
import { OperatorKiosk } from './pages/operator/OperatorKiosk';
import { IdentityReviewPage } from './pages/officer/IdentityReviewPage';
import { OfficerGrievancePage } from './pages/officer/OfficerGrievancePage';
import { SmsOutboxPage } from './pages/debug/SmsOutboxPage';

// Member B Integrated Pages
import OfficerDashboardPage from './pages/officer/DashboardPage';
import OfficerMapPage from './pages/officer/MapPage';
import OfficerApplicationsPage from './pages/officer/ApplicationsPage';
import OfficerMigrationsPage from './pages/officer/MigrationsPage';
import AdminSchemesPage from './pages/admin/SchemesPage';
import AdminAuditPage from './pages/admin/AuditPage';
import CitizenPrivacyPage from './pages/citizen/privacy/PrivacyPage';

export const App: React.FC = () => {
  return (
    <Router>
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 antialiased selection:bg-teal-600 selection:text-white">
        <Header />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Routes>
            <Route path="/" element={<Navigate to="/citizen" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/signup" element={<RegisterPage />} />
            
            {/* Member A Core Routes */}
            <Route path="/citizen/*" element={<CitizenDashboard />} />
            <Route path="/operator/*" element={<OperatorKiosk />} />
            <Route path="/officer/identity-review" element={<IdentityReviewPage />} />
            <Route path="/officer/grievances" element={<OfficerGrievancePage />} />
            <Route path="/sms-outbox" element={<SmsOutboxPage />} />

            {/* Member B Core Routes */}
            <Route path="/officer/dashboard" element={<OfficerDashboardPage />} />
            <Route path="/officer/map" element={<OfficerMapPage />} />
            <Route path="/officer/applications" element={<OfficerApplicationsPage />} />
            <Route path="/officer/migrations" element={<OfficerMigrationsPage />} />
            <Route path="/admin/schemes" element={<AdminSchemesPage />} />
            <Route path="/admin/audit" element={<AdminAuditPage />} />
            <Route path="/citizen/privacy" element={<CitizenPrivacyPage />} />

            <Route path="*" element={<Navigate to="/citizen" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;

