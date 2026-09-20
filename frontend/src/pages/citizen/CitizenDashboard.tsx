import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Users, Award, CheckCircle2, Clock, AlertCircle, FileText, QrCode,
  ArrowRight, ShieldCheck, Sparkles, Send, RefreshCw
} from 'lucide-react';
import { SpeechButton } from '../../components/shared/SpeechButton';
import { VoiceInput } from '../../components/shared/VoiceInput';
import {
  getFamily, getFamilyEligibility, getFamilyDocuments, getFamilyTree,
  FamilyDetail, SchemeEligibility, DocumentItem
} from '../../api/family';
import {
  createApplication, submitApplication, getCitizenApplications, ApplicationItem
} from '../../api/applications';
import { sendChatMessage, ChatMessage } from '../../api/grievance';

export const CitizenDashboard: React.FC = () => {
  const { t, i18n } = useTranslation();

  const [family, setFamily] = useState<FamilyDetail | null>(null);
  const [eligibility, setEligibility] = useState<SchemeEligibility[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [treeData, setTreeData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Initial bot greeting based on active language
  const getInitialBotGreeting = () => {
    if (i18n.language === 'en') {
      return 'Namaste Kantaben! I am your Gujarat Family ID & Scheme Assistant. Ask me anything regarding pensions, ration cards, or application status via voice or text.';
    }
    if (i18n.language === 'hi') {
      return 'नमस्ते कान्ताબેન! मैं आपका गुजरात फैमिली आईडी व योजना सहायक हूँ। पेंशन, राशन कार्ड या आवेदन स्थिति के बारे में बोलकर या लिखकर पूछ सकते हैं।';
    }
    return 'નમસ્તે કાન્તાબેન! હું તમારો સરકારી યોજના અને ફરિયાદ સહાયક છું. તમને પેન્શન, રેશનકાર્ડ કે અરજી વિશે કંઈપણ પૂછવું હોય તો બોલીને કે લખીને જણાવી શકો છો.';
  };

  // Chatbot State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: getInitialBotGreeting()
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Update initial greeting if user changes language and no chat has happened yet
  useEffect(() => {
    if (chatMessages.length === 1 && chatMessages[0].role === 'assistant') {
      setChatMessages([{ role: 'assistant', content: getInitialBotGreeting() }]);
    }
  }, [i18n.language]);

  // Default demo family is Kantaben's Dahod family
  const familyId = "GJ-38915001";

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [famRes, eligRes, docRes, appRes, treeRes] = await Promise.all([
        getFamily(familyId),
        getFamilyEligibility(familyId),
        getFamilyDocuments(familyId),
        getCitizenApplications(familyId),
        getFamilyTree(familyId)
      ]);
      setFamily(famRes);
      setEligibility(eligRes);
      setDocuments(docRes);
      setApplications(appRes);
      setTreeData(treeRes);
    } catch (e) {
      console.error("Failed to fetch family data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleApplyScheme = async (schemeId: string, applicantId: string) => {
    try {
      const res = await createApplication({
        family_id: familyId,
        scheme_id: schemeId,
        applicant_person_id: applicantId
      });
      await submitApplication(res.application_id);
      alert(
        i18n.language === 'en'
          ? `Application (${res.application_id}) submitted successfully! SMS notification sent.`
          : i18n.language === 'hi'
          ? `योजना आवेदन (${res.application_id}) सफलतापूर्वक सबमिट हो गया! एसएमएस भेजा गया।`
          : `યોજના અરજી (${res.application_id}) સફળતાપૂર્વક સબમિટ થઈ ગઈ છે! SMS મોકલાયો છે.`
      );
      loadAllData();
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    }
  };

  const handleSendChat = async (queryText?: string) => {
    const textToSend = queryText || chatInput;
    if (!textToSend.trim()) return;

    const newMsgs: ChatMessage[] = [...chatMessages, { role: 'user', content: textToSend }];
    setChatMessages(newMsgs);
    setChatInput('');
    setChatLoading(true);

    try {
      const langCode = i18n.language === 'en' ? 'en' : i18n.language === 'hi' ? 'hi' : 'gu';
      const res = await sendChatMessage(newMsgs, langCode, familyId);
      setChatMessages([...newMsgs, { role: 'assistant', content: res.content }]);
    } catch (e: any) {
      const errMsg =
        i18n.language === 'en'
          ? 'Sorry, could not connect to grievance server.'
          : i18n.language === 'hi'
          ? 'क्षमा करें, सर्वर से संपर्क नहीं हो सका।'
          : 'માફ કરશો, સર્વર સાથે સંપર્ક થઈ શક્યો નથી.';
      setChatMessages([...newMsgs, { role: 'assistant', content: errMsg }]);
    } finally {
      setChatLoading(false);
    }
  };

  const getRelationText = (rel: string) => {
    if (i18n.language === 'en') {
      const map: Record<string, string> = {
        'head': 'Head of Family',
        'son': 'Son',
        'daughter_in_law': 'Daughter-in-law',
        'grandson': 'Grandson',
        'wife': 'Wife',
        'husband': 'Husband',
        'daughter': 'Daughter',
        'mother': 'Mother',
        'father': 'Father'
      };
      return map[rel.toLowerCase()] || rel;
    }
    if (i18n.language === 'hi') {
      const map: Record<string, string> = {
        'head': 'परिवार मुखिया',
        'son': 'पुत्र',
        'daughter_in_law': 'पुत्रवधू',
        'grandson': 'पोता',
        'wife': 'पत्नी',
        'husband': 'पति',
        'daughter': 'पुत्री',
        'mother': 'माता',
        'father': 'पिता'
      };
      return map[rel.toLowerCase()] || rel;
    }
    return rel;
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <RefreshCw className="w-8 h-8 text-teal-700 animate-spin mb-3" />
        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
          {i18n.language === 'en' ? 'Loading Family Profile...' : 'કુટુંબ વિગતો લોડ થઈ રહી છે...'}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* 1. High-Contrast Teal Hero Family Card */}
      {family && (
        <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 rounded-3xl p-6 sm:p-9 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-2xl pointer-events-none -mr-20 -mt-20" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2.5">
                <span className="px-3.5 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-black uppercase tracking-wider text-white border border-white/30">
                  {t('officialId')}
                </span>
                <span className="px-3 py-1 bg-emerald-400/20 backdrop-blur-md rounded-full text-xs font-bold text-emerald-100 border border-emerald-300/30 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" /> {t('activeFamily')}
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight flex items-center gap-3">
                {family.family_id}
                <SpeechButton
                  textToRead={
                    i18n.language === 'en'
                      ? `Your Gujarat Family ID is ${family.family_id}. Head of Family is Kantaben Patel.`
                      : `તમારો ગુજરાત ફેમિલી આઈડી નંબર છે ${family.family_id}. કુટુંબના વડા કાન્તાબેન પટેલ છે.`
                  }
                  className="bg-white/20 text-white border-white/30 hover:bg-white/30"
                />
              </h1>
              <p className="text-sm text-teal-100 mt-2 max-w-xl font-medium leading-relaxed">
                📍 {family.address_text} · LGD: {family.village_lgd} ({family.district_code})
              </p>
              <div className="mt-4 flex flex-wrap gap-3 sm:gap-4 text-xs text-teal-100/90 font-bold">
                <span className="bg-black/20 px-3 py-1 rounded-xl backdrop-blur-sm">
                  {t('annualIncome')}: ₹{family.annual_income.toLocaleString('en-IN')} ({t('talatiCert')})
                </span>
                <span className="bg-black/20 px-3 py-1 rounded-xl backdrop-blur-sm">
                  {t('rationCard')}: 022409812345
                </span>
                <span className="bg-black/20 px-3 py-1 rounded-xl backdrop-blur-sm">
                  {t('mobile')}: 9876543210 ({t('shared')})
                </span>
              </div>
            </div>

            <div className="flex sm:flex-col gap-3 w-full sm:w-auto">
              <a
                href={`/api/families/${family.family_id}/card`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-white text-slate-900 hover:bg-teal-50 font-black text-xs shadow-lg transition duration-200 group"
              >
                <QrCode className="w-4 h-4 text-teal-700 group-hover:scale-110 transition-transform" />
                <span>{t('downloadCard')}</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 2. Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Members & Schemes */}
        <div className="lg:col-span-2 space-y-8">
          {/* Members Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                  <Users className="w-5 h-5" />
                </div>
                <h2 className="text-base font-extrabold text-slate-900">
                  {t('familyMembers')} ({family?.members.length || 0})
                </h2>
              </div>
              <SpeechButton
                textToRead={
                  i18n.language === 'en'
                    ? `Total ${family?.members.length} members are registered in this family.`
                    : `આ કુટુંબમાં કુલ ${family?.members.length} સભ્યો નોંધાયેલા છે.`
                }
                size="sm"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-extrabold uppercase">
                    <th className="pb-3.5">{t('name')}</th>
                    <th className="pb-3.5">{t('relation')}</th>
                    <th className="pb-3.5">{t('age')}</th>
                    <th className="pb-3.5">{t('gender')}</th>
                    <th className="pb-3.5">{t('aadhaarNumber')}</th>
                    <th className="pb-3.5">{t('status')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {family?.members.map((m) => (
                    <tr key={m.person_id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 font-bold text-slate-900">
                        {i18n.language === 'en' ? m.name_en : m.name_gu}
                        <div className="text-[10px] text-slate-500 font-normal">
                          {i18n.language === 'en' ? m.name_gu : m.name_en}
                        </div>
                      </td>
                      <td className="py-3.5 text-slate-700 font-semibold">
                        {getRelationText(m.relation_to_head)}
                      </td>
                      <td className="py-3.5 text-slate-700 font-medium">
                        {m.age} {t('years')} {m.age_approx && <span className="text-[10px] text-amber-700 font-bold">({t('approx')})</span>}
                      </td>
                      <td className="py-3.5 text-slate-700">
                        {m.gender === 'F' ? t('female') : t('male')}
                      </td>
                      <td className="py-3.5 font-mono text-slate-700">
                        XXXX-XXXX-{m.aadhaar_last4 || '8921'}
                      </td>
                      <td className="py-3.5">
                        {m.is_deceased ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px]">
                            {t('deceased')}
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold text-[10px] border border-emerald-200">
                            {t('alive')}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Family Tree */}
            {treeData && (
              <div className="mt-6 pt-6 border-t border-slate-200">
                <div className="text-[11px] font-black text-slate-500 mb-3.5 uppercase tracking-wider">
                  {t('familyTree')}
                </div>
                <div className="flex flex-wrap gap-2.5 items-center justify-center p-5 bg-slate-50 rounded-2xl border border-slate-200">
                  {treeData.nodes?.map((node: any) => (
                    <div
                      key={node.id}
                      className={`px-4 py-2.5 rounded-xl text-center shadow-xs border transition ${
                        node.is_head
                          ? 'bg-teal-700 text-white border-teal-800 font-extrabold shadow-sm'
                          : 'bg-white text-slate-900 border-slate-200 font-bold'
                      } text-xs`}
                    >
                      <div>{node.name}</div>
                      <div className={`text-[10px] mt-0.5 ${node.is_head ? 'text-teal-100' : 'text-slate-500'}`}>
                        {node.is_head ? t('headOfFamily') : (getRelationText(node.marital_status) || t('member'))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Scheme Eligibility Panel */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                  <Award className="w-5 h-5" />
                </div>
                <h2 className="text-base font-extrabold text-slate-900">{t('eligibleSchemesTitle')}</h2>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-teal-50 text-teal-800 border border-teal-200">
                {eligibility.filter(e => e.eligible).length} {t('schemesEligibleCount')}
              </span>
            </div>

            <div className="space-y-4">
              {eligibility.map((scheme) => (
                <div
                  key={scheme.scheme_id}
                  className="p-5 rounded-2xl border border-slate-200 hover:border-teal-500 hover:bg-slate-50/50 transition flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2.5">
                      <h3 className="font-bold text-slate-900 text-sm group-hover:text-teal-700 transition-colors">
                        {i18n.language === 'en' ? scheme.name_en : scheme.name_gu}
                      </h3>
                      <SpeechButton
                        textToRead={
                          i18n.language === 'en'
                            ? `Scheme: ${scheme.name_en}. Benefit: ${scheme.benefit_value} rupees.`
                            : `યોજના: ${scheme.name_gu}. લાભ રકમ: ${scheme.benefit_value} રૂપિયા. ${scheme.reasons.map(r => r.text_gu).join('. ')}`
                        }
                        size="sm"
                      />
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 font-medium">
                      {i18n.language === 'en' ? scheme.name_gu : scheme.name_en}
                    </div>

                    {/* Reasons */}
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {scheme.reasons.map((r, idx) => (
                        <span key={idx} className="px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-700" /> {r.text_gu}
                        </span>
                      ))}
                    </div>

                    {scheme.missing.length > 0 && (
                      <div className="mt-2 text-xs text-amber-800 font-bold">
                        ⚠️ {t('missingDocWarning')}: {scheme.missing.map(m => m.text_gu).join(', ')}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                    <div className="text-right">
                      <div className="text-[10px] text-slate-500 font-extrabold uppercase">{t('benefitValue')}</div>
                      <div className="text-lg font-black text-teal-700">₹{scheme.benefit_value.toLocaleString('en-IN')}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleApplyScheme(scheme.scheme_id, family?.head_person_id || 'p_kanta_ben')}
                      className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-black text-xs rounded-xl shadow-sm transition flex items-center gap-1.5"
                    >
                      <span>{t('applyNow')}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Applications Timeline */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                <Clock className="w-5 h-5" />
              </div>
              <h2 className="text-base font-extrabold text-slate-900">
                {t('myApplications')} ({applications.length})
              </h2>
            </div>

            {applications.length === 0 ? (
              <p className="text-xs text-slate-500">{t('noApplications')}</p>
            ) : (
              <div className="space-y-3.5">
                {applications.map((app) => (
                  <div key={app.application_id} className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center justify-between">
                      <div className="font-extrabold text-xs text-slate-900">{app.application_id} ({app.scheme_id})</div>
                      <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase ${
                        app.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                        app.status === 'disbursed' ? 'bg-teal-100 text-teal-800' :
                        app.status === 'rejected' ? 'bg-rose-100 text-rose-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {app.status === 'approved' ? t('statusApproved') :
                         app.status === 'disbursed' ? t('statusDisbursed') :
                         app.status === 'rejected' ? t('statusRejected') :
                         t('statusUnderReview')}
                      </span>
                    </div>

                    {app.reason_code && (
                      <div className="mt-2 text-xs text-rose-700 bg-rose-50 p-2.5 rounded-xl border border-rose-200 font-bold">
                        {t('rejectionReason')}: {app.reason_code} {app.note ? `(${app.note})` : ''}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Column: Grievance AI Chatbot + Documents */}
        <div className="space-y-8">
          {/* Grievance Assistant Chatbot */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col h-[540px]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-700 text-white flex items-center justify-center font-bold shadow-sm">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">{t('aiBotTitle')}</h3>
                  <div className="text-[10px] text-teal-700 font-bold">{t('aiBotSubtitle')}</div>
                </div>
              </div>
              <SpeechButton
                textToRead={
                  i18n.language === 'en'
                    ? 'I am Gujarat Family ID Assistant. You can speak or type to ask questions.'
                    : 'હું ગુજરાત ફેમિલી આઈડી સહાયક છું. તમે બોલીને પણ તમારી સમસ્યા જણાવી શકો છો.'
                }
                size="sm"
              />
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1 text-xs">
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-3.5 rounded-2xl whitespace-pre-wrap leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-teal-700 text-white rounded-br-none shadow-sm'
                        : 'bg-slate-100 text-slate-900 rounded-bl-none border border-slate-200 font-medium'
                    }`}
                  >
                    {msg.content}
                  </div>
                  {msg.role === 'assistant' && (
                    <SpeechButton
                      textToRead={msg.content}
                      size="sm"
                      className="mt-1"
                    />
                  )}
                </div>
              ))}
              {chatLoading && (
                <div className="text-slate-500 text-xs italic flex items-center gap-2 font-medium">
                  <RefreshCw className="w-3 h-3 text-teal-700 animate-spin" /> {t('botThinking')}
                </div>
              )}
            </div>

            {/* Chat Input + Voice Button */}
            <div className="pt-3 border-t border-slate-200 flex items-center gap-2">
              <VoiceInput
                onTranscript={(transcript) => handleSendChat(transcript)}
                lang={i18n.language === 'en' ? 'en-IN' : i18n.language === 'hi' ? 'hi-IN' : 'gu-IN'}
              />
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                placeholder={t('typeOrSpeak')}
                className="flex-1 px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium text-slate-900 placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={() => handleSendChat()}
                className="p-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl shadow-sm transition"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Verified Documents */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                <FileText className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-extrabold text-slate-900">{t('verifiedDocs')}</h3>
            </div>
            <div className="space-y-2.5">
              {documents.map((d) => (
                <div key={d.doc_id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-900">{d.doc_type}</div>
                    <div className="text-[10px] text-slate-500">
                      {t('source')}: {d.source} ({t('match')}: {d.name_match_score}%)
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-extrabold text-[10px] border border-emerald-200">
                    {t('verified')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
