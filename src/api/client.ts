import { config } from "../config/config";
import { normalizeApiError, type ApiError } from "./errors";
import { mockRequest } from "./mockServer";

let authToken: string | null = null;
let onUnauthorized: null | (() => void | Promise<void>) = null;

// Single-flight deduplication map for idempotent GET requests
const inflight = new Map<string, Promise<any>>();

function inflightKey(method: string, url: string) {
  return `${method.toUpperCase()} ${url}`;
}

export function setAuthToken(token: string | null) {
  authToken = token || null;
}

export function setOnUnauthorized(fn: null | (() => void | Promise<void>)) {
  onUnauthorized = fn;
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: any;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  timeout?: number;
  auth?: boolean; // default true; set to false to skip Authorization header
  silent?: boolean; // default false; set to true to suppress console.error on failure
  invalidateOn401?: boolean; // default true; set to false to opt out of global logout on 401
};

const DEFAULT_TIMEOUT = 10000;

const isMockEnabled =
  typeof process !== "undefined" && process.env?.EXPO_PUBLIC_API_MOCK === "1";

function isFormData(value: any) {
  return typeof FormData !== "undefined" && value instanceof FormData;
}

function isBlob(value: any) {
  return typeof Blob !== "undefined" && value instanceof Blob;
}

async function safeJson(res: Response) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    const err: ApiError = {
      code: "PARSE_ERROR",
      message: "Invalid server response.",
      status: res.status,
      details: { raw: text.slice(0, 1000) }
    };
    throw err;
  }
}

async function request(path: string, options: RequestOptions = {}) {
  const method = options.method || "GET";
  const headers: Record<string, string> = { ...(options.headers || {}) };

  // CONTRACT: facility context is only in the URL path (/api/facility/:facilityId/...)
  // Do not inject X-Facility-Id headers.
  const useAuth = options.auth !== false;
  if (useAuth && authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  if (isMockEnabled) {
    return await mockRequest(path, method, options, headers, authToken);
  }

  // Debug: log if auth header is present
  if (path.includes("/api/me") || path.includes("/api/facilities")) {
    console.log(
      "[API] Request to",
      path,
      "- Authorization header present:",
      !!headers["Authorization"]
    );
  }

  const hasBody = "body" in options && options.body !== undefined;
  const bodyIsFD = hasBody && isFormData(options.body);
  const bodyIsBlob = hasBody && isBlob(options.body);

  if (hasBody && !bodyIsFD && !bodyIsBlob && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const timeout = options.timeout ?? DEFAULT_TIMEOUT;
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), timeout);

  // Merge timeout signal + caller signal so either can cancel fetch
  const mergedSignal: AbortSignal = (() => {
    const callerSignal = options.signal;

    if (!callerSignal) return timeoutController.signal;

    // Prefer native AbortSignal.any if available
    const anyFn = (AbortSignal as any)?.any;
    if (typeof anyFn === "function") {
      return anyFn([callerSignal, timeoutController.signal]);
    }

    // Fallback merge (older runtimes)
    const merged = new AbortController();
    const onAbort = () => merged.abort();

    if (callerSignal.aborted || timeoutController.signal.aborted) {
      merged.abort();
      return merged.signal;
    }

    callerSignal.addEventListener("abort", onAbort, { once: true });
    timeoutController.signal.addEventListener("abort", onAbort, { once: true });

    return merged.signal;
  })();

  try {
    const url = path.startsWith("http")
      ? path
      : `${config.apiBaseUrl}${path.startsWith("/") ? "" : "/"}${path}`;

    const body =
      hasBody && !bodyIsFD && !bodyIsBlob && typeof options.body !== "string"
        ? JSON.stringify(options.body)
        : hasBody
          ? options.body
          : undefined;

    const key = inflightKey(method, url);

    // ✅ Dedupe ONLY safe idempotent reads (GET) — including /api/me
    const shouldDedupe =
      method === "GET" && (path === "/api/me" || path.startsWith("/api/me?"));

    if (shouldDedupe) {
      const existing = inflight.get(key);
      if (existing) return await existing;
    }

    const p = (async () => {
      const res = await fetch(url, {
        method,
        headers,
        body,
        signal: mergedSignal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const data = await safeJson(res).catch(() => null);
        throw normalizeApiError(data ?? { status: res.status }, { path });
      }

      return await safeJson(res);
    })();

    if (shouldDedupe) inflight.set(key, p);

    try {
      const out = await p;
      return out;
    } finally {
      if (shouldDedupe) inflight.delete(key);
    }
  } catch (e: any) {
    clearTimeout(timeoutId);

    if (e?.name === "AbortError") {
      throw normalizeApiError(
        { message: "Request timeout - is the backend running?" },
        { path }
      );
    }

    // Ensure *everything* thrown from client is normalized with path context
    const normalized = normalizeApiError(e, { path });

    // Global 401 invalidation: opt-in per-call to prevent auth thrash on /api/me
    const invalidateOn401 = options.invalidateOn401 !== false;
    if (
      invalidateOn401 &&
      normalized?.status === 401 &&
      normalized?.code === "UNAUTHORIZED"
    ) {
      try {
        void onUnauthorized?.();
      } catch {
        // swallow errors from logout handler
      }
    }

    if (!options.silent) {
      console.error("[API] Request error:", {
        url: path,
        method,
        error: e,
        message: normalized?.message,
        code: normalized?.code,
        status: normalized?.status
      });
    }

    throw normalized;
  }
}

export const client = {
  get: (path: string, options: RequestOptions = {}) =>
    request(path, { ...options, method: "GET" }),

  delete: (path: string, options: RequestOptions = {}) =>
    request(path, { ...options, method: "DELETE" }),

  post: (path: string, data: any, options: RequestOptions = {}) =>
    request(path, { ...options, method: "POST", body: data }),

  put: (path: string, data: any, options: RequestOptions = {}) =>
    request(path, { ...options, method: "PUT", body: data }),

  patch: (path: string, data: any, options: RequestOptions = {}) =>
    request(path, { ...options, method: "PATCH", body: data }),

  postMultipart: (path: string, formData: FormData, options: RequestOptions = {}) =>
    request(path, { ...options, method: "POST", body: formData }),

  setAuthToken
};

export const api = client;
export default client;
