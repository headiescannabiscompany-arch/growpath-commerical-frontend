import { api, setAuthToken } from "./client";
import { getToken } from "../auth/tokenStore";

export type ApiRequestOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  responseType?: "auto" | "json" | "text" | "blob" | "arrayBuffer";
  signal?: AbortSignal;
  timeoutMs?: number;
  auth?: boolean;
  silent?: boolean;
  invalidateOn401?: boolean;
};

// Best-effort token sync so apiRequest callers get auth even if some flows forgot setAuthToken()
let lastSyncedToken: string | null | undefined = undefined;

async function syncAuthTokenIfNeeded(authEnabled: boolean) {
  if (!authEnabled) return;

  try {
    const t = await getToken();
    const raw = t ? String(t) : "";
    const normalized = raw
      ? raw.startsWith("Bearer ")
        ? raw.slice("Bearer ".length)
        : raw
      : null;

    if (normalized !== lastSyncedToken) {
      setAuthToken(normalized);
      lastSyncedToken = normalized;
    }
  } catch {
    // ignore token read errors; request() will proceed without auth
  }
}

export async function apiRequest<T = any>(
  path: string,
  opts: ApiRequestOptions = {}
): Promise<T> {
  const useAuth = opts.auth !== false;
  await syncAuthTokenIfNeeded(useAuth);

  const out: any = await api(path, {
    method: (opts.method as any) || "GET",
    headers: opts.headers,
    body: opts.body,
    responseType: opts.responseType,
    signal: opts.signal,
    timeout: opts.timeoutMs,
    auth: opts.auth,
    silent: opts.silent,
    invalidateOn401: opts.invalidateOn401
  });

  // canonical client returns { ok, status, data, requestId, ... }
  if (out && typeof out === "object" && "ok" in out) {
    if (out.ok) return out.data as T;

    const err: any = new Error(out.message || "Request failed");
    err.status = out.status ?? null;
    err.code = out.code ?? "UNKNOWN_ERROR";
    err.payload = out.raw;
    err.url = path;
    err.method = (opts.method || "GET").toUpperCase();
    err.requestId = out.requestId ?? null;
    throw err;
  }

  // fallback (should not happen)
  return out as T;
}
import { api, setAuthToken } from "./client";
import { getToken } from "../auth/tokenStore";

export type ApiRequestOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  responseType?: "auto" | "json" | "text" | "blob" | "arrayBuffer";
  signal?: AbortSignal;
  timeoutMs?: number;
  auth?: boolean;
  silent?: boolean;
  invalidateOn401?: boolean;
};

// Best-effort token sync so apiRequest callers get auth even if some flows forgot setAuthToken()
let lastSyncedToken: string | null | undefined = undefined;

async function syncAuthTokenIfNeeded(authEnabled: boolean) {
  if (!authEnabled) return;

  try {
    const t = await getToken();
    const raw = t ? String(t) : "";
    const normalized = raw
      ? raw.startsWith("Bearer ")
        ? raw.slice("Bearer ".length)
        : raw
      : null;

    if (normalized !== lastSyncedToken) {
      setAuthToken(normalized);
      lastSyncedToken = normalized;
    }
  } catch {
    // ignore token read errors; request() will proceed without auth
  }
}

export async function apiRequest<T = any>(
  path: string,
  opts: ApiRequestOptions = {}
): Promise<T> {
  const useAuth = opts.auth !== false;
  await syncAuthTokenIfNeeded(useAuth);

  const out: any = await api(path, {
    method: (opts.method as any) || "GET",
    headers: opts.headers,
    body: opts.body,
    responseType: opts.responseType,
    signal: opts.signal,
    timeout: opts.timeoutMs,
    auth: opts.auth,
    silent: opts.silent,
    invalidateOn401: opts.invalidateOn401
  });

  // canonical client returns { ok, status, data, requestId, ... }
  if (out && typeof out === "object" && "ok" in out) {
    if (out.ok) return out.data as T;

    const err: any = new Error(out.message || "Request failed");
    err.status = out.status ?? null;
    err.code = out.code ?? "UNKNOWN_ERROR";
    err.payload = out.raw;
    err.url = path;
    err.method = (opts.method || "GET").toUpperCase();
    err.requestId = out.requestId ?? null;
    throw err;
  }

  // fallback (should not happen)
  return out as T;
}
