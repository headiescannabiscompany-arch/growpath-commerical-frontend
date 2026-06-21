import { getToken } from "../auth/tokenStore";

export type ApiRequestOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  data?: any;
  params?: Record<string, any>;
  responseType?: "auto" | "json" | "text" | "blob" | "arrayBuffer";
  signal?: AbortSignal;
  timeoutMs?: number;
  timeout?: number;
  auth?: boolean; // default true
  silent?: boolean;
  invalidateOn401?: boolean;
  retries?: number;
  retryDelay?: number;
};

const configuredApiUrl =
  (globalThis as any).API_URL_OVERRIDE || process.env.EXPO_PUBLIC_API_URL;

// Local development has a deterministic default. Production must provide an
// explicit URL so a release cannot silently target a development service.
export const API_URL = String(
  configuredApiUrl ||
    (process.env.NODE_ENV !== "production" ? "http://localhost:5002" : "")
).replace(/\/$/, "");

export class ApiError extends Error {
  code: string;
  status: number | null;
  data: any;
  requestId: string | null;

  constructor(
    code: string,
    status: number | null,
    data: any = null,
    requestId: string | null = null
  ) {
    super(code);
    this.name = "ApiError";
    this.code = code;
    this.status = status ?? null;
    this.data = data ?? null;
    this.requestId = requestId;
  }
}

export type ApiTransportEvent =
  | { type: "error"; error: ApiError }
  | { type: "recovered" };

const transportListeners = new Set<(event: ApiTransportEvent) => void>();

export function subscribeToApiTransport(listener: (event: ApiTransportEvent) => void) {
  transportListeners.add(listener);
  return () => {
    transportListeners.delete(listener);
  };
}

function emitTransportEvent(event: ApiTransportEvent) {
  for (const listener of transportListeners) {
    try {
      listener(event);
    } catch {
      // Transport behavior must not depend on observers.
    }
  }
}

type UnauthorizedHandler = (() => void | Promise<void>) | null;
let unauthorizedHandler: UnauthorizedHandler = null;

export function setOnUnauthorized(handler: UnauthorizedHandler) {
  unauthorizedHandler = typeof handler === "function" ? handler : null;
}

export function getOnUnauthorized() {
  return unauthorizedHandler;
}

function toAbsoluteUrl(path: string) {
  if (path && (path.startsWith("http://") || path.startsWith("https://"))) return path;
  if (!API_URL) {
    throw new ApiError("API_URL_NOT_CONFIGURED", null, {
      message: "EXPO_PUBLIC_API_URL is required in production."
    });
  }
  if (!path) return API_URL;
  const base = API_URL;
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${base}${suffix}`;
}

function appendParams(url: string, params: Record<string, any> | undefined) {
  if (!params || typeof params !== "object") return url;
  const entries = Object.entries(params).flatMap(([key, value]) => {
    if (value === undefined || value === null) return [];
    if (Array.isArray(value)) return value.map((v) => [key, v]);
    return [[key, value]];
  });
  if (!entries.length) return url;

  const qs = entries
    .map(([key, value]) => {
      const v = typeof value === "string" ? value : String(value);
      return `${encodeURIComponent(String(key))}=${encodeURIComponent(v)}`;
    })
    .join("&");

  const glue = url.includes("?") ? "&" : "?";
  return `${url}${glue}${qs}`;
}

function isFormData(body: any) {
  return typeof FormData !== "undefined" && body instanceof FormData;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function parseResponse(
  res: Response,
  responseType: ApiRequestOptions["responseType"]
) {
  if (responseType === "arrayBuffer" && res.arrayBuffer) return res.arrayBuffer();
  if (responseType === "blob" && res.blob) return res.blob();
  if (responseType === "text") return res.text();

  const text = await res.text();
  if (responseType === "json") {
    return text ? JSON.parse(text) : null;
  }

  // auto
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function toHttpError(status: number, data: any, requestId: string | null) {
  const nested = data?.error && typeof data.error === "object" ? data.error : null;
  const fallbackCode =
    status === 401 ? "UNAUTHENTICATED" : status === 403 ? "FORBIDDEN" : "HTTP_ERROR";
  const code = String(nested?.code || data?.code || fallbackCode);
  const message = String(
    nested?.message || data?.message || (typeof data === "string" ? data : code)
  );
  const error = new ApiError(code, status, data, requestId || data?.requestId || null);
  error.message = message;
  return error;
}

function toNetworkError(error: any) {
  const offline =
    typeof navigator !== "undefined" && navigator && navigator.onLine === false;
  const normalized = new ApiError(offline ? "OFFLINE" : "NETWORK_ERROR", null, {
    cause: error
  });
  normalized.message = offline
    ? "You appear to be offline."
    : "Unable to reach the server.";
  return normalized;
}

export async function apiRequest<T = any>(
  path: string,
  opts: ApiRequestOptions = {}
): Promise<T> {
  const useAuth = opts.auth !== false;
  const retries = Math.max(0, Number(opts.retries || 0));
  const retryDelay = Math.max(0, Number(opts.retryDelay || 0));

  const url = appendParams(toAbsoluteUrl(path), opts.params);

  let attempt = 0;
  while (true) {
    attempt += 1;

    const headers: Record<string, string> = { ...(opts.headers || {}) };

    const hasAuthorization = Object.keys(headers).some(
      (header) => header.toLowerCase() === "authorization"
    );
    if (useAuth && !hasAuthorization) {
      try {
        const t = await getToken();
        const raw = t ? String(t) : "";
        const normalized = raw.startsWith("Bearer ") ? raw.slice("Bearer ".length) : raw;
        if (normalized) headers.Authorization = `Bearer ${normalized}`;
      } catch {
        // ignore token read errors
      }
    }

    let body = opts.body ?? opts.data;
    if (body !== undefined && body !== null && !isFormData(body)) {
      if (typeof body !== "string") {
        body = JSON.stringify(body);
      }
      if (!headers["Content-Type"]) headers["Content-Type"] = "application/json";
    }

    const timeoutMs = opts.timeoutMs ?? opts.timeout ?? null;
    let controller: AbortController | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const signal = opts.signal;
    if (
      !signal &&
      timeoutMs &&
      Number(timeoutMs) > 0 &&
      typeof AbortController !== "undefined"
    ) {
      controller = new AbortController();
      timeoutId = setTimeout(() => controller?.abort(), Number(timeoutMs));
    }

    try {
      const res = await fetch(url, {
        method: opts.method || "GET",
        headers,
        body,
        signal: signal || controller?.signal
      } as any);

      if (timeoutId) clearTimeout(timeoutId);

      if (!res.ok) {
        const data = await parseResponse(res, opts.responseType ?? "auto");
        const requestId = res.headers?.get?.("x-request-id") || null;
        if (res.status === 401 && opts.invalidateOn401 !== false) {
          try {
            if (unauthorizedHandler) await unauthorizedHandler();
          } catch {
            // ignore handler failures
          }
        }
        if (res.status >= 500 && attempt <= retries) {
          if (retryDelay) await sleep(retryDelay);
          continue;
        }
        throw toHttpError(res.status, data, requestId);
      }

      const result = (await parseResponse(res, opts.responseType ?? "auto")) as T;
      emitTransportEvent({ type: "recovered" });
      return result;
    } catch (err: any) {
      if (timeoutId) clearTimeout(timeoutId);

      const isAbort = err?.name === "AbortError";
      if (isAbort) {
        if (attempt <= retries) {
          if (retryDelay) await sleep(retryDelay);
          continue;
        }
        const timeoutError = new ApiError("TIMEOUT", null, { cause: err });
        timeoutError.message = "The request timed out.";
        emitTransportEvent({ type: "error", error: timeoutError });
        throw timeoutError;
      }

      if (
        attempt <= retries &&
        err instanceof ApiError &&
        err.status &&
        err.status >= 500
      ) {
        if (retryDelay) await sleep(retryDelay);
        continue;
      }

      const normalized = err instanceof ApiError ? err : toNetworkError(err);
      emitTransportEvent({ type: "error", error: normalized });
      throw normalized;
    }
  }
}
