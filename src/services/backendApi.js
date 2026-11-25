/**
 * Backend API Client — Connects frontend to the RIMT Backend API server.
 * Falls back to the Admin Portal URL when the backend is unavailable.
 *
 * Usage:
 *   import { backendApi } from './backendApi';
 *   const data = await backendApi.get('/placement-stats/summary');
 *   const result = await backendApi.post('/auth/signin', { rollNo: '26BCA035' });
 */

const BACKEND_URL = (
  process.env.EXPO_PUBLIC_BACKEND_API_URL ||
  process.env.EXPO_PUBLIC_ADMIN_PORTAL_URL ||
  'http://localhost:3001'
).replace(/\/+$/, '');

const DEFAULT_TIMEOUT = 15000; // 15 seconds

/**
 * Internal fetch wrapper with timeout, error handling, and JSON parsing.
 */
async function request(method, path, body = null, options = {}) {
  const url = `${BACKEND_URL}/api${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  // Add auth token if available
  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeout || DEFAULT_TIMEOUT);

  try {
    const fetchOptions = {
      method,
      headers,
      signal: controller.signal,
    };

    if (body && method !== 'GET') {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        success: false,
        status: response.status,
        error: data.error || data.message || `Request failed with status ${response.status}`,
        ...data,
      };
    }

    return { success: true, status: response.status, ...data };
  } catch (err) {
    if (err.name === 'AbortError') {
      return { success: false, error: 'Request timed out. Please check your connection.' };
    }
    return { success: false, error: err.message || 'Network error' };
  } finally {
    clearTimeout(timeout);
  }
}

export const backendApi = {
  /** GET request */
  get: (path, options = {}) => request('GET', path, null, options),

  /** POST request */
  post: (path, body = {}, options = {}) => request('POST', path, body, options),

  /** PATCH request */
  patch: (path, body = {}, options = {}) => request('PATCH', path, body, options),

  /** DELETE request */
  delete: (path, options = {}) => request('DELETE', path, null, options),

  /** Base URL for reference */
  baseUrl: BACKEND_URL,
};

export default backendApi;
