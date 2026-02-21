/**
 * Canonical API client wrapper (legacy compat).
 *
 * CONTRACT:
 * - apiRequest is the only network client.
 * - Keep this file to support older imports: `import apiClient from "./client.js"`
 * - No top-level await, no awaits outside async fns.
 */

import { apiRequest } from "./apiRequest";

function apiClient(path, options = {}, _token) {
  return apiRequest(path, options);
}

// Legacy helper aliases (covers most historical call patterns)
apiClient.request = (path, options = {}, _token) => apiRequest(path, options);

apiClient.get = (path, options = {}, _token) =>
  apiRequest(path, { ...options, method: "GET" });

apiClient.delete = (path, options = {}, _token) =>
  apiRequest(path, { ...options, method: "DELETE" });

apiClient.post = (path, body, options = {}, _token) => {
  const opts = { ...options, method: "POST" };
  if (body !== undefined) opts.body = body;
  return apiRequest(path, opts);
};

apiClient.put = (path, body, options = {}, _token) => {
  const opts = { ...options, method: "PUT" };
  if (body !== undefined) opts.body = body;
  return apiRequest(path, opts);
};

apiClient.patch = (path, body, options = {}, _token) => {
  const opts = { ...options, method: "PATCH" };
  if (body !== undefined) opts.body = body;
  return apiRequest(path, opts);
};

export default apiClient;
export { apiRequest };
