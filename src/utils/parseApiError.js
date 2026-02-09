/**
 * Contract-locked error parser for GrowPath backend.
 *
 * Backend guarantees errors are:
 *   { success:false, error:{ code, message } }
 * and correlation id is in response header: x-request-id
 *
 * This helper gracefully handles:
 * - fetch Response objects (preferred)
 * - axios-style errors (optional compatibility)
 * - plain objects (already-parsed bodies)
 * - network/offline exceptions
 *
 * @param {any} input - fetch Response | error object | parsed body
 * @param {object} [opts]
 * @param {string} [opts.fallbackCode="UNKNOWN_ERROR"]
 * @param {string} [opts.fallbackMessage="Something went wrong"]
 * @returns {{ ok: false, code: string, message: string, status: number|null, requestId: string|null, raw: any }}
 */
export function parseApiError(input, opts = {}) {
  const fallbackCode = opts.fallbackCode || "UNKNOWN_ERROR";
  const fallbackMessage = opts.fallbackMessage || "Something went wrong";

  const base = {
    ok: false,
    code: fallbackCode,
    message: fallbackMessage,
    status: null,
    requestId: null,
    raw: input
  };

  // 1) fetch Response object
  if (
    input &&
    typeof input === "object" &&
    typeof input.headers?.get === "function" &&
    typeof input.status === "number"
  ) {
    base.status = input.status;
    base.requestId = input.headers.get("x-request-id");

    // We can't synchronously read the body here; caller should pass parsed body (see helpers below).
    return base;
  }

  // 2) axios-style error compatibility (optional)
  // axios error: { response: { status, data, headers } }
  const axiosResp = input?.response;
  if (axiosResp && typeof axiosResp === "object") {
    base.status = typeof axiosResp.status === "number" ? axiosResp.status : null;

    const headers = axiosResp.headers || {};
    base.requestId = headers["x-request-id"] || headers["X-Request-Id"] || null;

    const data = axiosResp.data;
    const code = data?.error?.code;
    const message = data?.error?.message;

    if (typeof code === "string") base.code = code;
    if (typeof message === "string") base.message = message;

    base.raw = data ?? input;
    return base;
  }

  // 3) Already-parsed backend error envelope
  // { success:false, error:{ code, message } }
  if (input && typeof input === "object") {
    const code = input?.error?.code;
    const message = input?.error?.message;

    if (typeof code === "string") base.code = code;
    if (typeof message === "string") base.message = message;

    // Some callers may attach requestId separately; support it without depending on it
    if (typeof input?.requestId === "string") base.requestId = input.requestId;
    if (typeof input?.status === "number") base.status = input.status;

    return base;
  }

  // 4) Network/offline or thrown string
  if (typeof input === "string") {
    base.message = input;
    return base;
  }

  return base;
}

/**
 * Convenience helper for fetch:
 * Given a non-ok Response, parse JSON safely and return parsed error.
 *
 * @param {Response} res
 * @returns {Promise<{ ok:false, code:string, message:string, status:number|null, requestId:string|null, raw:any }>}
 */
export async function parseFetchError(res) {
  const meta = parseApiError(res);

  let body = null;
  try {
    // Some endpoints might return empty bodies (e.g., 204)
    body = await res.clone().json();
  } catch (_) {
    body = null;
  }

  const merged = parseApiError(body, {
    fallbackCode: meta.code,
    fallbackMessage: meta.message
  });

  merged.status = meta.status;
  merged.requestId = meta.requestId;
  merged.raw = body ?? res;

  return merged;
}
