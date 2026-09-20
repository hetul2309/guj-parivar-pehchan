import { fetchApi } from './client';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  role: 'assistant';
  content: string;
  suggested_action?: string;
  application_id?: string;
  grv_id?: string;
  category?: string;
}

export interface GrievanceItem {
  grv_id: string;
  family_id: string;
  application_id?: string;
  category: string;
  description: string;
  status: string;
  assigned_officer_id?: string;
  sla_due?: string;
  created_at?: string;
}

export async function sendChatMessage(messages: ChatMessage[], lang: string = 'gu', familyId?: string): Promise<ChatResponse> {
  return fetchApi<ChatResponse>('/grievance/chat', {
    method: 'POST',
    body: JSON.stringify({ messages, lang, family_id: familyId })
  });
}

export async function fileGrievance(data: { category: string; description: string; application_id?: string; lang?: string; family_id?: string }) {
  return fetchApi<any>('/grievance/file', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function listCitizenGrievances(familyId?: string): Promise<GrievanceItem[]> {
  const params = new URLSearchParams();
  if (familyId) params.append('family_id', familyId);
  return fetchApi<GrievanceItem[]>(`/citizen/grievances?${params.toString()}`);
}

export async function listOfficerGrievances(status?: string, districtCode?: string): Promise<GrievanceItem[]> {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (districtCode) params.append('district_code', districtCode);
  return fetchApi<GrievanceItem[]>(`/grievances?${params.toString()}`);
}

export async function updateGrievanceStatus(grvId: string, status: string, note?: string) {
  return fetchApi<any>(`/grievances/${grvId}/status`, {
    method: 'POST',
    body: JSON.stringify({ status, note })
  });
}
