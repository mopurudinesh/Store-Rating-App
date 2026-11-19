const BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '/api' : 'http://localhost:4000/api');
export const API_ORIGIN = new URL(BASE, window.location.origin).origin;
export async function api(path, options = {}) {
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  let response;
  try {
    response = await fetch(`${BASE}${path}`, { ...options, credentials: 'include', headers: { ...(!isFormData ? { 'Content-Type': 'application/json' } : {}), ...options.headers } });
  } catch {
    const error = new Error('Rate Store cannot reach its server. Check that the app and database are running, then retry.');
    error.code = 'API_UNAVAILABLE';
    throw error;
  }
  const data = response.status === 204 ? {} : await response.json().catch(() => ({}));
  if (!response.ok) { const error = new Error(data.message || 'Request failed.'); error.status = response.status; error.code = data.code; throw error; }
  return data;
}
export const queryString = (params) => { const query = new URLSearchParams(); Object.entries(params).forEach(([key, value]) => { if (value !== '' && value != null) query.set(key, value); }); return query.toString(); };
