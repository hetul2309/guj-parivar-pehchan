import React, { useEffect, useState } from 'react';
import { applicationsApi, Application } from '../../api/applications';
import { schemesApi } from '../../api/schemes';
import { eligibilityApi, EligibilityResult } from '../../api/eligibility';
import {
  Search, Filter, CheckCircle, XCircle, Clock, Eye, ChevronDown,
  Loader2, AlertTriangle, User, FileText, Info
} from 'lucide-react';
import { showToast } from '../../helpers/showToast';

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  submitted: { label: 'Submitted / રજૂ', color: 'bg-blue-50 text-blue-900 border border-blue-300 font-bold' },
  pending: { label: 'Pending / બાકી', color: 'bg-amber-50 text-amber-900 border border-amber-300 font-bold' },
  approved: { label: 'Approved / મંજૂર', color: 'bg-emerald-50 text-emerald-900 border border-emerald-300 font-bold' },
  rejected: { label: 'Rejected / નકાર', color: 'bg-rose-50 text-rose-900 border border-rose-300 font-bold' },
  disbursed: { label: 'Disbursed / વિતરિત', color: 'bg-teal-50 text-teal-900 border border-teal-300 font-bold' },
};

function ApplicationRow({
  app, onDecision
}: {
  app: Application;
  onDecision: (id: string, decision: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [eligibility, setEligibility] = useState<EligibilityResult | null>(null);
  const [checking, setChecking] = useState(false);
  const badge = STATUS_BADGE[app.status] || { label: app.status, color: 'bg-slate-100 text-slate-800 border border-slate-200 font-bold' };

  const checkEligibility = async () => {
    if (eligibility) { setExpanded(e => !e); return; }
    setChecking(true);
    setExpanded(true);
    try {
      const res = await eligibilityApi.check(app.family_id, app.scheme_id);
      setEligibility(res);
    } catch { } finally { setChecking(false); }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:border-teal-500 transition-all duration-200">
      <div className="px-5 py-4 flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-slate-900 font-bold text-sm">{app.application_id}</p>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${badge.color}`}>{badge.label}</span>
          </div>
          <div className="flex items-center gap-4 mt-1">
            <span className="text-slate-500 text-xs flex items-center gap-1">
              <User size={10} />Family: {app.family_id}
            </span>
            <span className="text-slate-500 text-xs flex items-center gap-1">
              <FileText size={10} />Scheme: {app.scheme_id}
            </span>
            <span className="text-slate-500 text-xs">
              {new Date(app.submitted_at).toLocaleDateString('en-IN')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id={`check-eligibility-${app.application_id}`}
            onClick={checkEligibility}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-teal-50 hover:text-teal-800 border border-slate-200 hover:border-teal-300 rounded-lg text-slate-700 text-xs font-semibold transition-all"
          >
            {checking ? <Loader2 size={12} className="animate-spin" /> : <Eye size={12} />}
            Check Eligibility
          </button>

          {(app.status === 'submitted' || app.status === 'pending') && (
            <>
              <button
                id={`approve-${app.application_id}`}
                onClick={() => onDecision(app.application_id, 'approved')}
                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
              >
                <CheckCircle size={12} />Approve
              </button>
              <button
                id={`reject-${app.application_id}`}
                onClick={() => onDecision(app.application_id, 'rejected')}
                className="flex items-center gap-1 px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
              >
                <XCircle size={12} />Reject
              </button>
            </>
          )}

          <button onClick={() => setExpanded(e => !e)} className="text-slate-400 hover:text-slate-700">
            <ChevronDown size={16} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-50 px-5 py-4 bg-slate-50/50">
          {checking && (
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <Loader2 size={14} className="animate-spin" />
              Checking eligibility against scheme rules…
            </div>
          )}
          {eligibility && (
            <div className="space-y-3">
              <div className={`flex items-center gap-2 px-4 py-3 rounded-xl ${
                eligibility.eligible ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100'
              }`}>
                {eligibility.eligible
                  ? <CheckCircle size={18} className="text-green-500" />
                  : <XCircle size={18} className="text-red-500" />
                }
                <div>
                  <p className={`font-semibold text-sm ${eligibility.eligible ? 'text-green-700' : 'text-red-700'}`}>
                    {eligibility.eligible ? 'Eligible / પાત્ર' : 'Not Eligible / અપાત્ર'}
                  </p>
                  <p className="text-xs text-slate-500">Score: {eligibility.score?.toFixed(2) ?? '—'}</p>
                </div>
              </div>

              {eligibility.failed_rules?.length > 0 && (
                <div>
                  <p className="text-slate-600 text-xs font-medium mb-2 flex items-center gap-1.5">
                    <AlertTriangle size={12} className="text-amber-500" />
                    Failed Rules:
                  </p>
                  <ul className="space-y-1">
                    {eligibility.failed_rules.map((r: any, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                        <span className="text-red-500 mt-0.5">✗</span>
                        <span>{r.explanation || r.rule_id || JSON.stringify(r)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {eligibility.passed_rules?.length > 0 && (
                <div>
                  <p className="text-slate-600 text-xs font-medium mb-2 flex items-center gap-1.5">
                    <Info size={12} className="text-green-500" />
                    Passed Rules:
                  </p>
                  <ul className="space-y-1">
                    {eligibility.passed_rules.map((r: any, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                        <span className="text-green-500 mt-0.5">✓</span>
                        <span>{r.explanation || r.rule_id || JSON.stringify(r)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function OfficerApplicationsPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [deciding, setDeciding] = useState<string | null>(null);

  const district = localStorage.getItem('gujid_district') || undefined;

  const fetchApps = async () => {
    setLoading(true);
    try {
      const res = await applicationsApi.list({ district_code: district, status: statusFilter || undefined, page });
      setApps(res.items || (res as any));
      setTotal(res.total || (res as any)?.length || 0);
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { fetchApps(); }, [statusFilter, page]);

  const handleDecision = async (appId: string, decision: string) => {
    setDeciding(appId);
    try {
      await applicationsApi.postDecision(appId, decision);
      showToast('success', `Application ${decision} successfully`);
      fetchApps();
    } catch (e: any) {
      showToast('error', e.message || 'Action failed');
    } finally { setDeciding(null); }
  };

  const displayed = apps.filter(a =>
    !search || a.application_id.includes(search) || a.family_id.includes(search)
  );

  return (
    <div className="space-y-5 animate-fade-in">

      <div>
        <h1 className="text-2xl font-black text-slate-900">Applications / અરજીઓ</h1>
        <p className="text-slate-600 text-sm mt-0.5">Review and process scheme applications (M4 eligibility)</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="app-search"
            className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 placeholder:text-slate-400"
            placeholder="Search by application or family ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          id="app-status-filter"
          className="border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Status / બધી સ્થિતિ</option>
          <option value="submitted">Submitted</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="disbursed">Disbursed</option>
        </select>
      </div>

      {/* Count */}
      <p className="text-slate-600 text-sm font-medium">{total} applications found</p>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 size={28} className="animate-spin text-teal-700" />
        </div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <FileText size={40} className="mx-auto mb-3 opacity-30 text-slate-400" />
          <p>No applications found / કોઈ અરજી નથી</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map(app => (
            <ApplicationRow key={app.application_id} app={app} onDecision={handleDecision} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > 20 && (
        <div className="flex items-center gap-3 justify-center">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 text-sm disabled:opacity-40 hover:bg-slate-50"
          >
            ← Prev
          </button>
          <span className="text-slate-500 text-sm">Page {page}</span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={apps.length < 20}
            className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 text-sm disabled:opacity-40 hover:bg-slate-50"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
