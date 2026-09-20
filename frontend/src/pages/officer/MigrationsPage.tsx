import React, { useEffect, useState } from 'react';
import { migrationApi, MigrationEvent, PortabilityStatus } from '../../api/migration';
import { ArrowRightLeft, CheckCircle, AlertTriangle, Loader2, MapPin, RefreshCw } from 'lucide-react';

export default function OfficerMigrationsPage() {
  const [events, setEvents] = useState<MigrationEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [familyId, setFamilyId] = useState('');
  const [newVillage, setNewVillage] = useState('');
  const [portability, setPortability] = useState<PortabilityStatus | null>(null);
  const [portError, setPortError] = useState('');
  const [toast, setToast] = useState<string>('');

  useEffect(() => {
    migrationApi.listEvents()
      .then(r => setEvents(r.items || (r as any)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleTrigger = async () => {
    if (!familyId || !newVillage) return;
    setTriggering(true);
    setPortError('');
    setPortability(null);
    try {
      const res = await migrationApi.triggerMigration(familyId, newVillage);
      setPortability(res);
      showToast('Migration triggered successfully / સ્થળાંતર શરૂ થયું');
      // Refresh events
      const r = await migrationApi.listEvents();
      setEvents(r.items || (r as any));
    } catch (e: any) {
      setPortError(e.message || 'Migration failed');
    } finally { setTriggering(false); }
  };

  const TYPE_ICON: Record<string, string> = {
    ration_shop_transfer: '🏪',
    school_transfer: '🏫',
    health_reassignment: '🏥',
    general: '📦',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-xl bg-green-500 text-white text-sm font-medium">
          {toast}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-slate-800">Migration Portability / સ્થળાંતર</h1>
        <p className="text-slate-500 text-sm mt-0.5">Inter-district migration and benefit portability (M8)</p>
      </div>

      {/* Trigger form */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-amber-50">
          <h2 className="text-slate-800 font-semibold text-sm flex items-center gap-2">
            <ArrowRightLeft size={16} className="text-orange-500" />
            Trigger Migration / સ્થળાંતર ટ્રિગર
          </h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-slate-600 text-xs font-medium mb-1.5 block">Family ID</label>
              <input
                id="migration-family-id"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="e.g. FAM001"
                value={familyId}
                onChange={e => setFamilyId(e.target.value)}
              />
            </div>
            <div>
              <label className="text-slate-600 text-xs font-medium mb-1.5 block">New Village LGD Code</label>
              <input
                id="migration-new-village"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="e.g. GJ001001"
                value={newVillage}
                onChange={e => setNewVillage(e.target.value)}
              />
            </div>
          </div>

          {portError && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
              <AlertTriangle size={15} />
              {portError}
            </div>
          )}

          <button
            id="migration-trigger-btn"
            onClick={handleTrigger}
            disabled={triggering || !familyId || !newVillage}
            className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium transition-all disabled:opacity-60"
          >
            {triggering ? <Loader2 size={15} className="animate-spin" /> : <ArrowRightLeft size={15} />}
            Trigger Migration
          </button>

          {/* Portability result */}
          {portability && (
            <div className="mt-2 bg-green-50 border border-green-100 rounded-xl p-4 space-y-3 animate-fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle size={18} className="text-green-500" />
                <p className="text-green-700 font-semibold text-sm">Migration Processed</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {portability.actions_taken?.map((action: any, i: number) => (
                  <div key={i} className="bg-white rounded-xl p-3 border border-green-100">
                    <p className="text-slate-700 text-xs font-medium">{TYPE_ICON[action.type] || '📦'} {action.type}</p>
                    <p className="text-slate-500 text-xs mt-0.5">{action.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Events table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-slate-800 font-semibold text-sm flex items-center gap-2">
            <RefreshCw size={15} className="text-orange-500" />
            Migration History / સ્થળાંતર ઇતિહાસ
          </h2>
          <span className="text-slate-400 text-xs">{events.length} events</span>
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 size={24} className="animate-spin text-orange-400" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <ArrowRightLeft size={36} className="mx-auto mb-3 opacity-30" />
            <p>No migrations yet / કોઈ સ્થળાંતર નથી</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['Family ID', 'From Village', 'To Village', 'Type', 'Status', 'Timestamp'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-slate-500 text-xs font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {events.map((e, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 text-slate-700 text-xs font-medium">{e.family_id}</td>
                    <td className="px-5 py-3 text-slate-500 text-xs flex items-center gap-1">
                      <MapPin size={10} />{e.from_village_lgd ?? '—'}
                    </td>
                    <td className="px-5 py-3 text-slate-500 text-xs">{e.to_village_lgd}</td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-0.5 bg-orange-50 text-orange-700 text-xs rounded-md">
                        {TYPE_ICON[e.event_type] || '📦'} {e.event_type}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        e.status === 'completed' ? 'bg-green-100 text-green-700' :
                        e.status === 'failed' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>{e.status}</span>
                    </td>
                    <td className="px-5 py-3 text-slate-400 text-xs">{new Date(e.created_at).toLocaleString('en-IN')}</td>
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
