import { config } from "../config/config";
import { normalizeApiError, type ApiError } from "./errors";

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token || null;
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: any;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  timeout?: number;
};

const DEFAULT_TIMEOUT = 10000;

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
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  const hasBody = "body" in options && options.body !== undefined;
  const bodyIsFD = hasBody && isFormData(options.body);
  const bodyIsBlob = hasBody && isBlob(options.body);

  if (hasBody && !bodyIsFD && !bodyIsBlob && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const controller = new AbortController();
  const timeout = options.timeout ?? DEFAULT_TIMEOUT;
  const timeoutId = setTimeout(() => controller.abort(), timeout);

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

    const res = await fetch(url, {
      method,
      headers,
      body,
      signal: options.signal ?? controller.signal
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const data = await safeJson(res).catch(() => null);
      throw normalizeApiError(data ?? { status: res.status });
    }

    return await safeJson(res);
  } catch (e: any) {
    clearTimeout(timeoutId);
    if (e?.name === "AbortError")
      throw new Error("Request timeout - is the backend running?");
    console.error("[API] Request error:", {
      url: path,
      method,
      error: e,
      message: e?.message,
      code: e?.code,
      status: e?.status
    });
    throw e;
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
