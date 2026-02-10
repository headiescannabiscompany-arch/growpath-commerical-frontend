export type ApiRequestOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: any; // object -> JSON.stringify
};

function baseUrl() {
  const raw = process.env.EXPO_PUBLIC_API_URL;
  return (raw && String(raw).replace(/\/+$/, "")) || "";
}

export async function apiRequest(path: string, opts: ApiRequestOptions = {}) {
  const url = path.startsWith("http") ? path : `${baseUrl()}${path}`;

  const method = (opts.method || "GET").toUpperCase();
  const headers: Record<string, string> = { ...(opts.headers || {}) };

  let body: any = undefined;
  if (opts.body !== undefined) {
    if (typeof opts.body === "string") {
      body = opts.body;
    } else {
      headers["Content-Type"] = headers["Content-Type"] || "application/json";
      body = JSON.stringify(opts.body);
    }
  }

  const res = await fetch(url, { method, headers, body });

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const err: any = new Error(
      data?.error?.message || data?.message || `HTTP ${res.status}`
    );
    err.status = res.status;
    err.code = data?.error?.code || data?.code;
    err.payload = data;
    throw err;
  }

  return data;
}
