import { getToken } from "../auth/tokenStore";

export type ApiRequestOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
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
  global.API_URL_OVERRIDE ||
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

function toAbsoluteUrl(path: string) {
  if (!path) return API_URL;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const base = String(API_URL || "").replace(/\/$/, "");
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${base}${suffix}`;
}

function isFormData(body: any) {
  return typeof FormData !== "undefined" && body instanceof FormData;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function parseResponse(res: Response, responseType: ApiRequestOptions["responseType"]) {
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

  const url = toAbsoluteUrl(path);

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

    let body = opts.body;
    if (body !== undefined && body !== null && !isFormData(body)) {
      if (typeof body !== "string") {
        body = JSON.stringify(body);
      }
      if (!headers["Content-Type"]) headers["Content-Type"] = "application/json";
    }

    const timeoutMs = opts.timeoutMs ?? opts.timeout ?? null;
    let controller: AbortController | null = null;
    let timeoutId: NodeJS.Timeout | null = null;

    const signal = opts.signal;
    if (!signal && timeoutMs && Number(timeoutMs) > 0 && typeof AbortController !== "undefined") {
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

      if (attempt <= retries && err instanceof ApiError && err.status && err.status >= 500) {
        if (retryDelay) await sleep(retryDelay);
        continue;
      }

      throw err;
    }
  }
}
