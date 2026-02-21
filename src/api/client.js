/**
 * Canonical API client wrapper (legacy compat).
 *
 * CONTRACT:
 * - apiRequest is the only network client.
 * - Keep this file for legacy imports: `import apiClient from "./client.js"`
 * - ALSO export named `client` + `api` for tests/legacy.
 * - No top-level await.
 */

import { apiRequest } from "./apiRequest";

// Lightweight auth helpers for legacy/tests
let _authToken = null;
let _tokenGetter = null;

export function setAuthToken(token) {
  _authToken = token ? String(token) : null;
}

export function clearAuthToken() {
  _authToken = null;
}

export function getAuthToken() {
  return _authToken;
}

export function setTokenGetter(fn) {
  _tokenGetter = typeof fn === "function" ? fn : null;
}

async function applyLegacyAuth(options = {}) {
  const opts = { ...(options || {}) };
  const headers = { ...(opts.headers || {}) };

  // Prefer tokenGetter, fallback to setAuthToken()
  let token = null;
  if (_tokenGetter) {
    try {
      token = await Promise.resolve(_tokenGetter());
    } catch (_e) {
      token = null;
    }
  }
  if (!token) token = _authToken;

  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  opts.headers = headers;
  return opts;
}

async function apiClient(path, options = {}, _tokenIgnored) {
  const opts = await applyLegacyAuth(options);
  return apiRequest(path, opts);
}

// Legacy helper aliases
apiClient.request = (path, options = {}, _token) => apiClient(path, options, _token);

apiClient.get = (path, options = {}, _token) =>
  apiClient(path, { ...(options || {}), method: "GET" }, _token);

apiClient.delete = (path, options = {}, _token) =>
  apiClient(path, { ...(options || {}), method: "DELETE" }, _token);

apiClient.post = (path, body, options = {}, _token) => {
  const opts = { ...(options || {}), method: "POST" };
  if (body !== undefined) opts.body = body;
  return apiClient(path, opts, _token);
};

apiClient.put = (path, body, options = {}, _token) => {
  const opts = { ...(options || {}), method: "PUT" };
  if (body !== undefined) opts.body = body;
  return apiClient(path, opts, _token);
};

apiClient.patch = (path, body, options = {}, _token) => {
  const opts = { ...(options || {}), method: "PATCH" };
  if (body !== undefined) opts.body = body;
  return apiClient(path, opts, _token);
};

apiClient.postMultipart = (path, formData, options = {}, _token) => {
  const opts = { ...(options || {}), method: "POST", body: formData };
  return apiClient(path, opts, _token);
};

// IMPORTANT: named exports for tests/legacy
export const client = apiClient;
export const api = apiClient;

export default apiClient;
export { apiRequest };
