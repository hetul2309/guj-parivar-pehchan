import React, { useEffect, useState } from 'react';
import { ledgerApi, FamilyLedger, AccessLogEntry, ConsentRevocation } from '../../../api/ledger';
import {
  Lock, UnlockKeyhole, Shield, Eye, Clock, AlertTriangle,
  Loader2, CheckCircle, XCircle, RefreshCw
} from 'lucide-react';

export default function CitizenPrivacyPage() {
  const [ledger, setLedger] = useState<FamilyLedger | null>(null);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const familyId = localStorage.getItem('gujid_family_id') || 'FAM001'; // demo fallback

  const fetchLedger = async () => {
    setLoading(true);
    try {
      const res = await ledgerApi.getFamilyLedger(familyId);
      setLedger(res);
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { fetchLedger(); }, []);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const isRevoked = (dept: string, purpose: string) =>
    ledger?.revocations?.some(r => r.dept === dept && r.purpose === purpose) ?? false;

  const handleRevoke = async (dept: string, purpose: string) => {
    const key = `${dept}:${purpose}`;
    setRevoking(key);
    try {
      if (isRevoked(dept, purpose)) {
        await ledgerApi.restoreConsent(familyId, dept, purpose);
        showToast('Consent restored / સંમતિ પુનઃ સ્થાપિત');
      } else {
        await ledgerApi.revokeConsent(familyId, dept, purpose);
        showToast('Consent revoked / સંમતિ પાછી ખેંચી');
      }
      await fetchLedger();
    } catch (e: any) {
      showToast(e.message || 'Failed', 'error');
    } finally { setRevoking(null); }
  };

  // Deduplicate dept:purpose pairs from logs
  const consentPairs = Array.from(new Set(
    (ledger?.logs ?? []).map(l => `${l.dept}:${l.purpose}`)
  )).map(pair => {
    const [dept, purpose] = pair.split(':');
    return { dept, purpose };
  });

  return (
    <div className="space-y-6 max-w-2xl animate-fade-in">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-xl text-white text-sm font-medium ${
          toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        }`}>{toast.msg}</div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900">My Privacy / ગોપનીયતા</h1>
        <p className="text-slate-600 text-sm mt-0.5">
          Control who sees your family data — Family ID: <span className="font-mono text-teal-700 font-extrabold">{familyId}</span>
        </p>
      </div>

      {/* Privacy hero */}
      <div className="bg-gradient-to-br from-teal-950 via-slate-900 to-slate-900 rounded-2xl p-6 text-white relative overflow-hidden shadow-md">
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-teal-500/20 rounded-full blur-2xl" />
        <div className="flex items-start gap-4 relative">
          <div className="p-3 bg-teal-500/20 rounded-xl">
            <Shield size={28} className="text-teal-400" />
          </div>
          <div>
            <h2 className="text-white font-bold text-lg">You are in control</h2>
            <p className="text-slate-200 text-sm mt-1 leading-relaxed">
              તમારો ડેટા સ્ક્રબ્ડ ​​ Aadhaar vault ની બહાર ક્યારેય સ્ટોર થતો નથી.
              You can revoke access to your data from any department at any time.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 size={28} className="animate-spin text-teal-700" />
        </div>
      ) : (
        <>
          {/* Consent controls */}
          {consentPairs.length > 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                <h2 className="text-slate-900 font-bold text-sm flex items-center gap-2">
                  <Lock size={15} className="text-teal-700" />
                  Data Access Permissions / ડેટા ઍક્સેસ અનુમતિ
                </h2>
              </div>
              <div className="divide-y divide-slate-100">
                {consentPairs.map(({ dept, purpose }) => {
                  const revoked = isRevoked(dept, purpose);
                  const key = `${dept}:${purpose}`;
                  return (
                    <div key={key} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div>
                        <p className="text-slate-900 text-sm font-bold capitalize">{dept.replace('_', ' ')}</p>
                        <p className="text-slate-500 text-xs">{purpose}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                          revoked ? 'bg-rose-50 text-rose-800 border-rose-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}>
                          {revoked ? '🔒 Revoked' : '✓ Permitted'}
                        </span>
                        <button
                          id={`consent-toggle-${dept}-${purpose}`}
                          onClick={() => handleRevoke(dept, purpose)}
                          disabled={revoking === key}
                          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all disabled:opacity-60 shadow-xs ${
                            revoked
                              ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                              : 'bg-rose-700 hover:bg-rose-800 text-white'
                          }`}
                        >
                          {revoking === key
                            ? <Loader2 size={11} className="animate-spin" />
                            : revoked ? <UnlockKeyhole size={11} /> : <XCircle size={11} />
                          }
                          {revoked ? 'Restore' : 'Revoke'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center text-slate-400">
              <Eye size={32} className="mx-auto mb-3 opacity-30" />
              <p>No departments have accessed your data yet.</p>
              <p className="text-xs mt-1">Permissions will appear here once data is accessed.</p>
            </div>
          )}

          {/* Access log */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h2 className="text-slate-900 font-bold text-sm flex items-center gap-2">
                <Eye size={15} className="text-teal-700" />
                Who Viewed My Data / કોણે મારો ડેટા જોયો
              </h2>
              <button onClick={fetchLedger} className="text-slate-400 hover:text-slate-600 transition-colors">
                <RefreshCw size={14} />
              </button>
            </div>
            {(ledger?.logs?.length ?? 0) === 0 ? (
              <div className="text-center py-10 text-slate-500 text-sm font-medium">
                No access events yet / હજી સુધી કોઈ ઍક્સેસ ઘટના નથી
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {(ledger?.logs ?? []).map((log) => (
                  <div key={log.id} className="px-6 py-4 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-slate-800 text-sm font-medium">
                          <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded font-bold text-slate-900">{log.actor_id}</span>
                          <span className="text-slate-500 text-xs ml-2">({log.actor_role})</span>
                        </p>
                        <p className="text-slate-500 text-xs mt-0.5 capitalize">
                          {log.dept} — {log.purpose}
                        </p>
                        {log.fields?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {log.fields.map(f => (
                              <span key={f} className="px-2 py-0.5 bg-teal-50 text-teal-800 border border-teal-200 text-xs rounded font-medium">
                                {f}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-slate-500 text-xs flex items-center gap-1 justify-end font-medium">
                          <Clock size={10} />
                          {new Date(log.ts).toLocaleString('en-IN')}
                        </p>
                        <code className="text-slate-400 text-[10px] font-mono mt-1">{log.hash?.slice(0, 8)}…</code>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
