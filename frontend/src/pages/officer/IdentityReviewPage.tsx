import React, { useState, useEffect } from 'react';
import { UserCheck, Check, X, RefreshCw } from 'lucide-react';
import { listNameReviews, decideNameReview, NameReviewItem } from '../../api/identity';
import { showToast } from '../../helpers/showToast';

export const IdentityReviewPage: React.FC = () => {
  const [reviews, setReviews] = useState<NameReviewItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const data = await listNameReviews();
      setReviews(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, []);

  const handleDecision = async (reviewId: string, decision: 'accept' | 'reject') => {
    try {
      await decideNameReview(reviewId, decision);
      showToast('success', `નિર્ણય નોંધાયો: ${decision === 'accept' ? 'મંજૂર' : 'નામંજૂર'}`);
      loadReviews();
    } catch (e: any) {
      showToast('error', e.message);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
              <UserCheck className="w-5 h-5" />
            </div>
            <span>નામ ચકાસણી સમીક્ષા કતાર (M2 Name Review Queue)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            જ્યાં ગુજરાતી અને અંગ્રેજી નામનો મેચ સ્કોર ૭૦ થી ૮૪ વચ્ચે હોય, તેવા કેસ અધિકારી સમીક્ષા માટે અહીં આવે છે.
          </p>
        </div>
        <button
          type="button"
          onClick={loadReviews}
          className="px-4 py-2 bg-white hover:bg-slate-50 text-teal-700 border border-slate-200 rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" /> તાજું કરો
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-xs text-slate-500 font-bold">લોડ થઈ રહ્યું છે...</div>
      ) : reviews.length === 0 ? (
        <div className="p-10 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 mx-auto flex items-center justify-center mb-3">
            <Check className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-sm text-slate-900">કોઈ પેન્ડિંગ નામ સમીક્ષા નથી</h3>
          <p className="text-xs text-slate-500 mt-1">તમામ આધાર, પાન અને રેશનકાર્ડ નામો સ્વતઃ લિંક થઈ ગયા છે.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {reviews.map((r) => (
            <div key={r.id} className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-teal-50 text-teal-800 border border-teal-200">
                  {r.id_type}
                </span>
                <span className="text-xs font-black text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                  મેચ સ્કોર: {r.score}%
                </span>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5 text-xs">
                <div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase">ફેમિલી આઈડી નામ (નામ A):</div>
                  <div className="font-extrabold text-slate-900 text-sm mt-0.5">{r.name_a}</div>
                </div>
                <div className="pt-2.5 border-t border-slate-200">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">સરકારી ડેટાબેઝ નામ (નામ B):</div>
                  <div className="font-extrabold text-slate-900 text-sm mt-0.5">{r.name_b}</div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => handleDecision(r.id, 'accept')}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-xs"
                >
                  <Check className="w-4 h-4" />
                  <span>માન્ય રાખો (Accept)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDecision(r.id, 'reject')}
                  className="flex-1 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-xs"
                >
                  <X className="w-4 h-4" />
                  <span>અસ્વીકાર (Reject)</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
