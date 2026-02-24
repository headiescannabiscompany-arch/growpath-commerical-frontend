/**
 * Canonical API client wrapper (legacy compat).
 *
 * CONTRACT:
 * - apiRequest is the only network client.
 * - Keep this file for legacy imports: `import apiClient from "./client.js"`
 * - Also export named `client` + `api` for tests/legacy.
 * - No top-level await.
 */

import { apiRequest, API_URL, ApiError, setOnUnauthorized } from "./apiRequest";

// Legacy auth helpers (for tests / older callers)
let _authToken = null;
let _tokenGetter = null;

export { API_URL, ApiError, setOnUnauthorized };

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
  const legacyOpts = { ...(options || {}) };
  const legacyHeaders = { ...(legacyOpts.headers || {}) };

  let token = tokenArg || null;

  if (!token && _tokenGetter) {
    try {
      token = await Promise.resolve(_tokenGetter());
    } catch (_e) {
      token = null;
    }
  }
  if (!token) token = _authToken;

  if (token && !legacyHeaders.Authorization) {
    legacyHeaders.Authorization = `Bearer ${token}`;
  }

  legacyOpts.headers = legacyHeaders;
  return legacyOpts;
}

async function apiClient(path, options = {}, tokenArg = null) {
  const opts = await applyLegacyAuth(options, tokenArg);
  return apiRequest(path, opts);
}

// Legacy helper aliases
apiClient.request = (path, options = {}, tokenArg) => apiClient(path, options, tokenArg);

apiClient.get = (path, options = {}, tokenArg) => {
  const normGet = normalizeTokenArg(options, tokenArg);
  return apiClient(path, { ...(normGet.options || {}), method: "GET" }, normGet.token);
};

apiClient.delete = (path, options = {}, tokenArg) => {
  const normDelete = normalizeTokenArg(options, tokenArg);
  return apiClient(
    path,
    { ...(normDelete.options || {}), method: "DELETE" },
    normDelete.token
  );
};

apiClient.post = (path, body, options = {}, tokenArg) => {
  const normPost = normalizeTokenArg(options, tokenArg);
  const postOpts = { ...(normPost.options || {}), method: "POST" };
  if (body !== undefined) postOpts.body = body;
  return apiClient(path, postOpts, normPost.token);
};

apiClient.put = (path, body, options = {}, tokenArg) => {
  const normPut = normalizeTokenArg(options, tokenArg);
  const putOpts = { ...(normPut.options || {}), method: "PUT" };
  if (body !== undefined) putOpts.body = body;
  return apiClient(path, putOpts, normPut.token);
};

apiClient.patch = (path, body, options = {}, tokenArg) => {
  const normPatch = normalizeTokenArg(options, tokenArg);
  const patchOpts = { ...(normPatch.options || {}), method: "PATCH" };
  if (body !== undefined) patchOpts.body = body;
  return apiClient(path, patchOpts, normPatch.token);
};

apiClient.postMultipart = (path, formData, options = {}, tokenArg) => {
  const normMultipart = normalizeTokenArg(options, tokenArg);
  const multipartOpts = {
    ...(normMultipart.options || {}),
    method: "POST",
    body: formData
  };
  const multipartHeaders = { ...(multipartOpts.headers || {}) };
  if (multipartHeaders["Content-Type"]) delete multipartHeaders["Content-Type"];
  if (multipartHeaders["content-type"]) delete multipartHeaders["content-type"];
  multipartOpts.headers = multipartHeaders;
  return apiClient(path, multipartOpts, normMultipart.token);
};

// IMPORTANT: named exports for tests/legacy
export const client = apiClient;
export const api = apiClient;

export default apiClient;
export { apiRequest };
