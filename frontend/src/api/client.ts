export const API_BASE = '/api';

export function getAuthHeaders() {
  const token = localStorage.getItem('family_id_token') || localStorage.getItem('gujid_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

export async function fetchApi<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    ...getAuthHeaders(),
    ...(options.headers || {})
  };
  
  const targetUrl = url.startsWith('http') ? url : (url.startsWith('/api') ? url : `${API_BASE}${url}`);
  const response = await fetch(targetUrl, {
    ...options,
    headers
  });

  if (!response.ok) {
    let errorMsg = `HTTP Error ${response.status}`;
    try {
      const data = await response.json();
      if (data.detail) errorMsg = data.detail;
      else if (data.message) errorMsg = data.message;
    } catch {}
    throw new Error(errorMsg);
  }

  return response.json();
}

export const apiRequest = fetchApi;

