/**
 * Contract-locked error parser for GrowPath backend.
 *
 * Backend guarantees errors are:
 *   { success:false, error:{ code, message } }
 * and correlation id is in response header: x-request-id
 *
 * This helper gracefully handles:
 * - Response objects (preferred)
 * - client error objects with { response: { status, data, headers } }
 * - plain objects (already-parsed bodies)
 * - network/offline exceptions
 *
 * @param {any} input - Response | error object | parsed body
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

  // 1) Response object
  if (
    input &&
    typeof input === "object" &&
    typeof input.headers?.get === "function" &&
    typeof input.status === "number"
  ) {
    base.status = input.status;
    base.requestId = input.headers.get("x-request-id");
    return base;
  }

  // 2) client error object with { response: { status, data, headers } }
  const resp = input?.response;
  if (resp && typeof resp === "object") {
    base.status = typeof resp.status === "number" ? resp.status : null;

    const headers = resp.headers || {};
    base.requestId =
      headers["x-request-id"] ||
      headers["X-Request-Id"] ||
      headers["x-requestid"] ||
      headers["X-REQUEST-ID"] ||
      null;

    const data = resp.data;
    const respCode = data?.error?.code ?? data?.code;
    const respMessage = data?.error?.message ?? data?.message;

    if (typeof respCode === "string" && respCode.trim()) base.code = respCode;
    if (typeof respMessage === "string" && respMessage.trim()) base.message = respMessage;

    base.raw = data ?? input;
    return base;
  }

  // 3) Already-parsed backend error envelope
  if (input && typeof input === "object") {
    const parsedCode = input?.error?.code ?? input?.code;
    const parsedMessage = input?.error?.message ?? input?.message;

    if (typeof parsedCode === "string" && parsedCode.trim()) base.code = parsedCode;
    if (typeof parsedMessage === "string" && parsedMessage.trim())
      base.message = parsedMessage;

    if (typeof input?.requestId === "string") base.requestId = input.requestId;
    if (typeof input?.status === "number") base.status = input.status;
    return base;
  }

  // 4) thrown string
  if (typeof input === "string") {
    base.message = input;
    return base;
  }

  return base;
}

/**
 * Convenience helper:
 * Given a non-ok Response, parse JSON safely and return parsed error.
 *
 * @param {Response} res
 * @returns {Promise<{ ok:false, code:string, message:string, status:number|null, requestId:string|null, raw:any }>}
 */
export async function parseFetchError(res) {
  const meta = parseApiError(res);

  let body = null;
  try {
    body = await res.clone().json();
  } catch (_) {
    body = null;
  }

  if (!body) {
    try {
      const text = await res.clone().text();
      body = text ? { message: text } : null;
    } catch (_) {
      body = null;
    }
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
