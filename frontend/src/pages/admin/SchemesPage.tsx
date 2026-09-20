import React, { useEffect, useState } from 'react';
import { schemesApi, Scheme, SchemeCreate } from '../../api/schemes';
import { eligibilityApi } from '../../api/eligibility';
import {
  Plus, Edit2, Trash2, Loader2, CheckCircle, XCircle,
  Sparkles, Code2, AlertTriangle, Save, X
} from 'lucide-react';
import { showToast } from '../../helpers/showToast';

const BLANK_SCHEME: Partial<SchemeCreate> = {
  name_en: '', name_gu: '', dept: '', benefit_type: '', amount_max: 0,
  is_active: true, rules: [], desc_en: '', desc_gu: ''
};

function SchemeModal({
  scheme, onClose, onSave
}: {
  scheme: Partial<SchemeCreate> | null;
  onClose: () => void;
  onSave: (s: SchemeCreate) => void;
}) {
  const [form, setForm] = useState<Partial<SchemeCreate>>(scheme || BLANK_SCHEME);
  const [rulesJson, setRulesJson] = useState(JSON.stringify(form.rules || [], null, 2));
  const [jsonError, setJsonError] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const handleSave = () => {
    try {
      const rules = JSON.parse(rulesJson);
      setJsonError('');
      onSave({ ...form, rules } as SchemeCreate);
    } catch {
      setJsonError('Invalid JSON in rules');
    }
  };

  const handleAiDraft = async () => {
    if (!aiPrompt) return;
    setAiLoading(true);
    try {
      const res = await eligibilityApi.draftRules(aiPrompt);
      setRulesJson(JSON.stringify(res.rules || res, null, 2));
    } catch { } finally { setAiLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-slate-800 font-semibold">{(form as any).scheme_id ? 'Edit Scheme' : 'New Scheme'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-slate-600 text-xs font-medium mb-1 block">Name (English)</label>
              <input
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900"
                value={form.name_en || ''}
                onChange={e => setForm(f => ({ ...f, name_en: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-slate-600 text-xs font-medium mb-1 block">Name (Gujarati)</label>
              <input
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900"
                value={form.name_gu || ''}
                onChange={e => setForm(f => ({ ...f, name_gu: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-slate-600 text-xs font-medium mb-1 block">Department</label>
              <input
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900"
                value={form.dept || ''}
                onChange={e => setForm(f => ({ ...f, dept: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-slate-600 text-xs font-medium mb-1 block">Benefit Type</label>
              <input
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900"
                value={form.benefit_type || ''}
                onChange={e => setForm(f => ({ ...f, benefit_type: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-slate-600 text-xs font-medium mb-1 block">Max Amount (₹)</label>
              <input
                type="number"
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900"
                value={form.amount_max || ''}
                onChange={e => setForm(f => ({ ...f, amount_max: Number(e.target.value) }))}
              />
            </div>
            <div className="flex items-center gap-3 pt-5">
              <label className="text-slate-700 text-sm font-medium">Active</label>
              <input
                type="checkbox"
                className="w-4 h-4 accent-teal-700"
                checked={form.is_active ?? true}
                onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
              />
            </div>
          </div>

          {/* Eligibility rules */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-slate-700 text-xs font-bold flex items-center gap-1.5">
                <Code2 size={12} />Eligibility Rules (JSON-Logic)
              </label>
            </div>

            {/* AI Rule Drafter */}
            <div className="flex gap-2 mb-3">
              <input
                className="flex-1 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900"
                placeholder="Describe eligibility in plain language (AI will draft rules)…"
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAiDraft()}
              />
              <button
                onClick={handleAiDraft}
                disabled={aiLoading}
                className="flex items-center gap-1.5 px-3 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-60"
              >
                {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                AI Draft
              </button>
            </div>

            <textarea
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none text-slate-900"
              rows={8}
              value={rulesJson}
              onChange={e => setRulesJson(e.target.value)}
            />
            {jsonError && (
              <p className="text-red-600 text-xs mt-1 flex items-center gap-1 font-bold"><AlertTriangle size={11} />{jsonError}</p>
            )}
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 text-sm hover:bg-slate-50 font-medium">Cancel</button>
          <button onClick={handleSave} className="flex items-center gap-2 px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-sm font-bold shadow-sm">
            <Save size={14} />Save Scheme
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminSchemesPage() {
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Partial<SchemeCreate> | null | 'new'>(null);

  const fetchSchemes = async () => {
    setLoading(true);
    try {
      const res = await schemesApi.list();
      setSchemes(res.items || (res as any));
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { fetchSchemes(); }, []);

  const handleSave = async (data: SchemeCreate) => {
    try {
      if ((data as any).scheme_id) {
        await schemesApi.update((data as any).scheme_id, data);
        showToast('Scheme updated / યોજના અપડેટ', 'success');
      } else {
        await schemesApi.create(data);
        showToast('Scheme created / યોજના બનાવી', 'success');
      }
      setModal(null);
      fetchSchemes();
    } catch (e: any) {
      showToast(e.message || 'Failed', 'error');
    }
  };

  const handleDelete = async (schemeId: string) => {
    if (!confirm('Delete this scheme? / આ યોજના કાઢી નાખો?')) return;
    try {
      await schemesApi.delete(schemeId);
      showToast('Scheme deleted', 'success');
      fetchSchemes();
    } catch (e: any) {
      showToast(e.message || 'Failed', 'error');
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Modal */}
      {modal !== null && (
        <SchemeModal
          scheme={modal === 'new' ? BLANK_SCHEME : modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Scheme Studio / યોજના સ્ટુડિયો</h1>
          <p className="text-slate-600 text-sm mt-0.5">Create and manage eligibility rules (M4)</p>
        </div>
        <button
          id="new-scheme-btn"
          onClick={() => setModal('new')}
          className="flex items-center gap-2 px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-sm font-bold transition-all shadow-sm"
        >
          <Plus size={16} />New Scheme
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 size={28} className="animate-spin text-teal-700" />
        </div>
      ) : (
        <div className="grid gap-4">
          {schemes.map(scheme => (
            <div key={scheme.scheme_id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-teal-500 transition-all duration-200 overflow-hidden">
              <div className="px-6 py-4 flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-slate-900 font-bold text-sm">{scheme.name_en}</h3>
                    <span className="text-slate-500 text-sm font-medium">{scheme.name_gu}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                      scheme.is_active ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>{scheme.is_active ? 'Active' : 'Inactive'}</span>
                  </div>
                  <div className="flex items-center gap-4 mt-2 flex-wrap">
                    <span className="px-2.5 py-0.5 bg-teal-50 text-teal-800 text-xs rounded-md font-bold uppercase tracking-wide border border-teal-200">{scheme.dept}</span>
                    <span className="text-slate-500 text-xs">{scheme.benefit_type}</span>
                    {scheme.amount_max && <span className="text-slate-600 text-xs font-semibold">Max ₹{scheme.amount_max.toLocaleString()}</span>}
                    <span className="text-slate-500 text-xs">{scheme.rules?.length ?? 0} rules</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    id={`edit-scheme-${scheme.scheme_id}`}
                    onClick={() => setModal(scheme as any)}
                    className="p-2 text-slate-500 hover:text-teal-700 hover:bg-teal-50 rounded-xl transition-all"
                  >
                    <Edit2 size={15} />
                  </button>
                  <button
                    id={`delete-scheme-${scheme.scheme_id}`}
                    onClick={() => handleDelete(scheme.scheme_id)}
                    className="p-2 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-all"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              {/* Rules preview */}
              {scheme.rules && scheme.rules.length > 0 && (
                <div className="px-6 pb-4">
                  <div className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
                    <p className="text-slate-500 text-xs font-bold mb-1">Rules preview:</p>
                    <code className="text-slate-700 text-xs font-mono line-clamp-2">
                      {JSON.stringify(scheme.rules[0])}
                    </code>
                    {scheme.rules.length > 1 && <p className="text-slate-500 text-xs mt-1">+{scheme.rules.length - 1} more rules</p>}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
