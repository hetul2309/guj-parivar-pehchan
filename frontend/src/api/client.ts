const ENV_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
export const API_BASE = ENV_URL ? `${ENV_URL}/api` : '/api';

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
  
  let targetUrl: string;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    targetUrl = url;
  } else if (ENV_URL) {
    const cleanPath = url.startsWith('/api') ? url : `/api${url.startsWith('/') ? url : `/${url}`}`;
    targetUrl = `${ENV_URL}${cleanPath}`;
  } else {
    targetUrl = url.startsWith('/api') ? url : `/api${url.startsWith('/') ? url : `/${url}`}`;
  }

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
