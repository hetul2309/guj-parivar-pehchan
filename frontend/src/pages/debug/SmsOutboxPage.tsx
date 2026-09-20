import React, { useState, useEffect } from 'react';
import { Smartphone, RefreshCw, MessageSquare } from 'lucide-react';
import { fetchApi } from '../../api/client';

export const SmsOutboxPage: React.FC = () => {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSms = async () => {
    setLoading(true);
    try {
      const data = await fetchApi<any[]>('/sms/outbox');
      setMessages(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSms();
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
              <Smartphone className="w-5 h-5" />
            </div>
            <span>મોક SMS આઉટબોક્સ (Feature-Phone Simulated Channel)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            ગામડાંના સામાન્ય ફીચર ફોન ધરાવતા નાગરિકોને મોકલવામાં આવતા ગુજરાતી SMS અહીં જોઈ શકાય છે.
          </p>
        </div>
        <button
          type="button"
          onClick={loadSms}
          className="px-4 py-2 bg-white hover:bg-slate-50 text-teal-700 border border-slate-200 rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" /> તાજું કરો
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-xs text-slate-500 font-bold">લોડ થઈ રહ્યું છે...</div>
      ) : messages.length === 0 ? (
        <div className="p-10 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-500 font-medium">હાલમાં કોઈ નવો SMS મોકલાયો નથી.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((sms) => (
            <div key={sms.id} className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900">
                    મોબાઈલ: {sms.mobile}
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {sms.created_at ? new Date(sms.created_at).toLocaleTimeString('gu-IN') : ''}
                  </span>
                </div>
                <div className="text-xs text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-200 font-medium leading-relaxed">
                  📱 {sms.message}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
