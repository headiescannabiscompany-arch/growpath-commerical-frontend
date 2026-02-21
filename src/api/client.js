/**
 * Canonical API client wrapper (legacy compat).
 *
 * CONTRACT:
 * - apiRequest is the only network client.
 * - Keep this file for legacy imports: `import apiClient from "./client.js"`
 * - Also export named `client` + `api` for tests/legacy.
 * - No top-level await.
 */

import { apiRequest, API_URL, ApiError } from "./apiRequest";

// Legacy auth helpers (for tests / older callers)
let _authToken = null;
let _tokenGetter = null;

export { API_URL, ApiError };

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

function normalizeTokenArg(options, tokenArg) {
  if (typeof options === "string" && !tokenArg) {
    return { options: {}, token: options };
  }
  return { options: options || {}, token: tokenArg || null };
}

async function applyLegacyAuth(options = {}, tokenArg = null) {
  const opts = { ...(options || {}) };
  const headers = { ...(opts.headers || {}) };

  let token = tokenArg || null;

  if (!token && _tokenGetter) {
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

async function apiClient(path, options = {}, tokenArg = null) {
  const opts = await applyLegacyAuth(options, tokenArg);
  return apiRequest(path, opts);
}

// Legacy helper aliases
apiClient.request = (path, options = {}, tokenArg) => apiClient(path, options, tokenArg);

apiClient.get = (path, options = {}, tokenArg) => {
  const norm = normalizeTokenArg(options, tokenArg);
  return apiClient(path, { ...(norm.options || {}), method: "GET" }, norm.token);
};

apiClient.delete = (path, options = {}, tokenArg) => {
  const norm = normalizeTokenArg(options, tokenArg);
  return apiClient(path, { ...(norm.options || {}), method: "DELETE" }, norm.token);
};

apiClient.post = (path, body, options = {}, tokenArg) => {
  const norm = normalizeTokenArg(options, tokenArg);
  const opts = { ...(norm.options || {}), method: "POST" };
  if (body !== undefined) opts.body = body;
  return apiClient(path, opts, norm.token);
};

apiClient.put = (path, body, options = {}, tokenArg) => {
  const norm = normalizeTokenArg(options, tokenArg);
  const opts = { ...(norm.options || {}), method: "PUT" };
  if (body !== undefined) opts.body = body;
  return apiClient(path, opts, norm.token);
};

apiClient.patch = (path, body, options = {}, tokenArg) => {
  const norm = normalizeTokenArg(options, tokenArg);
  const opts = { ...(norm.options || {}), method: "PATCH" };
  if (body !== undefined) opts.body = body;
  return apiClient(path, opts, norm.token);
};

apiClient.postMultipart = (path, formData, options = {}, tokenArg) => {
  const norm = normalizeTokenArg(options, tokenArg);
  const opts = { ...(norm.options || {}), method: "POST", body: formData };
  const headers = { ...(opts.headers || {}) };
  if (headers["Content-Type"]) delete headers["Content-Type"];
  if (headers["content-type"]) delete headers["content-type"];
  opts.headers = headers;
  return apiClient(path, opts, norm.token);
};

// IMPORTANT: named exports for tests/legacy
export const client = apiClient;
export const api = apiClient;

export default apiClient;
export { apiRequest };
