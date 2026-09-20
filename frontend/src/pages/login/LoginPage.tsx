import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, User, Building, HardHat, FileCheck, ArrowRight, Sparkles } from 'lucide-react';
import { fetchApi } from '../../api/client';

interface Persona {
  id: string;
  username: string;
  role: string;
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

const DEMO_PERSONAS: Persona[] = [
  {
    id: 'kanta',
    username: 'citizen_kanta',
    role: 'citizen',
    district: 'DAHOD',
    nameGu: 'કાન્તાબેન પટેલ (Kantaben)',
    nameEn: 'Kantaben Patel (Citizen)',
    badgeGu: 'નાગરિક (ગ્રામીણ વિધવા)',
    badgeEn: 'Citizen (Rural Widow)',
    descGu: '૬૨ વર્ષ, દાહોદ ગ્રામ્ય, કોઈ પાન કાર્ડ નથી, સ્માર્ટફોન નથી, વિધવા સહાય પાત્રતા.',
    descEn: '62 yrs, rural Dahod, no PAN, feature phone, eligible for widow assistance.',
    avatarBg: 'from-teal-600 to-teal-800',
    route: '/citizen'
  },
  {
    id: 'vce',
    username: 'vce_dahod',
    role: 'operator',
    district: 'DAHOD',
    nameGu: 'વિષ્ણુભાઈ રાવળ (VCE Dahod)',
    nameEn: 'Vishnubhai Raval (VCE Operator)',
    badgeGu: 'ગામ ઈ-ગ્રામ ઓપરેટર',
    badgeEn: 'Village e-Gram Operator',
    descGu: 'ઓફલાઇન-પ્રથમ નોંધણી કિયોસ્ક, આધાર QR સ્કેનર, સંમતિ પત્રક અને કાર્ડ પ્રિન્ટ.',
    descEn: 'Offline-first enrollment kiosk, Aadhaar QR scanner, consent proof & card print.',
    avatarBg: 'from-amber-500 to-orange-600',
    route: '/operator'
  },
  {
    id: 'officer_dahod',
    username: 'officer_dahod',
    role: 'officer',
    district: 'DAHOD',
    nameGu: 'ડિસ્ટ્રિક્ટ સોશિયલ વેલ્ફેર ઓફિસર',
    nameEn: 'District Social Welfare Officer',
    badgeGu: 'વેરિફિકેશન અધિકારી (દાહોદ)',
    badgeEn: 'Verification Officer (Dahod)',
    descGu: 'નામ સરખામણી રિવ્યૂ, યોજના મંજૂરી / અસ્વીકાર અને ફરિયાદ નિવારણ.',
    descEn: 'Transliteration review queue, scheme approvals/rejections & grievance redressal.',
    avatarBg: 'from-blue-600 to-indigo-700',
    route: '/officer/dashboard'
  },
  {
    id: 'admin_social',
    username: 'admin_social',
    role: 'dept_admin',
    nameGu: 'સામાજિક ન્યાય વિભાગ એડમિન',
    nameEn: 'Social Justice Dept Admin',
    badgeGu: 'વિભાગીય એડમિન (ગાંધીનગર)',
    badgeEn: 'Department Admin (Gandhinagar)',
    descGu: 'યોજના સ્ટુડિયો, JSON-Logic નિયમ નિર્માણ અને ક્રિપ્ટોગ્રાફિક ઑડિટ લેજર.',
    descEn: 'Scheme Studio, JSON-Logic rule builder and cryptographic audit ledger.',
    avatarBg: 'from-emerald-600 to-teal-700',
    route: '/admin/schemes'
  },
  {
    id: 'superadmin',
    username: 'superadmin',
    role: 'super_admin',
    nameGu: 'રાજ્ય પોર્ટલ એડમિનિસ્ટ્રેટર',
    nameEn: 'State Portal Administrator',
    badgeGu: 'સુપર એડમિન (ગાંધીનગર)',
    badgeEn: 'Super Admin (Gandhinagar)',
    descGu: 'રાજ્યસ્તરીય ઓડિટ, ગતિ શક્તિ મેપિંગ, જિલ્લાવાર વિશ્લેષણ અને તમામ નિયંત્રણો.',
    descEn: 'State-wide audit, Gati Shakti geospatial gap mapping & cross-district analytics.',
    avatarBg: 'from-slate-700 to-slate-900',
    route: '/officer/dashboard'
  }
];

export const LoginPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loginAs = async (persona: Persona) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchApi<{ access_token: string; user: any }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: persona.username,
          password: 'demo123'
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
      }
      navigate(persona.route);
    } catch (err: any) {
      setError(err.message || 'પ્રવેશ કરવામાં ભૂલ થઈ.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center py-8 sm:px-6 lg:px-8 relative">
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl text-center px-4 relative z-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-teal-700 to-teal-500 text-white shadow-md mb-4 text-3xl font-black">
          ગુ
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">
          {t('loginTitle')}
        </h2>
        <p className="mt-2 text-sm text-slate-600 font-medium">
          {t('loginSubtitle')}
        </p>
      </div>

      {error && (
        <div className="max-w-md mx-auto mt-4 px-4 py-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl text-center font-bold relative z-10">
          {error}
        </div>
      )}

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-3xl px-4 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {DEMO_PERSONAS.map((p) => {
            const isEn = i18n.language === 'en';
            const name = isEn ? p.nameEn : p.nameGu;
            const badge = isEn ? p.badgeEn : p.badgeGu;
            const desc = isEn ? p.descEn : p.descGu;

            return (
              <button
                key={p.id}
                disabled={loading}
                onClick={() => loginAs(p)}
                className="relative p-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-teal-500 transition-all duration-200 group flex flex-col justify-between text-left"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200">
                      {badge}
                    </span>
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${p.avatarBg} text-white flex items-center justify-center font-bold text-xs shadow-sm`}>
                      {name.slice(0, 1)}
                    </div>
                  </div>
                  <h3 className="font-bold text-base text-slate-900 group-hover:text-teal-700 transition-colors">
                    {name}
                  </h3>
                  <p className="text-xs text-slate-600 mt-1.5 line-clamp-2 leading-relaxed">
                    {desc}
                  </p>
                </div>

                <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-teal-700 group-hover:translate-x-1 transition-transform">
                  <span>{t('loginAsText')} {p.role}</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-8 text-center text-xs text-slate-500 font-medium">
          {t('securityProtocol')}
        </div>
      </div>
    </div>
  );
};
