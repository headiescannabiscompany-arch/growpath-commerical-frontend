/* eslint-disable */

// Token sources (priority):
// 1) explicit options.token
// 2) TOKEN_GETTER()
// 3) AUTH_TOKEN (setAuthToken)
let TOKEN_GETTER = null;
let AUTH_TOKEN = null;

export function setTokenGetter(fn) {
  TOKEN_GETTER = typeof fn === "function" ? fn : null;
}

export function setAuthToken(token) {
  AUTH_TOKEN = token ? String(token) : null;
}

export function getAuthToken() {
  return AUTH_TOKEN;
}

export class ApiError extends Error {
  constructor(message, arg2, arg3) {
    super(String(message || "API Error"));
    this.name = "ApiError";
    if (typeof arg2 === "number") {
      this.status = arg2;
      this.data = arg3;
      this.code = (arg3 && (arg3.code || arg3.errorCode)) || undefined;
      this.requestId = (arg3 && arg3.requestId) || null;
      return;
    }
    const meta = arg2 && typeof arg2 === "object" ? arg2 : {};
    this.status = meta.status ?? null;
    this.data = meta.data;
    this.code = meta.code;
    this.requestId = meta.requestId ?? null;
  }
}

export const API_URL = (() => {
  const raw = process.env.EXPO_PUBLIC_API_URL;
  const cleaned = (raw && String(raw).replace(/\/+$/, "")) || "";
  return cleaned || "http://localhost";
})();

const API_ROOTS = new Set([
  "tasks",
  "grows",
  "logs",
  "growlogs",
  "posts",
  "forum",
  "user",
  "users",
  "courses",
  "diagnose",
  "guilds",
  "live",
  "facility",
  "auth"
]);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function ensureLeadingSlash(p) {
  const s = String(p || "");
  if (!s) return "/";
  return s.startsWith("/") ? s : `/${s}`;
}

function normalizePath(path) {
  const p0 = String(path || "");
  if (!p0) return "/";
  if (/^https?:\/\//i.test(p0)) return p0;
  const p = ensureLeadingSlash(p0);
  if (p.startsWith("/api/")) return p;
  const seg = p.split("?")[0].split("#")[0].split("/").filter(Boolean)[0] || "";
  if (API_ROOTS.has(seg)) return `/api${p}`;
  return p;
}

function joinUrl(base, path) {
  const b = String(base || "").replace(/\/+$/, "");
  const p = String(path || "");
  if (!b) return p;
  if (/^https?:\/\//i.test(p)) return p;
  return b + p;
}

async function parseBody(res) {
  const ct = res?.headers?.get ? res.headers.get("content-type") : "";
  const text = await (res?.text ? res.text() : Promise.resolve(""));
  if (!text) return null;

  const looksJson = (ct && ct.includes("application/json")) || /^[\s]*[\{\[]/.test(text);
  if (!looksJson) return text;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function request(method, path, body, options = {}) {
  const maxAttempts = Number(options.retries ?? 0) + 1;
  const retryDelay = Number(options.retryDelay ?? 0);

  let lastErr = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      if (typeof fetch !== "function") {
        throw new ApiError("fetch is not available", { status: null, code: "FETCH_MISSING" });
      }

      let token = options.token ?? null;
      if (!token && TOKEN_GETTER) {
        try {
          token = await TOKEN_GETTER();
        } catch {
          token = null;
        }
      }
      if (!token) token = AUTH_TOKEN;

      const headers = { ...(options.headers || {}) };
      if (token) headers.Authorization = `Bearer ${token}`;

      let payload = body;
      const isFormData = typeof FormData !== "undefined" && payload instanceof FormData;

      if (payload && !isFormData && typeof payload === "object" && !(payload instanceof ArrayBuffer)) {
        headers["Content-Type"] = headers["Content-Type"] || "application/json";
        payload = JSON.stringify(payload);
      }

      const norm = normalizePath(path);
      const url = joinUrl(API_URL, norm);

      const init = {
        method,
        headers,
        body: method === "GET" || method === "HEAD" ? undefined : payload
      };

      const res = await fetch(url, init);

      // Support Jest-style mock responders: { status?, json }
      if (res && typeof res.ok !== "boolean" && Object.prototype.hasOwnProperty.call(res, "json")) {
        const status = typeof res.status === "number" ? res.status : 200;
        const data = typeof res.json === "function" ? await res.json() : res.json;

        if (status >= 200 && status < 300) return data;

        const msg =
          (data && (data.message || data.error || data.title)) ||
          `Request failed with status ${status}`;
        const code = (data && (data.code || data.errorCode)) || undefined;
        throw new ApiError(String(msg), { status, data, code, requestId: null });
      }

      if (!res || typeof res.ok !== "boolean") {
        throw new ApiError("No response from fetch", { status: null, code: "FETCH_NO_RESPONSE" });
      }

      const requestId =
        (res?.headers?.get?.("x-request-id") || res?.headers?.get?.("x-amzn-requestid")) || null;

      const data = await parseBody(res);

      if (!res.ok) {
        const msg =
          (data && (data.message || data.error || data.title)) ||
          `Request failed with status ${res.status}`;

        const code = (data && (data.code || data.errorCode)) || undefined;

        const err = new ApiError(String(msg), { status: res.status, data, code, requestId });

        if (res.status >= 500 && res.status <= 599 && attempt < maxAttempts) {
          lastErr = err;
          if (retryDelay) await sleep(retryDelay);
          continue;
        }

        throw err;
      }

      return data;
    } catch (e) {
      if (attempt < maxAttempts) {
        lastErr = e;
        if (retryDelay) await sleep(retryDelay);
        continue;
      }
      throw e;
    }
  }

  throw lastErr || new ApiError("Unknown error", { status: null });
}

function normalizeTokenOpts(tokenOrOpts, maybeOpts) {
  if (tokenOrOpts && typeof tokenOrOpts === "object" && !Array.isArray(tokenOrOpts)) {
    return { token: null, opts: tokenOrOpts };
  }
  return { token: tokenOrOpts || null, opts: maybeOpts || {} };
}

function normalizeBodyTokenOpts(tokenOrOpts, maybeOpts) {
  if (tokenOrOpts && typeof tokenOrOpts === "object" && !Array.isArray(tokenOrOpts)) {
    return { token: null, opts: tokenOrOpts };
  }
  return { token: tokenOrOpts || null, opts: maybeOpts || {} };
}

export const api = async (path, opts = {}) => {
  const method = String(opts.method || "GET").toUpperCase();
  return request(method, path, opts.body, opts);
};

api.get = (path, tokenOrOpts, maybeOpts) => {
  const { token, opts } = normalizeTokenOpts(tokenOrOpts, maybeOpts);
  return request("GET", path, undefined, { ...opts, token });
};

api.post = (path, body, tokenOrOpts, maybeOpts) => {
  const { token, opts } = normalizeBodyTokenOpts(tokenOrOpts, maybeOpts);
  return request("POST", path, body, { ...opts, token });
};

api.put = (path, body, tokenOrOpts, maybeOpts) => {
  const { token, opts } = normalizeBodyTokenOpts(tokenOrOpts, maybeOpts);
  return request("PUT", path, body, { ...opts, token });
};

api.del = (path, tokenOrOpts, maybeOpts) => {
  const { token, opts } = normalizeTokenOpts(tokenOrOpts, maybeOpts);
  return request("DELETE", path, undefined, { ...opts, token });
};

api.postMultipart = (path, formData, tokenOrOpts, maybeOpts) => {
  const { token, opts } = normalizeBodyTokenOpts(tokenOrOpts, maybeOpts);
  return request("POST", path, formData, { ...opts, token });
};

// compatibility exports (top-level exports only)
export const client = api;
export const get = api.get;
export const post = api.post;
export const put = api.put;
export const del = api.del;
export const postMultipart = api.postMultipart;

export default api;
