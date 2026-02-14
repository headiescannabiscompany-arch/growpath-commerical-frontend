import { config } from "../config/config";
import { mockRequest } from "./mockServer";
import { parseFetchError } from "@/utils/parseApiError";

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
  responseType?: "auto" | "json" | "text" | "blob" | "arrayBuffer";
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
    throw {
      code: "PARSE_ERROR",
      message: "Invalid server response.",
      status: res.status,
      details: { raw: text.slice(0, 1000) }
    };
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
      let res: Response;
      try {
        res = await fetch(url, {
          method,
          headers,
          body,
          signal: mergedSignal,
          credentials: "include"
        });
      } catch (e) {
        // Network/offline error
        return {
          ok: false,
          status: null,
          code: "NETWORK_ERROR",
          message: "Network request failed",
          requestId: null,
          raw: e
        };
      }

      clearTimeout(timeoutId);

      const requestId = (() => {
        try {
          return res.headers.get("x-request-id");
        } catch {
          return null;
        }
      })();

      // Handle no-content
      if (res.status === 204) {
        return { ok: true, status: res.status, data: undefined, requestId };
      }

      // If error: let parseFetchError read the body (do NOT pre-consume with res.json()).
      if (!res.ok) {
        const parsed = await parseFetchError(res);

        // Global unauthorized handling (opt-out supported)
        if (
          parsed?.status === 401 &&
          options.invalidateOn401 !== false &&
          onUnauthorized
        ) {
          try {
            await onUnauthorized();
          } catch {
            // swallow: unauthorized handler should never crash request path
          }
        }

        return {
          ok: false,
          status: parsed.status ?? res.status,
          code: parsed.code ?? "UNKNOWN_ERROR",
          message: parsed.message ?? "Something went wrong",
          requestId: parsed.requestId ?? requestId,
          raw: parsed.raw ?? res
        };
      }

      // OK: parse according to responseType
      const rt = options.responseType || "auto";

      if (rt === "blob") {
        const blob = await res.blob();
        return { ok: true, status: res.status, data: blob, requestId };
      }

      if (rt === "arrayBuffer") {
        const buf = await res.arrayBuffer();
        return { ok: true, status: res.status, data: buf, requestId };
      }

      if (rt === "text") {
        const text = await res.text();
        return { ok: true, status: res.status, data: text, requestId };
      }

      // json OR auto
      const text = await res.text();
      if (!text) return { ok: true, status: res.status, data: null, requestId };

      if (rt === "json") {
        try {
          return { ok: true, status: res.status, data: JSON.parse(text), requestId };
        } catch {
          return {
            ok: false,
            status: res.status,
            code: "PARSE_ERROR",
            message: "Invalid JSON server response.",
            requestId,
            raw: { raw: text.slice(0, 1000) }
          };
        }
      }

      // auto: try json, else return text
      try {
        return { ok: true, status: res.status, data: JSON.parse(text), requestId };
      } catch {
        return { ok: true, status: res.status, data: text, requestId };
      }
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
    // Defensive: fallback error shape
    return {
      ok: false,
      status: null,
      code: "CLIENT_ERROR",
      message: e?.message || "Client error",
      requestId: null,
      raw: e
    };
  }
}

// --- Phase 2.2: Callable client adapter (supports legacy + modern call patterns) ---

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type ApiCallOptions = RequestOptions & {
  method?: HttpMethod | string;
  body?: any;
};

type ClientCallable = {
  // Pattern A: api<T>(url) => GET
  <T = any>(path: string): Promise<T>;

  // Pattern A: api<T>(url, { method, body, ...opts })
  <T = any>(path: string, options: ApiCallOptions): Promise<T>;

  // Pattern B: client(method, url, body, options) legacy 4-arg
  <T = any>(
    method: HttpMethod | string,
    path: string,
    body?: any,
    options?: RequestOptions
  ): Promise<T>;

  // Pattern C: object methods
  get<T = any>(path: string, options?: RequestOptions): Promise<T>;
  // Phase 2.3.2: Compatibility overload for api.get(url, facilityId, options) legacy misuse
  get<T = any>(
    path: string,
    facilityId: string | null,
    options?: RequestOptions
  ): Promise<T>;
  delete<T = any>(path: string, options?: RequestOptions): Promise<T>;
  // Phase 2.3.2: Compatibility overload for api.delete(url, facilityId, options) legacy misuse
  delete<T = any>(
    path: string,
    facilityId: string | null,
    options?: RequestOptions
  ): Promise<T>;
  del<T = any>(path: string, options?: RequestOptions): Promise<T>; // alias for delete
  del<T = any>(
    path: string,
    facilityId: string | null,
    options?: RequestOptions
  ): Promise<T>; // alias with compat overload
  // Phase 2.3.7: Overload for api.post(path) with empty body (e.g., auth actions)
  post<T = any>(path: string): Promise<T>;
  post<T = any>(path: string, data: any, options?: RequestOptions): Promise<T>;
  // Phase 2.3.2: Compatibility overload for api.post(url, data, facilityId, options) legacy misuse
  post<T = any>(
    path: string,
    data: any,
    facilityId: string | null,
    options?: RequestOptions
  ): Promise<T>;
  put<T = any>(path: string, data: any, options?: RequestOptions): Promise<T>;
  // Phase 2.3.2: Compatibility overload for api.put(url, data, facilityId, options) legacy misuse
  put<T = any>(
    path: string,
    data: any,
    facilityId: string | null,
    options?: RequestOptions
  ): Promise<T>;
  patch<T = any>(path: string, data: any, options?: RequestOptions): Promise<T>;
  // Phase 2.3.2: Compatibility overload for api.patch(url, data, facilityId, options) legacy misuse
  patch<T = any>(
    path: string,
    data: any,
    facilityId: string | null,
    options?: RequestOptions
  ): Promise<T>;
  postMultipart<T = any>(
    path: string,
    formData: FormData,
    options?: RequestOptions
  ): Promise<T>;

  // keep existing helper
  setAuthToken: typeof setAuthToken;
};

function normalizeMethod(m?: string): HttpMethod {
  const up = (m || "GET").toUpperCase();
  if (up === "GET" || up === "POST" || up === "PUT" || up === "PATCH" || up === "DELETE")
    return up;
  // if someone passes weird method, treat as GET default to avoid blowing up types
  return "GET";
}

function makeClient(): ClientCallable {
  const fn = (async (...args: any[]) => {
    // Supports:
    // 1) (path)
    // 2) (path, options)
    // 3) (method, path, body, options)

    // Case 3: legacy signature: (method, path, body, options)
    if (
      typeof args[0] === "string" &&
      typeof args[1] === "string" &&
      /^[A-Za-z]+$/.test(args[0])
    ) {
      const method = normalizeMethod(args[0]);
      const path = args[1];
      const body = args.length >= 3 ? args[2] : undefined;
      const options: RequestOptions = args.length >= 4 ? args[3] || {} : {};
      return request(path, { ...options, method, body });
    }

    // Case 1/2: (path) or (path, options)
    const path: string = args[0];
    const options: ApiCallOptions = (args[1] || {}) as ApiCallOptions;
    const method = normalizeMethod(options.method);
    const body = (options as any).body;

    // Remove method/body from options before passing down, since request() already takes method/body explicitly
    const { method: _m, body: _b, ...rest } = options as any;

    return request(path, { ...(rest as RequestOptions), method, body });
  }) as unknown as ClientCallable;

  // Pattern C methods
  // Phase 2.3.2: Handle both get(path, options) and get(path, facilityId, options)
  fn.get = (path: string, a?: any, b?: any) => {
    // Supports:
    // get(path, options)
    // get(path, facilityId, options)  <-- ignore facilityId, use options
    const options: RequestOptions =
      typeof a === "string" || a == null ? b || {} : a || {};
    return request(path, { ...options, method: "GET" });
  };
  fn.delete = (path: string, a?: any, b?: any) => {
    const options: RequestOptions =
      typeof a === "string" || a == null ? b || {} : a || {};
    return request(path, { ...options, method: "DELETE" });
  };
  fn.del = fn.delete; // alias
  // Phase 2.3.2: Handle both post(path, data, options) and post(path, data, facilityId, options)
  fn.post = (path: string, data?: any, a?: any, b?: any) => {
    const options: RequestOptions =
      typeof a === "string" || a == null ? b || {} : a || {};
    return request(path, { ...options, method: "POST", body: data });
  };
  fn.put = (path: string, data: any, a?: any, b?: any) => {
    const options: RequestOptions =
      typeof a === "string" || a == null ? b || {} : a || {};
    return request(path, { ...options, method: "PUT", body: data });
  };
  fn.patch = (path: string, data: any, a?: any, b?: any) => {
    const options: RequestOptions =
      typeof a === "string" || a == null ? b || {} : a || {};
    return request(path, { ...options, method: "PATCH", body: data });
  };
  fn.postMultipart = (path, formData, options = {}) =>
    request(path, { ...options, method: "POST", body: formData });

  // Keep existing helper
  fn.setAuthToken = setAuthToken;

  return fn;
}

// Export shape (unchanged for consumers)
export const client = makeClient();
export const api = client;
export const apiRequest = client;
export default client;
