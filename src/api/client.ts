/* eslint-disable */

// Re-export JS client so TS imports and JS imports behave identically.
// Re-export JS client so TS imports and JS imports behave identically.
export * from "./client.js";
import api from "./client.js";
export default api;
/* eslint-disable */

// Single-source-of-truth: re-export the JS client so TS imports and JS imports behave the same.
// This section is redundant and can be removed.
// The previous lines already handle the exports correctly.
/* eslint-disable */

export type ApiErrorMeta = {
  status?: number | null;
  data?: any;
  code?: string;
  requestId?: string | null;
};

let TOKEN_GETTER: null | (() => any | Promise<any>) = null;
let AUTH_TOKEN: string | null = null;

export function setTokenGetter(fn: any) {
  TOKEN_GETTER = typeof fn === "function" ? fn : null;
}

export function setAuthToken(token: any) {
  AUTH_TOKEN = token ? String(token) : null;
}

export function getAuthToken() {
  return AUTH_TOKEN;
}

export class ApiError extends Error {
  status: number | null;
  data: any;
  code?: string;
  requestId: string | null;

  constructor(message: any, arg2?: number | ApiErrorMeta, arg3?: any) {
    super(String(message || "API Error"));
    this.name = "ApiError";

    if (typeof arg2 === "number") {
      this.status = arg2;
      this.data = arg3;
      this.code = (arg3 && (arg3.code || arg3.errorCode)) || undefined;
      this.requestId = (arg3 && arg3.requestId) || null;
      return;
    }

    const meta = arg2 && typeof arg2 === "object" ? (arg2 as ApiErrorMeta) : {};
    this.status = meta.status ?? null;
    this.data = meta.data;
    this.code = meta.code;
    this.requestId = meta.requestId ?? null;
  }
}

export const API_URL = (() => {
  const raw = (process.env as any)?.EXPO_PUBLIC_API_URL;
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
  "facility"
]);

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function ensureLeadingSlash(p: any) {
  const s = String(p || "");
  if (!s) return "/";
  return s.startsWith("/") ? s : `/${s}`;
}

function normalizePath(path: any) {
  const p0 = String(path || "");
  if (!p0) return "/";

  if (/^https?:\/\//i.test(p0)) return p0;

  let p = ensureLeadingSlash(p0);
  if (p.startsWith("/api/")) return p;

  const seg = p.split("?")[0].split("#")[0].split("/").filter(Boolean)[0] || "";
  if (API_ROOTS.has(seg)) return `/api${p}`;
  return p;
}

function joinUrl(base: any, path: any) {
  const b = String(base || "").replace(/\/+$/, "");
  const p = String(path || "");
  if (!b) return p;
  if (/^https?:\/\//i.test(p)) return p;
  return b + p;
}

async function parseBody(res: any) {
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

async function request(method: string, path: any, body: any, options: any = {}) {
  const maxAttempts = Number(options.retries ?? 0) + 1;
  const retryDelay = Number(options.retryDelay ?? 0);

  let lastErr: any = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      if (typeof (globalThis as any).fetch !== "function") {
        throw new ApiError("fetch is not available", {
          status: null,
          code: "FETCH_MISSING"
        });
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

      const headers: Record<string, string> = { ...(options.headers || {}) };
      if (token) headers.Authorization = `Bearer ${token}`;

      let payload = body;
      const isFormData =
        typeof (globalThis as any).FormData !== "undefined" &&
        payload instanceof (globalThis as any).FormData;

      if (
        payload &&
        !isFormData &&
        typeof payload === "object" &&
        !(payload instanceof ArrayBuffer)
      ) {
        headers["Content-Type"] = headers["Content-Type"] || "application/json";
        payload = JSON.stringify(payload);
      }

      const norm = normalizePath(path);
      const url = joinUrl(API_URL, norm);

      const init: any = {
        method,
        headers,
        body: method === "GET" || method === "HEAD" ? undefined : payload
      };

      const res = await (globalThis as any).fetch(url, init);
      if (!res || typeof res.ok !== "boolean") {
        throw new ApiError("No response from fetch", {
          status: null,
          code: "FETCH_NO_RESPONSE"
        });
      }

      const requestId =
        res?.headers?.get?.("x-request-id") ||
        res?.headers?.get?.("x-amzn-requestid") ||
        null;

      const data = await parseBody(res);

      if (!res.ok) {
        const msg =
          (data && (data.message || data.error || data.title)) ||
          `Request failed with status ${res.status}`;

        const code = (data && (data.code || data.errorCode)) || undefined;

        const err = new ApiError(String(msg), {
          status: res.status,
          data,
          code,
          requestId
        });

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

function normalizeTokenOpts(tokenOrOpts: any, maybeOpts: any) {
  if (tokenOrOpts && typeof tokenOrOpts === "object" && !Array.isArray(tokenOrOpts)) {
    return { token: null, opts: tokenOrOpts };
  }
  return { token: tokenOrOpts || null, opts: maybeOpts || {} };
}

function normalizeBodyTokenOpts(tokenOrOpts: any, maybeOpts: any) {
  if (tokenOrOpts && typeof tokenOrOpts === "object" && !Array.isArray(tokenOrOpts)) {
    return { token: null, opts: tokenOrOpts };
  }
  return { token: tokenOrOpts || null, opts: maybeOpts || {} };
}

export const api: any = async (path: any, opts: any = {}) => {
  const method = String(opts.method || "GET").toUpperCase();
  return request(method, path, opts.body, opts);
};

api.get = (path: any, tokenOrOpts?: any, maybeOpts?: any) => {
  const { token, opts } = normalizeTokenOpts(tokenOrOpts, maybeOpts);
  return request("GET", path, undefined, { ...opts, token });
};

api.post = (path: any, body: any, tokenOrOpts?: any, maybeOpts?: any) => {
  const { token, opts } = normalizeBodyTokenOpts(tokenOrOpts, maybeOpts);
  return request("POST", path, body, { ...opts, token });
};

api.put = (path: any, body: any, tokenOrOpts?: any, maybeOpts?: any) => {
  const { token, opts } = normalizeBodyTokenOpts(tokenOrOpts, maybeOpts);
  return request("PUT", path, body, { ...opts, token });
};

api.del = (path: any, tokenOrOpts?: any, maybeOpts?: any) => {
  const { token, opts } = normalizeTokenOpts(tokenOrOpts, maybeOpts);
  return request("DELETE", path, undefined, { ...opts, token });
};

api.postMultipart = (path: any, formData: any, tokenOrOpts?: any, maybeOpts?: any) => {
  const { token, opts } = normalizeBodyTokenOpts(tokenOrOpts, maybeOpts);
  return request("POST", path, formData, { ...opts, token });
};

export const client = api;
export const get = api.get;
export const post = api.post;
export const put = api.put;
export const del = api.del;
export const postMultipart = api.postMultipart;

export default api;
