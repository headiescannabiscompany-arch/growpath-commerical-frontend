const DEFAULT_TIMEOUT = 10000;

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

const DEFAULT_API_URL = "http://localhost:5000";

function resolveApiUrl() {
  if (typeof global !== "undefined" && global.API_URL_OVERRIDE) {
    return global.API_URL_OVERRIDE;
  }
  if (typeof process !== "undefined" && process.env) {
    return (
      process.env.EXPO_PUBLIC_API_URL ||
      process.env.API_URL ||
      process.env.REACT_NATIVE_APP_API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      null
    );
  }
  return null;
}

export const API_URL = resolveApiUrl() || DEFAULT_API_URL;
// For local development, change to: http://localhost:5000
// For local network testing on device, use your computer's IP (e.g., http://192.168.1.42:5000)
// Get IP: Windows (ipconfig) or Mac (ifconfig | grep inet)

const isFormData = (value) =>
  typeof FormData !== "undefined" && value instanceof FormData;

const isBlob = (value) => typeof Blob !== "undefined" && value instanceof Blob;

function serializeBody(data) {
  if (data === undefined || data === null) return undefined;
  if (isFormData(data) || isBlob(data)) return data;
  if (typeof data === "string") return data;
  return JSON.stringify(data);
}

function hasAuthorizationHeader(headers = {}) {
  const keys = Object.keys(headers);
  return keys.some((key) => key.toLowerCase() === "authorization");
}

function normalizeOptions(optionsOrToken) {
  if (!optionsOrToken) return {};
  if (typeof optionsOrToken === "string") {
    return {
      headers: {
        Authorization: `Bearer ${optionsOrToken}`
      }
    };
  }
  return optionsOrToken;
}

async function api(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

  try {
    const token = options.authToken || global.authToken || null;
    const headers = { ...(options.headers || {}) };
    if (token && !hasAuthorizationHeader(headers)) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const hasBody = "body" in options && options.body !== undefined;
    const bodyIsFormData = hasBody && isFormData(options.body);
    const bodyIsBlob = hasBody && isBlob(options.body);
    if (hasBody && !bodyIsFormData && !bodyIsBlob && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    const res = await fetch(API_URL + path, {
      ...options,
      headers,
      signal: controller.signal
    });

    clearTimeout(timeout);

    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (e) {
      data = text;
    }

    if (!res.ok) {
      throw new ApiError(data?.message || "API Error", res.status, data);
    }

    return data;
  } catch (error) {
    clearTimeout(timeout);
    if (error.name === "AbortError") {
      throw new Error("Request timeout - is the backend running?");
    }
    throw error;
  }
}

async function get(path, optionsOrToken = {}) {
  return api(path, { ...normalizeOptions(optionsOrToken), method: "GET" });
}

async function post(path, data, optionsOrToken = {}) {
  const options = normalizeOptions(optionsOrToken);
  const body = serializeBody(data);
  return api(path, {
    ...options,
    method: "POST",
    ...(body !== undefined ? { body } : {})
  });
}

async function patch(path, data, optionsOrToken = {}) {
  const options = normalizeOptions(optionsOrToken);
  const body = serializeBody(data);
  return api(path, {
    ...options,
    method: "PATCH",
    ...(body !== undefined ? { body } : {})
  });
}

async function postMultipart(path, formData, optionsOrToken = {}) {
  return api(path, {
    ...normalizeOptions(optionsOrToken),
    method: "POST",
    body: formData
  });
}

const client = Object.assign(api, { get, post, patch, postMultipart });
export { client, postMultipart, api, ApiError };
export default client;

// Provide CommonJS exports so Node-based tests can require this module without Babel.
if (typeof module !== "undefined") {
  module.exports = { client, postMultipart, api, ApiError, API_URL };
}
