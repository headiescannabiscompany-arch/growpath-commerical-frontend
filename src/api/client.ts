import { config } from "../config/config";
import { ApiError, normalizeApiError } from "./errors";

let authToken: string | null = null;

// AuthContext should call this when token changes
export function setAuthToken(token: string | null) {
  authToken = token;
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: any;
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

async function safeJson(res: Response) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    // backend returned non-JSON (or HTML)
    const err: ApiError = {
      code: "PARSE_ERROR",
      message: "Invalid server response.",
      status: res.status,
      details: { raw: text.slice(0, 1000) }
    };
    throw err;
  }
}

export async function api<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  try {
    const res = await fetch(`${config.apiBaseUrl}${path}`, {
      method: opts.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...(opts.headers || {})
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal
    });

    const data = await safeJson(res);

    if (!res.ok) {
      const err: ApiError = {
        code:
          data?.code ||
          (res.status === 401
            ? "UNAUTHORIZED"
            : res.status === 403
              ? "FORBIDDEN"
              : "SERVER_ERROR"),
        message: data?.message || `Request failed (${res.status})`,
        status: res.status,
        details: data
      };
      throw err;
    }

    return data as T;
  } catch (e) {
    throw normalizeApiError(e);
  }
}
