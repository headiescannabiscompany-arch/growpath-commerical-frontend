import { getToken } from "../auth/tokenStore";

export type ApiRequestOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: any; // object -> JSON.stringify
  responseType?: "auto" | "json" | "text" | "blob" | "arrayBuffer";
};

function baseUrl() {
  const raw = process.env.EXPO_PUBLIC_API_URL;
  return (raw && String(raw).replace(/\/+$/, "")) || "";
}

export async function apiRequest(path: string, opts: ApiRequestOptions = {}) {
  const url = path.startsWith("http") ? path : `${baseUrl()}${path}`;

  const method = (opts.method || "GET").toUpperCase();
  const headers: Record<string, string> = { ...(opts.headers || {}) };

  // Inject Authorization header if token is present
  const token = await getToken();
  if (token) {
    headers["Authorization"] = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
  }

  let body: any = undefined;
  if (opts.body !== undefined) {
    const isFormData = typeof FormData !== "undefined" && opts.body instanceof FormData;

    if (isFormData) {
      body = opts.body;
      // IMPORTANT: do NOT set Content-Type; fetch sets multipart boundary automatically.
      if (headers["Content-Type"] === "application/json") delete headers["Content-Type"];
    } else if (typeof opts.body === "string") {
      body = opts.body;
    } else {
      headers["Content-Type"] = headers["Content-Type"] || "application/json";
      body = JSON.stringify(opts.body);
    }
  }

  const res = await fetch(url, {
    method,
    headers,
    body,
    credentials: "include"
  });

  // Parse response safely
  const requestId = res.headers.get("x-request-id") || undefined;
  const contentType = res.headers.get("content-type") || "";

  const responseType = (opts as any).responseType || "auto";

  let data: any = null;

  if (res.status !== 204 && res.status !== 205) {
    if (responseType === "blob") {
      data = await res.blob();
    } else if (responseType === "arrayBuffer") {
      data = await res.arrayBuffer();
    } else if (responseType === "text") {
      data = await res.text();
    } else if (responseType === "json") {
      data = await res.json();
    } else {
      // auto
      if (contentType.includes("application/json")) {
        try {
          data = await res.json();
        } catch {
          try {
            data = await res.text();
          } catch {
            data = null;
          }
        }
      } else {
        try {
          data = await res.text();
        } catch {
          data = null;
        }
      }
    }
  }

  if (!res.ok) {
    const err: any = new Error(
      data?.error?.message || data?.message || `HTTP ${res.status}`
    );
    err.status = res.status;
    err.code = data?.error?.code || data?.code;
    err.payload = data;
    err.url = url;
    err.method = method;
    err.requestId = requestId;
    throw err;
  }

  return data;
}
