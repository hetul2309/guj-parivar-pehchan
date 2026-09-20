import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { get, set } from 'idb-keyval';
import {
  QrCode, ScanLine, Wifi, WifiOff, Users, ArrowRight, CheckCircle2,
  Smartphone, Fingerprint, RefreshCw, Printer, ShieldCheck
} from 'lucide-react';
import { processAadhaarQR, getSampleQR, verifyAadhaarOTP, verifyBiometric } from '../../api/identity';
import { syncOfflineBatch, verifyFamilyQRToken } from '../../api/enrollment';
import { showToast } from '../../helpers/showToast';

export const OperatorKiosk: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<'enroll' | 'verify'>('enroll');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);

  // Wizard state
  const [authMethod, setAuthMethod] = useState<'qr' | 'otp' | 'biometric'>('qr');

  // Form State
  const [qrString, setQrString] = useState('');
  const [mobileInput, setMobileInput] = useState('9876543210');
  const [otpInput, setOtpInput] = useState('123456');
  const [bioError, setBioError] = useState<string | null>(null);

  // Prefilled head person
  const [headData, setHeadData] = useState<any>({
    name_en: '',
    name_gu: '',
    dob: '',
    dob_precision: 'exact',
    gender: 'F',
    marital_status: 'widow',
    social_category: 'ST',
    mobile: '9876543210',
    aadhaar_token: '',
    aadhaar_last4: '',
    address: 'દાહોદ ગ્રામ્ય, જિ. દાહોદ'
  });

  const [addressText, setAddressText] = useState('દાહોદ ગ્રામ્ય, જિ. દાહોદ');
  const [villageLgd, setVillageLgd] = useState('VIL-DAH-001');
  const [districtCode, setDistrictCode] = useState('DAHOD');
  const [annualIncome, setAnnualIncome] = useState(45000);
  const [rationCardNo, setRationCardNo] = useState('022409812345');
  const [consentMethod, setConsentMethod] = useState('aadhaar_qr');

  // QR Verify State
  const [verifyTokenInput, setVerifyTokenInput] = useState('');
  const [verifyResult, setVerifyResult] = useState<any>(null);

  const [syncing, setSyncing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const loadQueue = async () => {
    const queue = (await get('offline_enrollment_queue')) || [];
    setOfflineQueue(queue);
  };

  useEffect(() => {
    loadQueue();
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleLoadSampleQR = async () => {
    try {
      const res = await getSampleQR();
      setQrString(res.qr_data);
      const decoded = await processAadhaarQR(res.qr_data);
      if (decoded.success) {
        setHeadData({
          name_en: decoded.person_prefill.name_en,
          name_gu: decoded.person_prefill.name_gu,
          dob: decoded.person_prefill.dob,
          dob_precision: decoded.person_prefill.dob_precision,
          gender: decoded.person_prefill.gender,
          marital_status: 'widow',
          social_category: 'ST',
          mobile: mobileInput,
          aadhaar_token: decoded.aadhaar_token,
          aadhaar_last4: decoded.aadhaar_last4,
          address: decoded.person_prefill.address
        });
        setStatusMessage(
          i18n.language === 'en'
            ? '✅ Aadhaar QR successfully decoded! Details pre-filled.'
            : '✅ આધાર QR સફળતાપૂર્વક ડીકોડ થયું! વિગતો ભરાઈ ગઈ.'
        );
      }
    } catch (e: any) {
      showToast('error', `QR Error: ${e.message}`);
    }
  };

  const handleVerifyOTP = async () => {
    try {
      const res = await verifyAadhaarOTP(mobileInput, otpInput);
      setHeadData({
        name_en: res.person_prefill.name_en,
        name_gu: res.person_prefill.name_gu,
        dob: res.person_prefill.dob,
        dob_precision: res.person_prefill.dob_precision,
        gender: res.person_prefill.gender,
        marital_status: 'widow',
        social_category: 'ST',
        mobile: mobileInput,
        aadhaar_token: res.aadhaar_token,
        aadhaar_last4: res.aadhaar_last4,
        address: res.person_prefill.address
      });
      setStatusMessage(i18n.language === 'en' ? '✅ OTP Verified Successfully!' : '✅ OTP ચકાસણી સફળ!');
      showToast('success', i18n.language === 'en' ? 'OTP Verified Successfully!' : 'OTP ચકાસણી સફળ!');
    } catch (e: any) {
      showToast('error', e.message);
    }
  };

  const handleVerifyBiometric = async (mod: string) => {
    setBioError(null);
    try {
      const res = await verifyBiometric(null, mod);
      if (!res.success) {
        setBioError(res.message);
      } else {
        setStatusMessage(
          i18n.language === 'en'
            ? `✅ Biometric verification completed via ${mod}.`
            : `✅ ${mod} દ્વારા બાયોમેટ્રિક ચકાસણી પૂર્ણ.`
        );
      }
    } catch (e: any) {
      setBioError(e.message);
    }
  };

  const handleSubmitEnrollment = async () => {
    const enrollmentPayload = {
      head: {
        name_en: headData.name_en || 'Kantaben Patel',
        name_gu: headData.name_gu || 'કાન્તાબેન પટેલ',
        dob: headData.dob || '1964-01-01',
        dob_precision: headData.dob_precision || 'year_only',
        gender: headData.gender || 'F',
        marital_status: headData.marital_status || 'widow',
        social_category: headData.social_category || 'ST',
        mobile: headData.mobile,
        mobile_shared: true,
        aadhaar_token: headData.aadhaar_token || 'aa-mock-token-123',
        aadhaar_last4: headData.aadhaar_last4 || '8921',
        relation_to_head: 'head'
      },
      address_text: addressText,
      village_lgd: villageLgd,
      district_code: districtCode,
      annual_income: annualIncome,
      ration_card_no: rationCardNo,
      members: []
    };

    const clientUuid = `UUID-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const syncItem = {
      client_uuid: clientUuid,
      enrollment_data: enrollmentPayload,
      consent_method: consentMethod,
      consent_proof: `Operator Consent: ${consentMethod}`
    };

    if (!isOnline) {
      const currentQ = (await get('offline_enrollment_queue')) || [];
      currentQ.push(syncItem);
      await set('offline_enrollment_queue', currentQ);
      setOfflineQueue(currentQ);
      showToast(
        'warning',
        i18n.language === 'en'
          ? 'Offline mode active! Enrollment saved in offline draft queue. Will sync once online.'
          : 'ઈન્ટરનેટ બંધ છે! નોંધણી ઓફલાઇન ડ્રાફ્ટમાં સાચવી લેવાઈ છે. ઓનલાઇન થતાં જ સિંક થશે.'
      );
    } else {
      setSyncing(true);
      try {
        const res = await syncOfflineBatch([syncItem]);
        showToast(
          'success',
          i18n.language === 'en'
            ? `Enrollment successful! New Family ID: ${res.results[0]?.family_id}. SMS notification sent.`
            : `નોંધણી સફળ! નવો ફેમિલી આઈડી: ${res.results[0]?.family_id}. નાગરિકને SMS મોકલાયો છે.`
        );
      } catch (e: any) {
        showToast('error', `Sync error: ${e.message}`);
      } finally {
        setSyncing(false);
      }
    }
  };

  const handleSyncAll = async () => {
    if (offlineQueue.length === 0) return;
    setSyncing(true);
    try {
      const res = await syncOfflineBatch(offlineQueue);
      await set('offline_enrollment_queue', []);
      setOfflineQueue([]);
      showToast(
        'success',
        i18n.language === 'en'
          ? `${res.synced_count} offline families successfully synced with server!`
          : `${res.synced_count} ઓફલાઇન કુટુંબો સફળતાપૂર્વક સર્વર સાથે સિંક થઈ ગયા!`
      );
    } catch (e: any) {
      showToast('error', `Sync failed: ${e.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleVerifyQRToken = async () => {
    try {
      const res = await verifyFamilyQRToken(verifyTokenInput);
      setVerifyResult(res);
      showToast(
        'success',
        i18n.language === 'en'
          ? 'Valid Gujarat Family ID (Ed25519 Signature Verified)!'
          : 'માન્ય ગુજરાત ફેમિલી આઈડી (Ed25519 ડિજિટલ સહી ચકાસાયેલ)!'
      );
    } catch (e: any) {
      showToast('error', `Verification failed: ${e.message}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Header Banner with High-Contrast Teal */}
      <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 rounded-3xl p-6 sm:p-9 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2.5 mb-2.5">
            <span className="px-3 py-0.5 rounded-full text-xs font-black uppercase bg-white/20 border border-white/30 backdrop-blur-sm">
              {t('kioskBadge')}
            </span>
            <span className={`px-3 py-0.5 rounded-full text-xs font-extrabold flex items-center gap-1.5 ${
              isOnline ? 'bg-emerald-400/20 text-emerald-100 border border-emerald-300/30' : 'bg-rose-500 text-white animate-pulse'
            }`}>
              {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              {isOnline ? t('online') : `${t('offline')} (IndexedDB)`}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            {t('kioskTitle')}
          </h1>
          <p className="text-teal-100 text-xs mt-1 font-medium max-w-2xl">
            {t('kioskSubtitle')}
          </p>
        </div>

        {/* Pending Sync Badge */}
        <div className="relative z-10 flex items-center gap-3.5 bg-black/20 backdrop-blur-md p-3.5 rounded-2xl border border-white/25 shadow-sm">
          <div>
            <div className="text-[11px] text-teal-100 font-bold uppercase tracking-wider">{t('offlinePendingSync')}</div>
            <div className="text-xl font-black">{offlineQueue.length} {t('familiesCount')}</div>
          </div>
          {offlineQueue.length > 0 && isOnline && (
            <button
              type="button"
              disabled={syncing}
              onClick={handleSyncAll}
              className="px-4 py-2 rounded-xl bg-white text-teal-800 hover:bg-teal-50 font-black text-xs shadow-md transition flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              <span>{t('syncNow')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-extrabold">
        <button
          type="button"
          onClick={() => setActiveTab('enroll')}
          className={`pb-3 border-b-2 transition flex items-center gap-2 ${
            activeTab === 'enroll'
              ? 'border-teal-700 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{t('tabNewEnrollment')}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('verify')}
          className={`pb-3 border-b-2 transition flex items-center gap-2 ${
            activeTab === 'verify'
              ? 'border-teal-700 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>{t('tabCardVerifier')}</span>
        </button>
      </div>

      {/* TAB 1: ENROLLMENT WIZARD */}
      {activeTab === 'enroll' && (
        <div className="bg-white rounded-3xl p-6 sm:p-9 border border-slate-200 shadow-sm max-w-4xl mx-auto space-y-6">
          {statusMessage && (
            <div className="p-3.5 bg-teal-50 border border-teal-200 text-teal-800 text-xs rounded-xl font-bold">
              {statusMessage}
            </div>
          )}

          {/* Sub-step 1: Aadhaar Route Selection */}
          <div>
            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2.5">
              {t('step1SelectMethod')}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <button
                type="button"
                onClick={() => setAuthMethod('qr')}
                className={`p-4 rounded-xl border text-center transition-all ${
                  authMethod === 'qr'
                    ? 'border-teal-600 bg-teal-50 text-teal-800 font-bold ring-2 ring-teal-500/20 shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <ScanLine className="w-6 h-6 mx-auto mb-1.5 text-teal-700" />
                <div className="text-xs">{t('methodQr')}</div>
              </button>

              <button
                type="button"
                onClick={() => setAuthMethod('otp')}
                className={`p-4 rounded-xl border text-center transition-all ${
                  authMethod === 'otp'
                    ? 'border-teal-600 bg-teal-50 text-teal-800 font-bold ring-2 ring-teal-500/20 shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <Smartphone className="w-6 h-6 mx-auto mb-1.5 text-teal-700" />
                <div className="text-xs">{t('methodOtp')}</div>
              </button>

              <button
                type="button"
                onClick={() => setAuthMethod('biometric')}
                className={`p-4 rounded-xl border text-center transition-all ${
                  authMethod === 'biometric'
                    ? 'border-teal-600 bg-teal-50 text-teal-800 font-bold ring-2 ring-teal-500/20 shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <Fingerprint className="w-6 h-6 mx-auto mb-1.5 text-teal-700" />
                <div className="text-xs">{t('methodBiometric')}</div>
              </button>
            </div>
          </div>

          {/* Aadhaar Input Area */}
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200">
            {authMethod === 'qr' && (
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-700">
                  {i18n.language === 'en'
                    ? 'Scan secure QR code from Aadhaar card or load demo sample:'
                    : 'આધાર કાર્ડ પરથી સુરક્ષિત QR સ્કેન કરો અથવા ડેમો સેમ્પલ લોડ કરો:'}
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={qrString}
                    onChange={(e) => setQrString(e.target.value)}
                    placeholder="QR Data Base64 String..."
                    className="flex-1 px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleLoadSampleQR}
                    className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl shadow-sm transition shrink-0"
                  >
                    {t('loadSampleQr')}
                  </button>
                </div>
              </div>
            )}

            {authMethod === 'otp' && (
              <div className="flex flex-wrap gap-3.5 items-end">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    {i18n.language === 'en' ? 'Aadhaar Mobile:' : 'આધાર સાથે જોડાયેલ મોબાઈલ:'}
                  </label>
                  <input
                    type="text"
                    value={mobileInput}
                    onChange={(e) => setMobileInput(e.target.value)}
                    className="px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs w-44"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    OTP (Demo: 123456):
                  </label>
                  <input
                    type="text"
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value)}
                    className="px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs w-32"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleVerifyOTP}
                  className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl shadow-sm transition"
                >
                  {t('verifyOtp')}
                </button>
              </div>
            )}

            {authMethod === 'biometric' && (
              <div className="space-y-3">
                <div className="text-xs text-slate-600 font-medium">
                  {i18n.language === 'en'
                    ? 'For manual labor or elderly with worn fingerprints, Iris or Operator Attestation is available:'
                    : 'વૃદ્ધોની ઘસાઈ ગયેલી આંગળીઓ માટે Iris (આંખ) અથવા Operator Attestation વિકલ્પ ઉપલબ્ધ છે:'}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleVerifyBiometric('fingerprint')}
                    className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs"
                  >
                    {i18n.language === 'en' ? 'Fingerprint Scan' : 'અંગૂઠાનું નિશાન (Fingerprint)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleVerifyBiometric('iris')}
                    className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs"
                  >
                    {i18n.language === 'en' ? 'Iris Scan' : 'આંખ સ્કેન (Iris)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleVerifyBiometric('attestation')}
                    className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs"
                  >
                    {i18n.language === 'en' ? 'VCE Attestation' : 'VCE ઓપરેટર ખાતરીપત્રક'}
                  </button>
                </div>
                {bioError && (
                  <div className="text-xs text-rose-700 font-bold bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                    ⚠️ {bioError}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{t('headNameGu')}:</label>
              <input
                type="text"
                value={headData.name_gu}
                onChange={(e) => setHeadData({ ...headData, name_gu: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{t('headNameEn')}:</label>
              <input
                type="text"
                value={headData.name_en}
                onChange={(e) => setHeadData({ ...headData, name_en: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{t('dob')}:</label>
              <input
                type="date"
                value={headData.dob}
                onChange={(e) => setHeadData({ ...headData, dob: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{t('rationCard')}:</label>
              <input
                type="text"
                value={rationCardNo}
                onChange={(e) => setRationCardNo(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{t('villageLgd')}:</label>
              <input
                type="text"
                value={villageLgd}
                onChange={(e) => setVillageLgd(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{t('annualIncome')} (₹):</label>
              <input
                type="number"
                value={annualIncome}
                onChange={(e) => setAnnualIncome(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white font-medium"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">{t('address')}:</label>
              <input
                type="text"
                value={addressText}
                onChange={(e) => setAddressText(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white font-medium"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="pt-5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-500 font-medium">
              {t('consentMode')}: <strong className="text-slate-800">{consentMethod}</strong> ({t('consentNote')})
            </div>
            <button
              type="button"
              disabled={syncing}
              onClick={handleSubmitEnrollment}
              className="w-full sm:w-auto px-6 py-3.5 bg-teal-700 hover:bg-teal-800 text-white font-black text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isOnline ? t('submitEnrollment') : t('saveToOffline')}</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: QR CARD VERIFIER (Ed25519) */}
      {activeTab === 'verify' && (
        <div className="bg-white rounded-3xl p-6 sm:p-9 border border-slate-200 shadow-sm max-w-2xl mx-auto space-y-6">
          <div>
            <h3 className="text-base font-black text-slate-900">{t('offlineVerifierTitle')}</h3>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              {t('offlineVerifierDesc')}
            </p>
          </div>

          <div className="space-y-3.5">
            <textarea
              rows={3}
              value={verifyTokenInput}
              onChange={(e) => setVerifyTokenInput(e.target.value)}
              placeholder="Ed25519 Token Base64 (Card QR token)..."
              className="w-full p-3.5 border border-slate-300 rounded-xl text-xs font-mono bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <button
              type="button"
              onClick={handleVerifyQRToken}
              className="px-6 py-3 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl shadow-sm transition"
            >
              {t('verifySignature')}
            </button>
          </div>

          {verifyResult && (
            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs space-y-2.5">
              <div className="font-black text-emerald-900 text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" /> {t('validCard')}
              </div>
              <div className="grid grid-cols-2 gap-3 text-slate-700 font-medium pt-2 border-t border-emerald-200">
                <div>{t('officialId')}: <span className="font-bold font-mono text-teal-800">{verifyResult.family_id}</span></div>
                <div>{t('headOfFamily')}: <span className="font-bold text-slate-900">{verifyResult.head_name_gu}</span></div>
                <div>{t('districtCode')}: <span className="font-bold text-slate-900">{verifyResult.district_code}</span></div>
                <div>{t('activeMembersCount')}: <span className="font-bold text-slate-900">{verifyResult.active_members_count}</span></div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
