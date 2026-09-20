import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { UserPlus, Lock, User, MapPin, Eye, EyeOff, CheckCircle2, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { fetchApi } from '../../api/client';
import { showToast } from '../../helpers/showToast';

const GUJARAT_DISTRICTS = [
  'DAHOD', 'AHMEDABAD', 'SURAT', 'VADODARA', 'RAJKOT', 'GANDHINAGAR',
  'BHAVNAGAR', 'JAMNAGAR', 'JUNAGADH', 'KUTCH', 'MEHSANA', 'BANASKANTHA',
  'SABARKANTHA', 'PANCHMAHAL', 'ANAND', 'KHEDA', 'NAVSARI', 'VALSAD'
];

export const RegisterPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'citizen' | 'operator'>('citizen');
  const [districtCode, setDistrictCode] = useState('DAHOD');
  const [mobile, setMobile] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!displayName.trim() || !username.trim() || !password.trim()) {
      setError(i18n.language === 'en' ? 'Please fill in all required fields.' : 'કૃપા કરીને બધી વિગતો ભરો.');
      return;
    }

    if (password.length < 4) {
      setError(i18n.language === 'en' ? 'Password must be at least 4 characters.' : 'પાસવર્ડ ઓછામાં ઓછો ૪ અક્ષરનો હોવો જોઈએ.');
      return;
    }

    if (password !== confirmPassword) {
      setError(i18n.language === 'en' ? 'Passwords do not match.' : 'બંને પાસવર્ડ મેળ ખાતા નથી.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetchApi<{ access_token: string; user: any }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          username: username.trim().toLowerCase(),
          password,
          display_name: displayName.trim(),
          role,
          district_code: districtCode
        })
      });

      // Save credentials & persona
      localStorage.setItem('family_id_token', res.access_token);
      localStorage.setItem('family_id_user', JSON.stringify(res.user));
      localStorage.setItem('gujid_token', res.access_token);
      localStorage.setItem('gujid_role', res.user.role);
      localStorage.setItem('gujid_display_name', res.user.display_name);
      localStorage.setItem('gujid_district', res.user.district_code || districtCode);

      showToast('success', i18n.language === 'en' ? `Account registered successfully! Welcome, ${res.user.display_name}.` : `ખાતું સફળતાપૂર્વક બની ગયું! સ્વાગત છે, ${res.user.display_name}.`);

      if (res.user.role === 'citizen') {
        localStorage.setItem('gujid_family_id', 'GJ-38915001');
        navigate('/citizen');
      } else if (res.user.role === 'operator') {
        navigate('/operator');
      } else {
        navigate('/officer/dashboard');
      }
    } catch (err: any) {
      const errMsg = err.message || (i18n.language === 'en' ? 'Registration failed.' : 'નોંધણી નિષ્ફળ ગઈ.');
      setError(errMsg);
      showToast('error', errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center py-8 sm:px-6 lg:px-8 animate-fade-in">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-700 to-teal-500 text-white shadow-md mb-3 text-2xl font-black">
          ગુ
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          {i18n.language === 'en' ? 'Create New Account' : 'નવું ખાતું બનાવો (Sign Up)'}
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-500 font-medium">
          {i18n.language === 'en'
            ? 'Gujarat Family ID Digital Public Infrastructure Portal'
            : 'ગુજરાત ફેમિલી આઈડી ડિજિટલ પબ્લિક ઇન્ફ્રાસ્ટ્રક્ચર પોર્ટલ'}
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-lg px-4">
        <div className="bg-white rounded-3xl p-7 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {i18n.language === 'en' ? 'Full Name / પૂરું નામ' : 'પૂરું નામ (Full Name)'} *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={i18n.language === 'en' ? 'e.g. Kantaben Patel' : 'દા.ત. કાન્તાબેન પટેલ'}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
                />
              </div>
            </div>

            {/* Username */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {i18n.language === 'en' ? 'User ID / Username' : 'વપરાશકર્તા ID / Username'} *
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. kanta_2026 or mobile number"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
              />
            </div>

            {/* Role & District Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {i18n.language === 'en' ? 'Account Role' : 'ખાતાનો પ્રકાર (Role)'}
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
                >
                  <option value="citizen">{i18n.language === 'en' ? 'Citizen (નાગરિક)' : 'નાગરિક (Citizen)'}</option>
                  <option value="operator">{i18n.language === 'en' ? 'VCE Operator (કિયોસ્ક)' : 'VCE ઓપરેટર (Village Kiosk)'}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {i18n.language === 'en' ? 'District / જિલ્લો' : 'જિલ્લો (District)'}
                </label>
                <select
                  value={districtCode}
                  onChange={(e) => setDistrictCode(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
                >
                  {GUJARAT_DISTRICTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Mobile (Optional) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {i18n.language === 'en' ? 'Mobile Number (10 Digits)' : 'મોબાઈલ નંબર (SMS સૂચનાઓ માટે)'}
              </label>
              <input
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="9876543210"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {i18n.language === 'en' ? 'Create Password' : 'પાસવર્ડ બનાવો'} *
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

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {i18n.language === 'en' ? 'Confirm Password' : 'પાસવર્ડ ફરીથી લખો'} *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 bg-teal-700 hover:bg-teal-800 disabled:opacity-60 text-white font-black text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              <span>{i18n.language === 'en' ? 'Complete Registration' : 'નોંધણી પૂર્ણ કરો'}</span>
            </button>
          </form>

          {/* Link back to login */}
          <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-600">
            <span>{i18n.language === 'en' ? 'Already have an account? ' : 'પહેલેથી ખાતું છે? '}</span>
            <Link to="/login" className="font-bold text-teal-700 hover:underline">
              {i18n.language === 'en' ? 'Sign In / લૉગિન કરો' : 'લૉગિન કરો (Sign In)'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
export default RegisterPage;
