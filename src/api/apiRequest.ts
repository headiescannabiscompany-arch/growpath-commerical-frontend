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

export const API_URL =
  (globalThis as any).API_URL_OVERRIDE ||
  process.env.EXPO_PUBLIC_API_URL ||
  "http://localhost:5001";

export class ApiError extends Error {
  code: string;
  status: number | null;
  data: any;

  constructor(code: string, status: number | null, data: any = null) {
    super(code);
    this.name = "ApiError";
    this.code = code;
    this.status = status ?? null;
    this.data = data ?? null;
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
  if (!path) return API_URL;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const base = String(API_URL || "").replace(/\/$/, "");
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

    if (useAuth && !headers.Authorization) {
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
        throw new ApiError("HTTP_ERROR", res.status, data);
      }

      return (await parseResponse(res, opts.responseType ?? "auto")) as T;
    } catch (err: any) {
      if (timeoutId) clearTimeout(timeoutId);

      const isAbort = err?.name === "AbortError";
      if (isAbort) {
        if (attempt <= retries) {
          if (retryDelay) await sleep(retryDelay);
          continue;
        }
        throw new Error("Request timeout");
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

      throw err;
    }
  }
}
