const DEFAULT_TIMEOUT = 10000;

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

const DEFAULT_API_URL = "https://your-app.onrender.com/api"; // Fallback to deployed backend

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

const isFormData = (value) =>
  typeof FormData !== "undefined" && value instanceof FormData;

const isBlob = (value) => typeof Blob !== "undefined" && value instanceof Blob;

// Sticky module-level auth token
let AUTH_TOKEN = null;
export function setAuthToken(token) {
  AUTH_TOKEN = token || null;
}

function getAuthHeaders(extra = {}, tokenOverride) {
  const tokenToUse = tokenOverride || AUTH_TOKEN;
  return {
    ...extra,
    ...(tokenToUse ? { Authorization: `Bearer ${tokenToUse}` } : {})
  };
}

function serializeBody(data) {
  if (data === undefined || data === null) return undefined;
  if (isFormData(data) || isBlob(data)) return data;
  if (typeof data === "string") return data;
  return JSON.stringify(data);
}

async function api(path, options = {}) {
  const {
    retries = 0,
    retryDelay = 1000,
    credentials = undefined,
    ...fetchOptions
  } = options;
  const controller = new AbortController();
  const requestTimeout = fetchOptions.timeout || DEFAULT_TIMEOUT;
  const timeoutId = setTimeout(() => controller.abort(), requestTimeout);

  try {
    const method = fetchOptions.method || "GET";
    const headers = getAuthHeaders(fetchOptions.headers || {}, fetchOptions.token);
    // Facility context: send X-Facility-Id if present
    const facilityId = fetchOptions.facilityId || global.selectedFacilityId;
    if (facilityId) {
      headers["X-Facility-Id"] = facilityId;
    }

    const hasBody = "body" in fetchOptions && fetchOptions.body !== undefined;
    const bodyIsFormData = hasBody && isFormData(fetchOptions.body);
    const bodyIsBlob = hasBody && isBlob(fetchOptions.body);
    if (hasBody && !bodyIsFormData && !bodyIsBlob && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    // Ensure only one /api prefix is present
    let finalUrl;
    if (API_URL.endsWith("/api") && path.startsWith("/api")) {
      finalUrl = API_URL + path.slice(4); // remove leading /api from path
    } else if (API_URL.endsWith("/api/") && path.startsWith("/api/")) {
      finalUrl = API_URL + path.slice(5); // remove leading /api/ from path
    } else if (API_URL.endsWith("/") && path.startsWith("/")) {
      finalUrl = API_URL + path.slice(1);
    } else if (!API_URL.endsWith("/") && !path.startsWith("/")) {
      finalUrl = API_URL + "/" + path;
    } else {
      finalUrl = API_URL + path;
    }
    // To send cookies or credentials, set credentials: 'include' in options
    // Example: client.get('/route', { credentials: 'include' })
    const fetchConfig = {
      ...fetchOptions,
      method,
      headers,
      signal: controller.signal
    };
    if (credentials) fetchConfig.credentials = credentials;

    const res = await fetch(finalUrl, fetchConfig);

    clearTimeout(timeoutId);

    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (e) {
      data = text;
    }

    if (!res.ok) {
      // Retry on 5xx or specific retryable errors
      if (retries > 0 && res.status >= 500) {
        console.warn(`Retrying request to ${path} (${retries} left)`);
        await new Promise((r) => setTimeout(r, retryDelay));
        return api(path, { ...options, retries: retries - 1 });
      }
      throw new ApiError(data?.message || "API Error", res.status, data);
    }

    return data;
  } catch (error) {
    clearTimeout(timeoutId);

    // Retry on timeout
    if (retries > 0 && error.name === "AbortError") {
      console.warn(`Retrying request to ${path} due to timeout (${retries} left)`);
      return api(path, { ...options, retries: retries - 1 });
    }

    if (error.name === "AbortError") {
      throw new Error("Request timeout - is the backend running?");
    }
    throw error;
  }
}

async function get(path, optionsOrToken = {}) {
  const options =
    typeof optionsOrToken === "string" ? { token: optionsOrToken } : optionsOrToken;
  return api(path, { method: "GET", ...options });
}

async function post(path, data, optionsOrToken = {}) {
  const options =
    typeof optionsOrToken === "string" ? { token: optionsOrToken } : optionsOrToken;
  const body = serializeBody(data);
  return api(path, {
    method: "POST",
    ...options,
    ...(body !== undefined ? { body } : {})
  });
}

async function put(path, data, optionsOrToken = {}) {
  const options =
    typeof optionsOrToken === "string" ? { token: optionsOrToken } : optionsOrToken;
  const body = serializeBody(data);
  return api(path, {
    method: "PUT",
    ...options,
    ...(body !== undefined ? { body } : {})
  });
}

async function patch(path, data, optionsOrToken = {}) {
  const options =
    typeof optionsOrToken === "string" ? { token: optionsOrToken } : optionsOrToken;
  const body = serializeBody(data);
  return api(path, {
    method: "PATCH",
    ...options,
    ...(body !== undefined ? { body } : {})
  });
}

async function del(path, optionsOrToken = {}) {
  const options =
    typeof optionsOrToken === "string" ? { token: optionsOrToken } : optionsOrToken;
  return api(path, { method: "DELETE", ...options });
}

async function postMultipart(path, formData, optionsOrToken = {}) {
  const options =
    typeof optionsOrToken === "string" ? { token: optionsOrToken } : optionsOrToken;
  return api(path, { method: "POST", ...options, body: formData });
}

const client = Object.assign(api, {
  get,
  post,
  put,
  patch,
  delete: del,
  postMultipart,
  setAuthToken
});
export { client, postMultipart, api, ApiError };
export default client;
