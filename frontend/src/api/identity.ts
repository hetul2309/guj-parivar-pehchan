import { fetchApi } from './client';

export interface QRScanResult {
  success: boolean;
  aadhaar_token: string;
  aadhaar_last4: string;
  person_prefill: {
    name_en: string;
    name_gu: string;
    dob: string;
    dob_precision: string;
    gender: string;
    address: string;
    aadhaar_last4: string;
  };
}

export interface NameReviewItem {
  id: string;
  person_id: string;
  id_type: string;
  name_a: string;
  name_b: string;
  score: number;
  status: string;
  created_at: string;
}

export async function processAadhaarQR(qrData: string): Promise<QRScanResult> {
  return fetchApi<QRScanResult>('/identity/aadhaar/qr', {
    method: 'POST',
    body: JSON.stringify({ qr_data: qrData })
  });
}

export async function getSampleQR(): Promise<{ qr_data: string; name: string }> {
  return fetchApi<{ qr_data: string; name: string }>('/identity/aadhaar/sample-qr');
}

export async function sendAadhaarOTP(mobile: string) {
  return fetchApi<any>('/identity/aadhaar/otp/send', {
    method: 'POST',
    body: JSON.stringify({ mobile })
  });
}

export async function verifyAadhaarOTP(mobile: string, otp: string): Promise<QRScanResult> {
  return fetchApi<QRScanResult>('/identity/aadhaar/otp/verify', {
    method: 'POST',
    body: JSON.stringify({ mobile, otp })
  });
}

export async function verifyBiometric(personId: string | null, modality: string) {
  return fetchApi<any>('/identity/aadhaar/biometric', {
    method: 'POST',
    body: JSON.stringify({ person_id: personId, modality })
  });
}

export async function linkRationCard(familyId: string, cardNo: string) {
  return fetchApi<any>('/identity/ration/link', {
    method: 'POST',
    body: JSON.stringify({ family_id: familyId, card_no: cardNo })
  });
}

export async function listNameReviews(): Promise<NameReviewItem[]> {
  return fetchApi<NameReviewItem[]>('/identity/review-queue');
}

export async function decideNameReview(reviewId: string, decision: 'accept' | 'reject') {
  return fetchApi<any>(`/identity/review/${reviewId}`, {
    method: 'POST',
    body: JSON.stringify({ decision })
  });
}
