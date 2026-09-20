import { fetchApi } from './client';

export interface SyncBatchItem {
  client_uuid: string;
  enrollment_data: any;
  consent_method: string;
  consent_proof?: string;
}

export async function syncOfflineBatch(items: SyncBatchItem[]) {
  return fetchApi<any>('/enrollment/sync', {
    method: 'POST',
    body: JSON.stringify({ items })
  });
}

export async function verifyFamilyQRToken(token: string) {
  return fetchApi<any>('/qr/verify', {
    method: 'POST',
    body: JSON.stringify({ token })
  });
}

export async function getQRCardHTML(familyId: string): Promise<string> {
  const token = localStorage.getItem('family_id_token');
  const res = await fetch(`/api/families/${familyId}/card`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  return res.text();
}
