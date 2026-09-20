import React, { useState, useEffect } from 'react';
import { MessageSquare, Clock, RefreshCw } from 'lucide-react';
import { listOfficerGrievances, updateGrievanceStatus, GrievanceItem } from '../../api/grievance';

export const OfficerGrievancePage: React.FC = () => {
  const [grievances, setGrievances] = useState<GrievanceItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadGrievances = async () => {
    setLoading(true);
    try {
      const data = await listOfficerGrievances();
      setGrievances(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGrievances();
  }, []);

  const handleUpdate = async (grvId: string, status: string) => {
    try {
      await updateGrievanceStatus(grvId, status, `Updated by Dahod District Officer`);
      alert(`ફરિયાદ ${grvId} ની સ્થિતિ અપડેટ થઈ: ${status}`);
      loadGrievances();
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
              <MessageSquare className="w-5 h-5" />
            </div>
            <span>નાગરિક ફરિયાદ અને અપીલ નિવારણ (M9 Grievance Portal)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            દાહોદ જિલ્લામાંથી આવેલી પેન્શન, રદ થયેલી અરજીઓ અને દસ્તાવેજ સુધારણા ફરિયાદો
          </p>
        </div>
        <button
          type="button"
          onClick={loadGrievances}
          className="px-4 py-2 bg-white hover:bg-slate-50 text-teal-700 border border-slate-200 rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" /> તાજું કરો
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-xs text-slate-500 font-bold">લોડ થઈ રહ્યું છે...</div>
      ) : grievances.length === 0 ? (
        <div className="p-10 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-500">હાલમાં કોઈ નવી ફરિયાદ નોંધાયેલ નથી.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grievances.map((g) => (
            <div key={g.grv_id} className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono font-extrabold text-xs text-teal-800 bg-teal-50 px-3 py-1 rounded-lg border border-teal-200">
                    {g.grv_id}
                  </span>
                  <span className="text-xs font-extrabold text-slate-900">કુટુંબ: {g.family_id}</span>
                </div>
                <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase ${
                  g.status === 'resolved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                  g.status === 'under_investigation' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                  'bg-amber-100 text-amber-900 border border-amber-300'
                }`}>
                  {g.status}
                </span>
              </div>

              <div className="text-xs text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-200 leading-relaxed font-medium">
                <strong className="text-slate-900">વિગત:</strong> {g.description}
              </div>

              <div className="flex items-center justify-between pt-2 text-xs text-slate-500 font-medium">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-teal-700" />
                  <span>SLA લક્ષ્યાંક: ૪૮ કલાક</span>
                </div>
                <div className="flex items-center gap-2">
                  {g.status !== 'under_investigation' && g.status !== 'resolved' && (
                    <button
                      type="button"
                      onClick={() => handleUpdate(g.grv_id, 'under_investigation')}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs transition shadow-xs"
                    >
                      તપાસ શરૂ કરો
                    </button>
                  )}
                  {g.status !== 'resolved' && (
                    <button
                      type="button"
                      onClick={() => handleUpdate(g.grv_id, 'resolved')}
                      className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-bold text-xs shadow-sm transition"
                    >
                      નિવારણ થયું (Resolve)
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
