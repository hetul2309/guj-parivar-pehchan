import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { analyticsApi, AnalyticsSummary, AnalyticsQueryResult } from '../../api/analytics';
import { schemesApi, Scheme } from '../../api/schemes';
import {
  Users, FileText, CheckCircle, Clock, BarChart3,
  TrendingUp, Send, Loader2, Sparkles, AlertTriangle,
  ArrowUpRight, Database, Map, UserCheck, ShieldAlert,
  Layers, ShieldCheck, Smartphone, Lock
} from 'lucide-react';

// Simple in-app chart using SVG bars
function BarChart({ data, labelKey, valueKey }: { data: any[]; labelKey: string; valueKey: string }) {
  if (!data.length) return null;
  const max = Math.max(...data.map(d => Number(d[valueKey]) || 0));
  return (
    <div className="flex items-end gap-1.5 h-24 mt-3">
      {data.slice(0, 10).map((d, i) => (
        <div key={i} className="flex flex-col items-center gap-1 flex-1 min-w-0">
          <div
            className="w-full bg-gradient-to-t from-teal-700 to-teal-400 rounded-t-sm transition-all duration-500"
            style={{ height: max ? `${(Number(d[valueKey]) / max) * 96}px` : '4px' }}
            title={`${d[labelKey]}: ${d[valueKey]}`}
          />
          <span className="text-slate-600 text-[9px] truncate w-full text-center">{String(d[labelKey]).slice(0, 6)}</span>
        </div>
      ))}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub }: any) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-teal-500 transition-all duration-200 group">
      <div className="flex items-start justify-between">
        <div className="p-3 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 group-hover:scale-105 transition-transform">
          <Icon size={22} className="text-teal-700" />
        </div>
        <ArrowUpRight size={16} className="text-slate-400 group-hover:text-teal-700 transition-colors" />
      </div>
      <div className="mt-4">
        <p className="text-3xl font-black text-slate-900 tracking-tight">{value}</p>
        <p className="text-slate-600 font-medium text-xs mt-1">{label}</p>
        {sub && <p className="text-teal-800 font-bold text-xs mt-1.5 inline-block px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200">{sub}</p>}
      </div>
    </div>
  );
}

export default function OfficerDashboardPage() {
  const { t, i18n } = useTranslation();
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [aiResult, setAiResult] = useState<AnalyticsQueryResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const district = localStorage.getItem('gujid_district') || undefined;

  useEffect(() => {
    Promise.all([
      analyticsApi.getSummary(district),
      schemesApi.list()
    ]).then(([s, sc]) => {
      setSummary(s);
      setSchemes(sc.items || sc as any);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [district]);

  const handleAsk = async () => {
    if (!query.trim()) return;
    setAiLoading(true);
    setAiError('');
    setAiResult(null);
    try {
      const res = await analyticsApi.ask(query);
      setAiResult(res);
    } catch (e: any) {
      setAiError(e.message || 'Query failed / ક્વેરી નિષ્ફળ');
    } finally {
      setAiLoading(false);
    }
  };

  const portalModules = [
    {
      to: '/officer/applications',
      icon: FileText,
      title: t('reviewApplications'),
      sub: t('reviewApplicationsSub'),
      badge: 'M4 / M5',
      color: 'teal'
    },
    {
      to: '/officer/map',
      icon: Map,
      title: t('gatiShaktiMap'),
      sub: t('gatiShaktiMapSub'),
      badge: 'M6 GIS',
      color: 'teal'
    },
    {
      to: '/officer/identity-review',
      icon: UserCheck,
      title: t('nameVerificationQueue'),
      sub: t('nameVerificationQueueSub'),
      badge: 'M2 KYC',
      color: 'blue'
    },
    {
      to: '/officer/grievances',
      icon: ShieldAlert,
      title: t('grievanceRedressal'),
      sub: t('grievanceRedressalSub'),
      badge: 'M9 SLA',
      color: 'amber'
    },
    {
      to: '/officer/migrations',
      icon: TrendingUp,
      title: t('migrations'),
      sub: t('migrationsSub'),
      badge: 'M8 Portability',
      color: 'emerald'
    },
    {
      to: '/admin/schemes',
      icon: Layers,
      title: t('schemeStudio'),
      sub: t('schemeStudioSub'),
      badge: 'M4 Rules',
      color: 'indigo'
    },
    {
      to: '/admin/audit',
      icon: ShieldCheck,
      title: t('auditLedger'),
      sub: t('auditLedgerSub'),
      badge: 'M7 Hash Chain',
      color: 'slate'
    },
    {
      to: '/citizen',
      icon: Users,
      title: t('citizenView'),
      sub: t('citizenViewSub'),
      badge: 'M1 Portal',
      color: 'teal'
    },
    {
      to: '/operator',
      icon: Smartphone,
      title: t('vceKioskView'),
      sub: t('vceKioskViewSub'),
      badge: 'M3 Kiosk',
      color: 'teal'
    },
    {
      to: '/sms-outbox',
      icon: Send,
      title: t('smsOutbox'),
      sub: t('smsOutboxSub'),
      badge: 'Telephony',
      color: 'cyan'
    },
    {
      to: '/citizen/privacy',
      icon: Lock,
      title: t('navPrivacy'),
      sub: 'DPDP 2023 Consent Logs',
      badge: 'Privacy',
      color: 'slate'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-teal-700" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {t('officerDashboardTitle')}
          </h1>
          <p className="text-slate-600 text-sm mt-1 flex items-center gap-2">
            <span>{t('districtOverview')}</span>
            {district && (
              <span className="px-2.5 py-0.5 bg-teal-100 text-teal-800 font-bold text-xs rounded-full border border-teal-200">
                {district}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label={t('totalFamilies')}
          value={summary?.total_families?.toLocaleString() ?? '—'}
        />
        <StatCard
          icon={FileText}
          label={t('totalApplications')}
          value={summary?.total_applications?.toLocaleString() ?? '—'}
        />
        <StatCard
          icon={CheckCircle}
          label={t('approvedCount')}
          value={summary?.approved_applications?.toLocaleString() ?? '—'}
          sub={`${summary?.approval_rate_pct?.toFixed(1) ?? '—'}% ${t('approvalRate')}`}
        />
        <StatCard
          icon={Clock}
          label={t('pendingCount')}
          value={summary?.pending_applications?.toLocaleString() ?? '—'}
        />
      </div>

      {/* System Modules & Portal Hub (Transferred from Navbar) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-5 border-b border-slate-100 mb-6">
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Layers className="w-5 h-5 text-teal-700" />
              <span>{t('quickAccessHub')}</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {t('quickAccessSub')}
            </p>
          </div>
          <span className="self-start sm:self-auto px-3 py-1 bg-teal-50 text-teal-800 text-xs font-black rounded-full border border-teal-200">
            {portalModules.length} Modules Integrated
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {portalModules.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className="flex items-start gap-3.5 p-4 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50/80 hover:border-teal-500 shadow-xs hover:shadow-md transition-all duration-200 group relative"
              >
                <div className="p-3 bg-teal-50 text-teal-700 rounded-xl group-hover:scale-105 group-hover:bg-teal-700 group-hover:text-white transition-all duration-200 shrink-0">
                  <Icon size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-slate-900 font-extrabold text-sm truncate group-hover:text-teal-800 transition-colors">
                      {item.title}
                    </p>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-md uppercase tracking-wider shrink-0">
                      {item.badge}
                    </span>
                  </div>
                  <p className="text-slate-500 text-xs mt-1 leading-snug line-clamp-2">
                    {item.sub}
                  </p>
                </div>
                <ArrowUpRight
                  size={15}
                  className="text-slate-400 group-hover:text-teal-700 transition-colors shrink-0 mt-0.5"
                />
              </Link>
            );
          })}
        </div>
      </div>

      {/* Natural Language Analytics */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="p-2 bg-teal-100 rounded-xl text-teal-800">
            <Sparkles size={18} />
          </div>
          <div>
            <h2 className="text-slate-900 font-extrabold text-sm">{t('aiAnalyticsTitle')}</h2>
            <p className="text-slate-500 text-xs">{t('aiAnalyticsDesc')}</p>
          </div>
        </div>
        <div className="p-6">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              id="analytics-query-input"
              className="flex-1 border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all placeholder:text-slate-400"
              placeholder={
                i18n.language === 'gu'
                  ? 'દા.ત., અમદાવાદ જિલ્લામાં ગરીબી રેખા નીચે કેટલા કુટુંબો છે?'
                  : i18n.language === 'hi'
                  ? 'उदा. अहमदाबाद जिले में कितने परिवार गरीबी रेखा से नीचे हैं?'
                  : 'e.g., How many families in Ahmedabad district are below poverty line?'
              }
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAsk()}
            />
            <button
              id="analytics-submit-btn"
              onClick={handleAsk}
              disabled={aiLoading}
              className="px-6 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl flex items-center gap-2 text-sm transition-all disabled:opacity-60 font-bold shadow-sm"
            >
              {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              <span>{t('ask')}</span>
            </button>
          </div>

          {/* Suggestions */}
          <div className="flex flex-wrap gap-2 mt-3">
            {[
              i18n.language === 'gu' ? 'આ મહિને કેટલી અરજીઓ બાકી છે?' : 'How many applications are pending this month?',
              i18n.language === 'gu' ? 'સૌથી વધુ લાભાર્થી ધરાવતી ટોચની ૩ યોજનાઓ?' : 'Top 3 schemes by beneficiaries?',
              i18n.language === 'gu' ? 'જિલ્લાવાર ગરીબી રેખા હેઠળના પરિવારો?' : 'Families below poverty line by district?',
            ].map(s => (
              <button
                key={s}
                onClick={() => { setQuery(s); inputRef.current?.focus(); }}
                className="px-3 py-1 bg-slate-100 hover:bg-teal-50 hover:text-teal-800 hover:border-teal-300 border border-slate-200 rounded-full text-slate-600 text-xs font-medium transition-all"
              >
                {s}
              </button>
            ))}
          </div>

          {aiError && (
            <div className="mt-4 flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
              <AlertTriangle size={16} />
              {aiError}
            </div>
          )}

          {aiResult && (
            <div className="mt-5 animate-fade-in">
              {/* SQL badge */}
              <div className="flex items-center gap-2 mb-3">
                <Database size={12} className="text-slate-500" />
                <code className="text-xs text-slate-600 font-mono bg-slate-100 px-2 py-0.5 rounded">{aiResult.sql}</code>
              </div>
              {/* Chart */}
              {aiResult.chart_hint === 'bar' && aiResult.rows.length > 0 && (
                <BarChart
                  data={aiResult.rows.map(r => Object.fromEntries(aiResult.columns.map((c, i) => [c, r[i]])))}
                  labelKey={aiResult.columns[0]}
                  valueKey={aiResult.columns[1]}
                />
              )}
              {/* Table */}
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      {aiResult.columns.map(c => (
                        <th key={c} className="text-left px-3 py-2 text-slate-700 text-xs bg-slate-100 border-b border-slate-200 font-bold">{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {aiResult.rows.slice(0, 10).map((row, i) => (
                      <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        {row.map((cell, j) => (
                          <td key={j} className="px-3 py-2 text-slate-800 text-xs">{String(cell)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {aiResult.row_count > 10 && (
                  <p className="text-slate-500 text-xs px-3 py-2">+{aiResult.row_count - 10} more rows</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Scheme overview */}
      {schemes.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h2 className="text-slate-900 font-black text-sm flex items-center gap-2">
              <BarChart3 size={16} className="text-teal-700" />
              <span>{t('activeSchemesTitle')} ({schemes.length})</span>
            </h2>
          </div>
          <div className="divide-y divide-slate-100">
            {schemes.slice(0, 6).map(scheme => (
              <div key={scheme.scheme_id} className="px-6 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div>
                  <p className="text-slate-900 text-sm font-bold">
                    {i18n.language === 'en' ? scheme.name_en : scheme.name_gu}
                  </p>
                  <p className="text-slate-500 text-xs mt-0.5">
                    {i18n.language === 'en' ? scheme.name_gu : scheme.name_en} — <span className="uppercase text-teal-700 font-bold">{scheme.dept}</span>
                  </p>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                  scheme.is_active ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  {scheme.is_active ? (i18n.language === 'en' ? 'Active' : 'સક્રિય') : 'Inactive'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
