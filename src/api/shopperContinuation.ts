import { ApiError, apiRequest } from "./apiRequest";
import { getToken } from "../auth/tokenStore";
import { parseShopperSignupReturnPath } from "../utils/authReturnPath";
import { PRODUCT_SIGNUP_CONTINUATION_TTL_MS } from "../utils/shopperProductContinuation";

export type AccountShopperContinuation = {
  path: string;
  revision: string;
  expiresAt: string;
  plan: "free" | "pro" | "commercial" | "facility";
  mode: "personal" | "commercial" | "facility";
};

export function parseAccountShopperContinuation(
  value: unknown
): AccountShopperContinuation | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as AccountShopperContinuation;
  const expiry =
    typeof record.expiresAt === "string" ? Date.parse(record.expiresAt) : NaN;
  const expectedMode =
    record.plan === "free" || record.plan === "pro" ? "personal" : record.plan;
  if (
    Object.keys(record).length !== 5 ||
    !record.path ||
    parseShopperSignupReturnPath(record.path) !== record.path ||
    typeof record.revision !== "string" ||
    record.revision.length !== 32 ||
    !/^[a-f0-9]{32}$/.test(record.revision) ||
    !Number.isFinite(expiry) ||
    expiry <= Date.now() ||
    expiry > Date.now() + PRODUCT_SIGNUP_CONTINUATION_TTL_MS ||
    !["free", "pro", "commercial", "facility"].includes(record.plan) ||
    record.mode !== expectedMode
  )
    return null;
  return {
    path: record.path,
    revision: record.revision,
    expiresAt: record.expiresAt,
    plan: record.plan,
    mode: record.mode
  };
}

async function requestContinuation(
  sessionToken: string,
  revision?: string,
  signal?: AbortSignal
) {
  if (!sessionToken || (await getToken()) !== sessionToken || signal?.aborted) {
    throw new ApiError("ACCOUNT_SESSION_CHANGED", null);
  }
  const response = await apiRequest<{ continuation: unknown }>(
    `/api/auth/shopper-continuation${revision ? "/consume" : ""}`,
    {
      method: revision ? "POST" : "GET",
      headers: { Authorization: `Bearer ${sessionToken}` },
      ...(revision ? { body: { revision } } : {}),
      cache: "no-store",
      retries: 0,
      timeoutMs: 5000,
      silent: true,
      notifyTransport: false,
      invalidateOn401: false,
      signal
    }
  );
  if ((await getToken()) !== sessionToken || signal?.aborted) {
    throw new ApiError("ACCOUNT_SESSION_CHANGED", null);
  }
  return parseAccountShopperContinuation(response?.continuation);
}

export function readAccountShopperContinuation(
  sessionToken: string,
  signal?: AbortSignal
) {
  return requestContinuation(sessionToken, undefined, signal);
}

export function consumeAccountShopperContinuation(
  snapshot: AccountShopperContinuation,
  sessionToken: string,
  signal?: AbortSignal
) {
  if (!parseAccountShopperContinuation(snapshot)) return Promise.resolve(null);
  return requestContinuation(sessionToken, snapshot.revision, signal).then((result) =>
    result &&
    result.revision === snapshot.revision &&
    result.path === snapshot.path &&
    result.expiresAt === snapshot.expiresAt &&
    result.plan === snapshot.plan &&
    result.mode === snapshot.mode
      ? result
      : null
  );
}
