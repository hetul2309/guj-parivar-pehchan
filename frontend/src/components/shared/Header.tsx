import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Wifi, WifiOff, LogOut, UserCircle2, ArrowRightLeft, LayoutDashboard, Lock, Layers } from 'lucide-react';

export const Header: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const userJson = localStorage.getItem('family_id_user');
  const user = userJson ? JSON.parse(userJson) : null;
  const role = user?.role; // 'citizen', 'operator', 'officer', 'dept_admin', 'super_admin'

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('gujid_lang', lang);
  };

  const handleLogout = () => {
    localStorage.removeItem('family_id_token');
    localStorage.removeItem('family_id_user');
    localStorage.removeItem('gujid_token');
    localStorage.removeItem('gujid_role');
    localStorage.removeItem('gujid_display_name');
    localStorage.removeItem('gujid_district');
    localStorage.removeItem('gujid_family_id');
    navigate('/login');
  };

  const isLoginPage = location.pathname === '/login' || location.pathname === '/register' || location.pathname === '/signup';

  // Role-Specific Navigation Links
  const getNavLinks = () => {
    if (!user || role === 'citizen') {
      // Regular citizens only see citizen-relevant links
      return [
        { to: '/citizen', label: t('navCitizen') },
        { to: '/citizen/privacy', label: t('navPrivacy') }
      ];
    }
    if (role === 'operator') {
      // VCE operators see Kiosk and Citizen card verification
      return [
        { to: '/operator', label: t('navOperator') },
        { to: '/citizen', label: t('citizenView') }
      ];
    }
    if (role === 'officer') {
      // Verification officers see approval dashboard, applications, map and citizen view
      return [
        { to: '/officer/dashboard', label: t('navDashboard'), icon: LayoutDashboard },
        { to: '/officer/applications', label: t('navApplications') },
        { to: '/officer/map', label: t('navMap') },
        { to: '/officer/grievances', label: t('navGrievance') },
        { to: '/citizen', label: t('citizenView') }
      ];
    }
    if (role === 'dept_admin') {
      // Department admins see scheme studio, audit and dashboard
      return [
        { to: '/admin/schemes', label: t('navSchemes') },
        { to: '/admin/audit', label: t('navAudit') },
        { to: '/officer/dashboard', label: t('navDashboard'), icon: LayoutDashboard }
      ];
    }
    // super_admin sees administrative controls
    return [
      { to: '/officer/dashboard', label: t('navDashboard'), icon: LayoutDashboard },
      { to: '/officer/map', label: t('navMap') },
      { to: '/admin/schemes', label: t('navSchemes') },
      { to: '/admin/audit', label: t('navAudit') },
      { to: '/operator', label: t('navOperator') },
      { to: '/citizen', label: t('navCitizen') }
    ];
  };

  const navLinks = getNavLinks();

  return (
    <header className="sticky top-0 z-50 w-full h-16 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur-md transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
        <div className="flex items-center justify-between h-full gap-2">
          {/* Left: Brand Logo & Title with Govt of Gujarat Badge */}
          <Link
            to={role === 'operator' ? '/operator' : (role === 'citizen' || !role ? '/citizen' : '/officer/dashboard')}
            className="flex items-center gap-3 group shrink-0"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-700 to-teal-500 flex items-center justify-center text-white font-black text-xl shadow-sm group-hover:scale-105 transition-transform duration-200">
              ગુ
            </div>
            <div>
              <div className="font-extrabold text-slate-900 tracking-tight text-base flex items-center gap-2">
                <span>{t('appName')}</span>
                <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                  {t('govtBadge')}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 font-medium hidden md:block">
                {t('tagline')}
              </div>
            </div>
          </Link>

          {/* Center: Strict Role-Based Primary Navigation */}
          <nav className="hidden md:flex items-center gap-1.5">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.to || (link.to !== '/' && location.pathname.startsWith(link.to));
              const Icon = link.icon;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-teal-700 text-white shadow-xs'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {Icon && <Icon className="w-3.5 h-3.5" />}
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right: Online Status, Multilingual Switcher, Persona / Login Control */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Online / Offline status */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition ${
                isOnline
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-xs'
                  : 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
              }`}
            >
              {isOnline ? <Wifi className="w-3.5 h-3.5 text-emerald-600" /> : <WifiOff className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isOnline ? t('online') : t('offline')}</span>
            </div>

            {/* Language Switcher (GU / EN / HI) */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs">
              {(['gu', 'en', 'hi'] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => handleLanguageChange(lang)}
                  className={`px-2.5 py-1 rounded-lg font-extrabold transition duration-150 ${
                    i18n.language === lang
                      ? 'bg-teal-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {lang === 'gu' ? 'ગુ' : lang.toUpperCase()}
                </button>
              ))}
            </div>

            {/* User Profile / Switcher / Login */}
            {user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="hidden lg:block text-right">
                  <div className="text-xs font-bold text-slate-900 leading-tight">
                    {user.display_name}
                  </div>
                  <div className="text-[10px] text-teal-700 font-bold uppercase tracking-wider">
                    {user.role} {user.district_code ? `· ${user.district_code}` : ''}
                  </div>
                </div>

                {/* Switch Persona Button */}
                <Link
                  to="/login"
                  title={t('switchRole')}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-800 border border-slate-200 hover:border-teal-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 text-teal-700" />
                  <span className="hidden sm:inline">{t('switchRole')}</span>
                </Link>

                {/* Logout Button */}
                <button
                  type="button"
                  onClick={handleLogout}
                  title={t('logout')}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : isLoginPage ? (
              <div className="px-3 py-1.5 bg-teal-50 text-teal-800 border border-teal-200 text-xs font-extrabold rounded-xl">
                {t('demoPortal')}
              </div>
            ) : (
              <Link
                to="/login"
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5"
              >
                <UserCircle2 className="w-4 h-4" />
                <span>{t('login')}</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
