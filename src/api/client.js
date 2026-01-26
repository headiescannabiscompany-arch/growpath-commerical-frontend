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

// Sticky module-level auth token (fallback)

let AUTH_TOKEN = null;
let TOKEN_GETTER = null;

/**
 * Set the module-level auth token (used as fallback if no explicit token or getter).
 */
export function setAuthToken(token) {
  AUTH_TOKEN = token || null;
}

/**
 * Set a function to retrieve the current token (used only if it returns a non-null value).
 * Pass null to disable the getter and use AUTH_TOKEN for tests.
 */
export function setTokenGetter(getterFn) {
  TOKEN_GETTER = typeof getterFn === "function" ? getterFn : null;
}

/**
 * Returns the best token: explicit > TOKEN_GETTER (if returns non-null) > AUTH_TOKEN.
 * TOKEN_GETTER will NOT override AUTH_TOKEN unless it returns a real token.
 */
function pickToken(explicitToken) {
  if (explicitToken) return explicitToken;
  let getterToken = null;
  try {
    getterToken = TOKEN_GETTER ? TOKEN_GETTER() : null;
  } catch (e) {
    // ignore token getter errors; fall back to AUTH_TOKEN
  }
  if (getterToken) return getterToken;
  return AUTH_TOKEN || null;
}

function getAuthHeaders(explicitToken, extra = {}) {
  const token = pickToken(explicitToken);
  return {
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

function serializeBody(data) {
  if (data === undefined || data === null) return undefined;
  if (isFormData(data) || isBlob(data)) return data;
  if (typeof data === "string") return data;
  return JSON.stringify(data);
}

// Contract-safe token override:
// - you can pass token via options.token OR as options.tokenArg (3rd param helper wrappers use)
function normalizeOptions(options = {}) {
  const { token, ...rest } = options || {};
  return { token: token || null, options: rest };
}

async function api(path, options = {}) {
  const normalized = normalizeOptions(options);
  const explicitToken = normalized.token;
  const {
    retries = 0,
    retryDelay = 1000,
    credentials = undefined,
    ...fetchOptions
  } = normalized.options;

  const controller = new AbortController();
  const requestTimeout = fetchOptions.timeout || DEFAULT_TIMEOUT;
  const timeoutId = setTimeout(() => controller.abort(), requestTimeout);

  try {
    const method = fetchOptions.method || "GET";
    const headers = getAuthHeaders(explicitToken, fetchOptions.headers || {});

    // Facility context: send X-Facility-Id if present
    const facilityId =
      fetchOptions.facilityId ||
      (typeof global !== "undefined" ? global.selectedFacilityId : null);
    if (facilityId) {
      headers["X-Facility-Id"] = facilityId;
    }

    const hasBody = "body" in fetchOptions && fetchOptions.body !== undefined;
    const bodyIsFormData = hasBody && isFormData(fetchOptions.body);
    const bodyIsBlob = hasBody && isBlob(fetchOptions.body);

    // Only set JSON content-type if NOT FormData/Blob and user didn't already set it
    if (hasBody && !bodyIsFormData && !bodyIsBlob && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    // Ensure only one /api prefix is present
    let finalUrl;
    if (API_URL.endsWith("/api") && path.startsWith("/api")) {
      finalUrl = API_URL + path.slice(4);
    } else if (API_URL.endsWith("/api/") && path.startsWith("/api/")) {
      finalUrl = API_URL + path.slice(5);
    } else if (API_URL.endsWith("/") && path.startsWith("/")) {
      finalUrl = API_URL + path.slice(1);
    } else if (!API_URL.endsWith("/") && !path.startsWith("/")) {
      finalUrl = API_URL + "/" + path;
    } else {
      finalUrl = API_URL + path;
    }

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
  setAuthToken,
  setTokenGetter
});
export { client, postMultipart, api, ApiError };
export default client;
