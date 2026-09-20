import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Lock, User, Eye, EyeOff, LogIn, ArrowRight, ShieldCheck,
  Sparkles, KeyRound, CheckCircle2, UserCheck, AlertCircle, Copy, Check
} from 'lucide-react';
import { fetchApi } from '../../api/client';

interface Persona {
  id: string;
  username: string;
  role: string;
  passwordText: string;
  district?: string;
  nameGu: string;
  nameEn: string;
  badgeGu: string;
  badgeEn: string;
  descGu: string;
  descEn: string;
  avatarBg: string;
  route: string;
}

export const DEMO_PERSONAS: Persona[] = [
  {
    id: 'kanta',
    username: 'citizen_kanta',
    passwordText: 'password123',
    role: 'citizen',
    district: 'DAHOD',
    nameGu: 'કાન્તાબેન પટેલ (Kantaben)',
    nameEn: 'Kantaben Patel (Citizen)',
    badgeGu: 'નાગરિક (ગ્રામીણ)',
    badgeEn: 'Citizen',
    descGu: '૬૨ વર્ષ, દાહોદ ગ્રામ્ય, કોઈ પાન નથી, વિધવા પેન્શન અને રાશનકાર્ડ લાભાર્થી.',
    descEn: 'Rural citizen, BPL, widow pension and ration entitlements.',
    avatarBg: 'from-teal-600 to-teal-800',
    route: '/citizen'
  },
  {
    id: 'vce',
    username: 'vce_dahod',
    passwordText: 'password123',
    role: 'operator',
    district: 'DAHOD',
    nameGu: 'વિષ્ણુભાઈ રાવળ (VCE Dahod)',
    nameEn: 'Vishnubhai Raval (VCE Operator)',
    badgeGu: 'ઈ-ગ્રામ ઓપરેટર',
    badgeEn: 'Village Operator',
    descGu: 'ઓફલાઇન-પ્રથમ નોંધણી કિયોસ્ક, આધાર QR સ્કેનર અને કાર્ડ પ્રિન્ટિંગ.',
    descEn: 'Assisted offline kiosk, QR scanner, consent proof & card print.',
    avatarBg: 'from-amber-500 to-orange-600',
    route: '/operator'
  },
  {
    id: 'officer_dahod',
    username: 'officer_dahod',
    passwordText: 'password123',
    role: 'officer',
    district: 'DAHOD',
    nameGu: 'ડિસ્ટ્રિક્ટ સોશિયલ વેલ્ફેર ઓફિસર',
    nameEn: 'District Social Welfare Officer',
    badgeGu: 'વેરિફિકેશન અધિકારી',
    badgeEn: 'Verification Officer',
    descGu: 'નામ ચકાસણી કતાર, યોજના અરજી મંજૂરી / અસ્વીકાર અને ફરિયાદ નિવારણ.',
    descEn: 'Transliteration reviews, scheme approvals & grievance redressal.',
    avatarBg: 'from-blue-600 to-indigo-700',
    route: '/officer/dashboard'
  },
  {
    id: 'admin_social',
    username: 'admin_social',
    passwordText: 'password123',
    role: 'dept_admin',
    nameGu: 'સામાજિક ન્યાય વિભાગ એડમિન',
    nameEn: 'Social Justice Dept Admin',
    badgeGu: 'વિભાગીય એડમિન',
    badgeEn: 'Department Admin',
    descGu: 'યોજના સ્ટુડિયો, JSON-Logic પાત્રતા નિયમો અને ક્રિપ્ટોગ્રાફિક લેજર.',
    descEn: 'Scheme Studio, JSON-Logic rule builder & tamper-evident audit ledger.',
    avatarBg: 'from-emerald-600 to-teal-700',
    route: '/admin/schemes'
  },
  {
    id: 'superadmin',
    username: 'superadmin',
    passwordText: 'password123',
    role: 'super_admin',
    nameGu: 'રાજ્ય પોર્ટલ એડમિનિસ્ટ્રેટર',
    nameEn: 'State Portal Administrator',
    badgeGu: 'સુપર એડમિન',
    badgeEn: 'Super Admin',
    descGu: 'રાજ્યસ્તરીય ઑડિટ, ગતિ શક્તિ મેપિંગ, જિલ્લાવાર વિશ્લેષણ અને તમામ નિયંત્રણો.',
    descEn: 'Statewide audit, Gati Shakti GIS geospatial gap mapping & cross-district control.',
    avatarBg: 'from-slate-700 to-slate-900',
    route: '/officer/dashboard'
  }
];

export const LoginPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  // Form State
  const [username, setUsername] = useState('citizen_kanta');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedUser, setCopiedUser] = useState<string | null>(null);

  const executeLogin = async (userToLogin: string, passToLogin: string, defaultRoute?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchApi<{ access_token: string; user: any }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: userToLogin.trim(),
          password: passToLogin
        })
      });

      localStorage.setItem('family_id_token', res.access_token);
      localStorage.setItem('family_id_user', JSON.stringify(res.user));
      localStorage.setItem('gujid_token', res.access_token);
      localStorage.setItem('gujid_role', res.user.role);
      localStorage.setItem('gujid_display_name', res.user.display_name);
      localStorage.setItem('gujid_district', res.user.district_code || 'DAHOD');

      if (res.user.role === 'citizen') {
        localStorage.setItem('gujid_family_id', 'GJ-38915001');
        navigate('/citizen');
      } else if (res.user.role === 'operator') {
        navigate('/operator');
      } else if (res.user.role === 'dept_admin') {
        navigate('/admin/schemes');
      } else {
        navigate('/officer/dashboard');
      }
    } catch (err: any) {
      setError(err.message || (i18n.language === 'en' ? 'Incorrect username or password.' : 'અમાન્ય યુઝરનેમ અથવા પાસવર્ડ.'));
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError(i18n.language === 'en' ? 'Please enter both Username and Password.' : 'કૃપા કરીને યુઝરનેમ અને પાસવર્ડ દાખલ કરો.');
      return;
    }
    executeLogin(username, password);
  };

  const handleFillPersona = (p: Persona) => {
    setUsername(p.username);
    setPassword(p.passwordText);
    setCopiedUser(p.username);
    setTimeout(() => setCopiedUser(null), 2000);
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center py-6 sm:px-6 lg:px-8 animate-fade-in">
      {/* Title */}
      <div className="sm:mx-auto sm:w-full sm:max-w-xl text-center px-4 mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-700 to-teal-500 text-white shadow-md mb-3 text-2xl font-black">
          ગુ
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          {t('loginTitle')}
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-500 font-medium">
          {i18n.language === 'en'
            ? 'Sign in to access your Gujarat Family ID & Benefits Portal'
            : 'ગુજરાત ફેમિલી આઈડી અને સરકારી સહાય પોર્ટલમાં પ્રવેશ કરો'}
        </p>
      </div>

      <div className="max-w-6xl mx-auto w-full px-4 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 5 cols: Real Manual Login Form */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-7 sm:p-8 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
            <div>
              <h2 className="text-base font-black text-slate-900">
                {i18n.language === 'en' ? 'Portal Login' : 'પોર્ટલ પ્રવેશ (Sign In)'}
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                {i18n.language === 'en' ? 'Enter your credentials below' : 'તમારો વપરાશકર્તા ID અને પાસવર્ડ દાખલ કરો'}
              </p>
            </div>
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
              <KeyRound className="w-4 h-4" />
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {i18n.language === 'en' ? 'Username / User ID' : 'વપરાશકર્તા ID (Username)'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. citizen_kanta"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {i18n.language === 'en' ? 'Password' : 'પાસવર્ડ (Password)'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 bg-teal-700 hover:bg-teal-800 disabled:opacity-60 text-white font-black text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              <span>{i18n.language === 'en' ? 'Sign In' : 'પ્રવેશ કરો (Sign In)'}</span>
            </button>
          </form>

          {/* New User Register Link */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              {i18n.language === 'en' ? 'New to the portal?' : 'નવું ખાતું બનાવવું છે?'}
            </span>
            <Link to="/register" className="font-bold text-teal-700 hover:underline">
              {i18n.language === 'en' ? 'Register Account →' : 'નવી નોંધણી કરો (Sign Up) →'}
            </Link>
          </div>
        </div>

        {/* Right 7 cols: 5 Official Roles Cheat Sheet & 1-Click Fill */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2">
            <div>
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-teal-700" />
                <span>{i18n.language === 'en' ? 'Available Role Accounts (5 Roles)' : 'ઉપલબ્ધ ૫ અધિકૃત ખાતાઓ અને પાસવર્ડ'}</span>
              </h2>
              <p className="text-xs text-slate-500">
                {i18n.language === 'en'
                  ? 'All demo accounts share password: password123 (or demo123)'
                  : 'બધા ૫ ડેમો ખાતાઓનો પાસવર્ડ password123 (અથવા demo123) છે:'}
              </p>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-teal-50 text-teal-800 border border-teal-200 self-start sm:self-auto">
              Password: password123
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {DEMO_PERSONAS.map((p) => {
              const isEn = i18n.language === 'en';
              const name = isEn ? p.nameEn : p.nameGu;
              const badge = isEn ? p.badgeEn : p.badgeGu;
              const desc = isEn ? p.descEn : p.descGu;
              const isCopied = copiedUser === p.username;

              return (
                <div
                  key={p.id}
                  className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs hover:border-teal-500 hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-50 text-teal-800 border border-teal-200">
                        {badge}
                      </span>
                      <div className={`w-7 h-7 rounded-lg bg-gradient-to-tr ${p.avatarBg} text-white flex items-center justify-center font-black text-xs shadow-xs`}>
                        {name.slice(0, 1)}
                      </div>
                    </div>

                    <h3 className="font-extrabold text-xs text-slate-900 line-clamp-1 group-hover:text-teal-700 transition-colors">
                      {name}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-snug">
                      {desc}
                    </p>

                    {/* Username & Password Display */}
                    <div className="mt-3 p-2 bg-slate-50 rounded-xl border border-slate-100 text-[11px] font-mono space-y-0.5">
                      <div className="flex items-center justify-between text-slate-800">
                        <span>ID: <strong className="text-teal-900">{p.username}</strong></span>
                        <span className="text-[10px] text-slate-400 font-sans">Role: {p.role}</span>
                      </div>
                      <div className="text-slate-500 text-[10px]">
                        PW: <span className="font-bold text-slate-700">{p.passwordText}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions: Fill Form or Quick 1-Click Login */}
                  <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleFillPersona(p)}
                      className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg transition flex items-center justify-center gap-1"
                    >
                      {isCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{isCopied ? 'Filled!' : 'Fill Form'}</span>
                    </button>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => executeLogin(p.username, p.passwordText, p.route)}
                      className="flex-1 py-1.5 px-2 bg-teal-700 hover:bg-teal-800 text-white text-[11px] font-bold rounded-lg transition flex items-center justify-center gap-1 shadow-xs"
                    >
                      <span>1-Click In</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-center text-[11px] text-slate-400 pt-2 font-medium">
            {t('securityProtocol')}
          </div>
        </div>
      </div>
    </div>
  );
};
export default LoginPage;
