import React, { useEffect, useState } from 'react';
import { ledgerApi, AccessLogEntry, ChainVerifyResult } from '../../api/ledger';
import {
  Shield, CheckCircle, XCircle, Loader2, Search,
  Hash, Clock, User, Lock, UnlockKeyhole
} from 'lucide-react';

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AccessLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [chainResult, setChainResult] = useState<ChainVerifyResult | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [actorFilter, setActorFilter] = useState('');
  const [familyFilter, setFamilyFilter] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await ledgerApi.queryLogs(actorFilter || undefined, familyFilter || undefined);
      setLogs(Array.isArray(res) ? res : (res as any).items || []);
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { fetchLogs(); }, []);

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const res = await ledgerApi.verifyChain();
      setChainResult(res);
    } catch { } finally { setVerifying(false); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Audit Ledger / ઑડિટ ખાતાવહી</h1>
        <p className="text-slate-600 text-sm mt-0.5">Tamper-evident SHA-256 hash-chained access log (M7)</p>
      </div>

      {/* Chain verify banner */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-teal-50 rounded-xl">
            <Shield size={20} className="text-teal-700" />
          </div>
          <div>
            <p className="text-slate-900 font-bold text-sm">Hash Chain Integrity</p>
            <p className="text-slate-500 text-xs">Verify tamper-evidence of all access logs</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {chainResult && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border ${
              chainResult.valid ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}>
              {chainResult.valid
                ? <><CheckCircle size={15} />Chain intact ({chainResult.total_records} records)</>
                : <><XCircle size={15} />Broken at ID {chainResult.broken_at_id}</>
              }
            </div>
          )}
          <button
            id="verify-chain-btn"
            onClick={handleVerify}
            disabled={verifying}
            className="flex items-center gap-2 px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-60 shadow-sm"
          >
            {verifying ? <Loader2 size={15} className="animate-spin" /> : <Hash size={15} />}
            Verify Chain
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-40">
          <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="audit-actor-filter"
            className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 placeholder:text-slate-400"
            placeholder="Filter by actor ID…"
            value={actorFilter}
            onChange={e => setActorFilter(e.target.value)}
          />
        </div>
        <div className="relative flex-1 min-w-40">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="audit-family-filter"
            className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 placeholder:text-slate-400"
            placeholder="Filter by family ID…"
            value={familyFilter}
            onChange={e => setFamilyFilter(e.target.value)}
          />
        </div>
        <button
          onClick={fetchLogs}
          className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-sm font-bold transition-all shadow-sm"
        >
          Search
        </button>
      </div>

      {/* Log table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <p className="text-slate-800 text-sm font-bold">{logs.length} log entries</p>
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 size={28} className="animate-spin text-teal-700" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Shield size={40} className="mx-auto mb-3 opacity-20" />
            <p>No logs yet / કોઈ નોંધ નથી</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['#', 'Actor', 'Role', 'Department', 'Purpose', 'Fields', 'Timestamp', 'Hash'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-slate-500 text-xs font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {logs.map((log, i) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 text-slate-400 text-xs">{log.id}</td>
                    <td className="px-4 py-3 text-slate-700 text-xs font-mono">{log.actor_id}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-md">{log.actor_role}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs uppercase">{log.dept}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs max-w-32 truncate">{log.purpose}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{(log.fields || []).join(', ')}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs flex items-center gap-1">
                      <Clock size={10} />
                      {new Date(log.ts).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-slate-400 text-xs font-mono" title={log.hash}>
                        {log.hash?.slice(0, 12)}…
                      </code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
