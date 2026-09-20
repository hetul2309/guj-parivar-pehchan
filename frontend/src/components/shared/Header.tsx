import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Wifi,
  WifiOff,
  LogOut,
  UserCircle2,
  ArrowRightLeft,
  LayoutDashboard,
  Lock,
  Layers,
  Menu,
  X,
  MapPin,
  FileText,
  ShieldCheck,
  Smartphone,
  HelpCircle,
  UserCheck,
  Users
} from 'lucide-react';

export const Header: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Safely parse user from localStorage
  const getUserFromStorage = () => {
    try {
      const userJson = localStorage.getItem('family_id_user');
      if (userJson) {
        return JSON.parse(userJson);
      }
    } catch {
      // ignore
    }
    return null;
  };

  const [currentUser, setCurrentUser] = useState(getUserFromStorage());

  // Keep user updated on route change or storage updates
  useEffect(() => {
    setCurrentUser(getUserFromStorage());
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleStorage = () => {
      setCurrentUser(getUserFromStorage());
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

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

  const [currentLang, setCurrentLang] = useState(
    i18n.language?.slice(0, 2) || localStorage.getItem('gujid_lang') || 'gu'
  );

  useEffect(() => {
    const onLangChanged = (lng: string) => {
      setCurrentLang(lng.slice(0, 2));
    };
    i18n.on('languageChanged', onLangChanged);
    return () => {
      i18n.off('languageChanged', onLangChanged);
    };
  }, [i18n]);

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('gujid_lang', lang);
    setCurrentLang(lang);
    window.dispatchEvent(new Event('languagechange'));
  };

  const handleLogout = () => {
    localStorage.removeItem('family_id_token');
    localStorage.removeItem('family_id_user');
    localStorage.removeItem('gujid_token');
    localStorage.removeItem('gujid_role');
    localStorage.removeItem('gujid_display_name');
    localStorage.removeItem('gujid_district');
    localStorage.removeItem('gujid_family_id');
    setCurrentUser(null);
    setMobileMenuOpen(false);
    navigate('/login');
  };

  const isLoginPage =
    location.pathname === '/login' ||
    location.pathname === '/register' ||
    location.pathname === '/signup';

  // Strict role normalization with fallback to 'citizen'
  const storedRole = currentUser?.role || localStorage.getItem('gujid_role');
  const rawRole = typeof storedRole === 'string' ? storedRole.trim().toLowerCase() : 'citizen';
  const role = ['citizen', 'operator', 'officer', 'dept_admin', 'super_admin'].includes(rawRole)
    ? rawRole
    : 'citizen';

  // Role-Specific Navigation Links: Only show sections that can be controlled by that user
  const getNavLinks = () => {
    // Regular citizens or guests: ONLY citizen portal & privacy consent. Never show operator or officer
    if (!currentUser || role === 'citizen') {
      return [
        { to: '/citizen', label: t('navCitizen'), icon: Users },
        { to: '/citizen/privacy', label: t('navPrivacy'), icon: Lock }
      ];
    }
    // VCE operators: Only Operator Kiosk
    if (role === 'operator') {
      return [
        { to: '/operator', label: t('navOperator'), icon: Smartphone }
      ];
    }
    // Verification officers: Verification Dashboard, Applications, GIS Map, Grievances, Name Reviews
    if (role === 'officer') {
      return [
        { to: '/officer/dashboard', label: t('navDashboard'), icon: LayoutDashboard },
        { to: '/officer/applications', label: t('navApplications'), icon: FileText },
        { to: '/officer/map', label: t('navMap'), icon: MapPin },
        { to: '/officer/grievances', label: t('navGrievance'), icon: HelpCircle },
        { to: '/officer/identity-review', label: t('navIdentity'), icon: UserCheck }
      ];
    }
    // Department admins: Scheme Studio, Audit Ledger, Overview Dashboard
    if (role === 'dept_admin') {
      return [
        { to: '/admin/schemes', label: t('navSchemes'), icon: Layers },
        { to: '/admin/audit', label: t('navAudit'), icon: ShieldCheck },
        { to: '/officer/dashboard', label: t('navDashboard'), icon: LayoutDashboard }
      ];
    }
    // Super admin: Administrative controls
    if (role === 'super_admin') {
      return [
        { to: '/officer/dashboard', label: t('navDashboard'), icon: LayoutDashboard },
        { to: '/officer/map', label: t('navMap'), icon: MapPin },
        { to: '/admin/schemes', label: t('navSchemes'), icon: Layers },
        { to: '/admin/audit', label: t('navAudit'), icon: ShieldCheck },
        { to: '/operator', label: t('navOperator'), icon: Smartphone }
      ];
    }
    // Safety fallback: citizen only
    return [
      { to: '/citizen', label: t('navCitizen'), icon: Users },
      { to: '/citizen/privacy', label: t('navPrivacy'), icon: Lock }
    ];
  };

  const navLinks = getNavLinks();

  const homeRoute =
    role === 'operator'
      ? '/operator'
      : role === 'citizen' || !currentUser
      ? '/citizen'
      : '/officer/dashboard';

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 shadow-xs backdrop-blur-md transition-all">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Left: Brand Logo & Title with Govt of Gujarat Badge */}
          <Link to={homeRoute} className="flex items-center gap-2.5 sm:gap-3 group shrink-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-teal-700 to-teal-500 flex items-center justify-center text-white font-black text-lg sm:text-xl shadow-xs group-hover:scale-105 transition-transform duration-200">
              ગુ
            </div>
            <div>
              <div className="font-extrabold text-slate-900 tracking-tight text-sm sm:text-base flex items-center gap-1.5 sm:gap-2">
                <span>{t('appName')}</span>
                <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                  {t('govtBadge')}
                </span>
              </div>
              <div className="text-[10px] sm:text-[11px] text-slate-500 font-medium hidden md:block">
                {t('tagline')}
              </div>
            </div>
          </Link>

          {/* Center: Desktop Navigation (Strict Role-Based) */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive =
                location.pathname === link.to ||
                (link.to !== '/' && link.to !== '/citizen' && location.pathname.startsWith(link.to));
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

          {/* Right: Status, Language Switcher, User Controls & Mobile Hamburger */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Online / Offline status */}
            <div
              className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full text-xs font-bold border transition ${
                isOnline
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-xs'
                  : 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
              }`}
              title={isOnline ? t('online') : t('offline')}
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
                  className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg font-extrabold transition text-[11px] sm:text-xs ${
                    currentLang === lang
                      ? 'bg-teal-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {lang === 'gu' ? 'ગુ' : lang.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Desktop User Profile & Actions */}
            {currentUser ? (
              <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="hidden xl:block text-right">
                  <div className="text-xs font-bold text-slate-900 leading-tight">
                    {currentUser.display_name}
                  </div>
                  <div className="text-[10px] text-teal-700 font-bold uppercase tracking-wider">
                    {currentUser.role} {currentUser.district_code ? `· ${currentUser.district_code}` : ''}
                  </div>
                </div>

                {/* Switch Persona Button */}
                <Link
                  to="/login"
                  title={t('switchRole')}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-800 border border-slate-200 hover:border-teal-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 text-teal-700" />
                  <span className="hidden md:inline">{t('switchRole')}</span>
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
              <div className="hidden sm:block px-3 py-1.5 bg-teal-50 text-teal-800 border border-teal-200 text-xs font-extrabold rounded-xl">
                {t('demoPortal')}
              </div>
            ) : (
              <Link
                to="/login"
                className="hidden sm:flex px-3 sm:px-4 py-1.5 sm:py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl shadow-xs transition items-center gap-1.5"
              >
                <UserCircle2 className="w-4 h-4" />
                <span>{t('login')}</span>
              </Link>
            )}

            {/* Mobile Hamburger Menu Button (visible on < lg) */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-700 hover:text-teal-800 hover:bg-slate-100 border border-slate-200 transition focus:outline-none focus:ring-2 focus:ring-teal-500"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-slate-800" /> : <Menu className="w-5 h-5 text-slate-800" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Responsive Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white/98 px-4 pt-3 pb-5 space-y-3 shadow-lg animate-fade-in backdrop-blur-md">
          {/* Mobile User Info Card */}
          {currentUser ? (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-900">{currentUser.display_name}</div>
                <div className="text-[10px] text-teal-700 font-bold uppercase tracking-wider">
                  {currentUser.role} {currentUser.district_code ? `· ${currentUser.district_code}` : ''}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 bg-white hover:bg-teal-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold transition flex items-center gap-1"
                  title={t('switchRole')}
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 text-teal-700" />
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-2 bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 rounded-lg text-xs font-bold transition flex items-center gap-1"
                  title={t('logout')}
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="p-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl shadow-xs transition"
              >
                <UserCircle2 className="w-4 h-4" />
                <span>{t('login')}</span>
              </Link>
            </div>
          )}

          {/* Navigation Links for Mobile */}
          <div className="space-y-1">
            <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              {role === 'citizen'
                ? (i18n.language === 'en' ? 'Citizen Controls' : 'નાગરિક સેવાઓ')
                : role === 'operator'
                ? (i18n.language === 'en' ? 'Operator Controls' : 'ઓપરેટર કંટ્રોલ')
                : (i18n.language === 'en' ? 'Officer Controls' : 'અધિકારી કંટ્રોલ')}
            </div>
            {navLinks.map((link) => {
              const isActive =
                location.pathname === link.to ||
                (link.to !== '/' && link.to !== '/citizen' && location.pathname.startsWith(link.to));
              const Icon = link.icon;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition ${
                    isActive
                      ? 'bg-teal-700 text-white shadow-xs'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
};

