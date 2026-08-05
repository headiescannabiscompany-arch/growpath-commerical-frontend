import { getToken } from "../auth/tokenStore";
import { publishTokenBalanceChange } from "../utils/tokenBalanceEvents";
import { Platform } from "react-native";

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
  cache?: RequestCache;
};

export type SignedBinaryUploadOptions = {
  url: string;
  uri: string;
  body?: Blob;
  mimeType: string;
  signal?: AbortSignal;
  onProgress?: (fraction: number) => void;
};

export type SignedBinaryUploadResult = {
  status: number;
  etag: string;
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

function uploadError(code: string, message: string, status: number | null = null) {
  const error = new ApiError(code, status);
  error.message = message;
  return error;
}

function responseEtag(headers: Record<string, string> | undefined) {
  if (!headers) return "";
  const key = Object.keys(headers).find((name) => name.toLowerCase() === "etag");
  return key ? String(headers[key] || "").trim() : "";
}

export async function uploadBinaryToSignedUrl(
  options: SignedBinaryUploadOptions
): Promise<SignedBinaryUploadResult> {
  const onProgress = options.onProgress || (() => undefined);
  if (options.signal?.aborted) {
    throw uploadError("MEDIA_UPLOAD_ABORTED", "The upload was canceled.");
  }
  onProgress(0);
  if (Platform.OS === "web") {
    if (!options.body) {
      throw uploadError(
        "MEDIA_UPLOAD_FILE_UNAVAILABLE",
        "The browser could not read the selected file."
      );
    }
    return new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();
      const abort = () => request.abort();
      options.signal?.addEventListener("abort", abort, { once: true });
      request.open("PUT", options.url, true);
      request.setRequestHeader("Content-Type", options.mimeType);
      request.upload.onprogress = (event) => {
        if (event.lengthComputable && event.total > 0) {
          onProgress(Math.min(1, event.loaded / event.total));
        }
      };
      request.onerror = () => {
        options.signal?.removeEventListener("abort", abort);
        reject(
          uploadError(
            "MEDIA_UPLOAD_NETWORK_ERROR",
            "The upload was interrupted. Check your connection and try again."
          )
        );
      };
      request.onabort = () => {
        options.signal?.removeEventListener("abort", abort);
        reject(uploadError("MEDIA_UPLOAD_ABORTED", "The upload was canceled."));
      };
      request.onload = () => {
        options.signal?.removeEventListener("abort", abort);
        if (request.status < 200 || request.status >= 300) {
          reject(
            uploadError(
              "MEDIA_UPLOAD_REJECTED",
              "Protected storage rejected the upload.",
              request.status
            )
          );
          return;
        }
        onProgress(1);
        resolve({
          status: request.status,
          etag: String(request.getResponseHeader("ETag") || "").trim()
        });
      };
      request.send(options.body);
    });
  }

  if (!options.uri) {
    throw uploadError(
      "MEDIA_UPLOAD_FILE_UNAVAILABLE",
      "The device could not read the selected file."
    );
  }
  const FileSystem = await import("expo-file-system/legacy");
  const task = FileSystem.createUploadTask(
    options.url,
    options.uri,
    {
      httpMethod: "PUT",
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: { "Content-Type": options.mimeType }
    },
    (progress) => {
      const total = Number(progress.totalBytesExpectedToSend || 0);
      if (total > 0) {
        onProgress(Math.min(1, Number(progress.totalBytesSent || 0) / total));
      }
    }
  );
  const abort = () => {
    void task.cancelAsync().catch(() => undefined);
  };
  options.signal?.addEventListener("abort", abort, { once: true });
  try {
    const response = await task.uploadAsync();
    if (!response) {
      throw uploadError("MEDIA_UPLOAD_ABORTED", "The upload was canceled.");
    }
    if (response.status < 200 || response.status >= 300) {
      throw uploadError(
        "MEDIA_UPLOAD_REJECTED",
        "Protected storage rejected the upload.",
        response.status
      );
    }
    onProgress(1);
    return {
      status: response.status,
      etag: responseEtag(response.headers)
    };
  } finally {
    options.signal?.removeEventListener("abort", abort);
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
    let callerAborted = Boolean(signal?.aborted);
    let timeoutTriggered = false;
    let removeCallerAbortListener: () => void = () => {};
    if (
      typeof AbortController !== "undefined" &&
      (signal || (timeoutMs && Number(timeoutMs) > 0))
    ) {
      controller = new AbortController();
      if (signal) {
        const abortFromCaller = () => {
          callerAborted = true;
          controller?.abort();
        };
        if (signal.aborted) abortFromCaller();
        else {
          signal.addEventListener("abort", abortFromCaller, { once: true });
          removeCallerAbortListener = () =>
            signal.removeEventListener("abort", abortFromCaller);
        }
      }
      if (timeoutMs && Number(timeoutMs) > 0) {
        timeoutId = setTimeout(() => {
          timeoutTriggered = true;
          controller?.abort();
        }, Number(timeoutMs));
      }
    }

    const cleanupAbort = () => {
      if (timeoutId) clearTimeout(timeoutId);
      removeCallerAbortListener();
    };

    try {
      const res = await fetch(url, {
        method: opts.method || "GET",
        headers,
        body,
        cache: opts.cache,
        signal: controller?.signal || signal
      } as any);

      if (!res.ok) {
        const data = await parseResponse(res, opts.responseType ?? "auto");
        const requestId = res.headers?.get?.("x-request-id") || null;
        // A feature endpoint can return 401 because that feature is unavailable or
        // its route is misconfigured. Only callers performing a canonical session
        // check may invalidate the entire login.
        if (res.status === 401 && opts.invalidateOn401 === true) {
          try {
            if (unauthorizedHandler) await unauthorizedHandler();
          } catch {
            // ignore handler failures
          }
        }
        if (res.status >= 500 && attempt <= retries) {
          cleanupAbort();
          if (retryDelay) await sleep(retryDelay);
          continue;
        }
        throw toHttpError(res.status, data, requestId);
      }

      const result = (await parseResponse(res, opts.responseType ?? "auto")) as T;
      // Keep caller cancellation and the request deadline attached until the
      // response body is fully consumed. Fetch resolves as soon as headers
      // arrive, while a stalled or interrupted body can still hang afterward.
      cleanupAbort();
      const reportedBalance =
        result && typeof result === "object"
          ? ((result as any).aiTokensRemaining ?? (result as any).data?.aiTokensRemaining)
          : undefined;
      const consumedCredits =
        result && typeof result === "object"
          ? ((result as any).aiCreditsUsed ?? (result as any).data?.aiCreditsUsed)
          : undefined;
      if (reportedBalance !== undefined && reportedBalance !== null) {
        publishTokenBalanceChange(reportedBalance);
      } else if (consumedCredits !== undefined && consumedCredits !== null) {
        publishTokenBalanceChange(0);
      }
      emitTransportEvent({ type: "recovered" });
      return result;
    } catch (err: any) {
      cleanupAbort();

      const isAbort = err?.name === "AbortError" || Boolean(controller?.signal.aborted);
      if (isAbort) {
        if (timeoutTriggered && attempt <= retries) {
          if (retryDelay) await sleep(retryDelay);
          continue;
        }
        if (callerAborted && !timeoutTriggered) {
          const abortedError = new ApiError("ABORTED", null, { cause: err });
          abortedError.message = "The request was canceled.";
          throw abortedError;
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
