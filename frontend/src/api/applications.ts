import { fetchApi, apiRequest } from './client';

export interface ApplicationDocument {
  doc_id: string;
  type: string;
  status: string;
  url?: string;
  name_match_score?: number;
}

export interface Application {
  application_id: string;
  family_id: string;
  scheme_id: string;
  applicant_person_id: string;
  district_code?: string;
  status: string;
  reason_code?: string;
  created_via?: string;
  submitted_at?: string;
  documents?: ApplicationDocument[];
}

export interface ApplicationItem {
  application_id: string;
  family_id: string;
  scheme_id: string;
  applicant_person_id: string;
  status: string;
  reason_code?: string;
  note?: string;
  created_via?: string;
  submitted_at?: string;
  documents?: any[];
  history?: { to_status: string; note: string; ts: string }[];
}


export interface ApplicationDecisionPayload {
  decision: 'approve' | 'reject' | 'request_reupload' | 'disburse';
  reason_code?: string;
  note?: string;
}

export async function createApplication(data: { family_id: string; scheme_id: string; applicant_person_id: string; consent_id?: string }) {
  return fetchApi<any>('/applications', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function submitApplication(applicationId: string) {
  return fetchApi<any>(`/applications/${applicationId}/submit`, {
    method: 'POST'
  });
}

export async function decideApplication(applicationId: string, payload: ApplicationDecisionPayload) {
  return fetchApi<any>(`/applications/${applicationId}/decision`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function listApplications(districtCode?: string, status?: string) {
  const params = new URLSearchParams();
  if (districtCode) params.append('district_code', districtCode);
  if (status) params.append('status', status);
  return fetchApi<{ items: ApplicationItem[]; total: number }>(`/applications?${params.toString()}`);
}

export async function getCitizenApplications(familyId?: string): Promise<ApplicationItem[]> {
  const params = new URLSearchParams();
  if (familyId) params.append('family_id', familyId);
  return fetchApi<ApplicationItem[]>(`/citizen/applications?${params.toString()}`);
}

export const applicationsApi = {
  list: (params: { district_code?: string; status?: string; scheme_id?: string; page?: number } = {}) => {
    const q = new URLSearchParams();
    if (params.district_code) q.set("district_code", params.district_code);
    if (params.status) q.set("status", params.status);
    if (params.scheme_id) q.set("scheme_id", params.scheme_id);
    if (params.page) q.set("page", String(params.page));
    return apiRequest<{ items: Application[]; total: number }>(`/applications?${q.toString()}`);
  },

  postDecision: (applicationId: string, decision: string, reasonCode?: string, note?: string) =>
    apiRequest(`/applications/${applicationId}/decision`, {
      method: "POST",
      body: JSON.stringify({ decision, reason_code: reasonCode, note })
    }),

  getFamily: (familyId: string) =>
    apiRequest<any>(`/families/${familyId}`),

  listFamilies: (districtCode?: string) =>
    apiRequest<{ items: any[]; total: number }>(`/families${districtCode ? `?district_code=${districtCode}` : ""}`),

  getSmsList: () =>
    apiRequest<any[]>("/sms/outbox")
};

