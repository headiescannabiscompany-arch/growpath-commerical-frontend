import { parseClaimReturnPath } from "@/utils/claimReturnPath";

export const GIFT_CHECKOUT_SUCCESS_PATH = "/account/gift-checkout/success";
export const GIFT_CHECKOUT_CANCEL_PATH = "/account/gift-checkout/cancel";
export const GIFT_CHECKOUT_RECOVERY_PATH = "/account/gift-checkout/recover";
export const OFFERS_GIFT_RETURN_PATH = "/offers?gift=1";

const MAX_RETURN_LENGTH = 1024;
const SESSION_ID_PATTERN = /^cs_[A-Za-z0-9_]{3,252}$/;
const CHECKOUT_ATTEMPT_ID_PATTERN = /^[A-Za-z0-9_-]{20,128}$/;

type ReturnParams = Record<string, string | string[] | undefined>;

function exactString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function exactParamKeys(params: ReturnParams): string[] {
  return Object.entries(params)
    .filter(([, value]) => value !== undefined)
    .map(([key]) => key);
}

function containsControlCharacter(value: string): boolean {
  return Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return code <= 0x1f || code === 0x7f;
  });
}

export function normalizeGiftCheckoutSessionId(value: unknown): string {
  const candidate = exactString(value);
  return SESSION_ID_PATTERN.test(candidate) ? candidate : "";
}

export function normalizeGiftCheckoutAttemptId(value: unknown): string {
  const candidate = exactString(value);
  return CHECKOUT_ATTEMPT_ID_PATTERN.test(candidate) ? candidate : "";
}

export function parseAuthReturnPath(value: unknown): string {
  if (typeof value !== "string" || !value || value !== value.trim()) return "";
  if (
    value.length > MAX_RETURN_LENGTH ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    value.includes("#") ||
    containsControlCharacter(value)
  ) {
    return "";
  }

  let parsed: URL;
  try {
    parsed = new URL(value, "https://growpath.invalid");
  } catch {
    return "";
  }
  if (
    parsed.origin !== "https://growpath.invalid" ||
    `${parsed.pathname}${parsed.search}` !== value
  ) {
    return "";
  }

  const entries = Array.from(parsed.searchParams.entries());
  if (parsed.pathname === GIFT_CHECKOUT_SUCCESS_PATH) {
    if (
      entries.length !== 1 ||
      entries[0][0] !== "session_id" ||
      !normalizeGiftCheckoutSessionId(entries[0][1])
    ) {
      return "";
    }
    const canonical = `${GIFT_CHECKOUT_SUCCESS_PATH}?session_id=${encodeURIComponent(
      entries[0][1]
    )}`;
    return value === canonical ? canonical : "";
  }
  if (parsed.pathname === GIFT_CHECKOUT_CANCEL_PATH) {
    if (entries.length === 0 && parsed.search === "") {
      return GIFT_CHECKOUT_CANCEL_PATH;
    }
    if (
      entries.length !== 1 ||
      entries[0][0] !== "checkout_attempt_id" ||
      !normalizeGiftCheckoutAttemptId(entries[0][1])
    ) {
      return "";
    }
    const canonical = `${GIFT_CHECKOUT_CANCEL_PATH}?checkout_attempt_id=${encodeURIComponent(
      entries[0][1]
    )}`;
    return value === canonical ? canonical : "";
  }
  if (
    parsed.pathname === GIFT_CHECKOUT_RECOVERY_PATH &&
    entries.length === 0 &&
    parsed.search === ""
  ) {
    return GIFT_CHECKOUT_RECOVERY_PATH;
  }
  if (value === OFFERS_GIFT_RETURN_PATH) {
    return OFFERS_GIFT_RETURN_PATH;
  }
  return "";
}

export function buildAuthReturnPath(
  pathname: unknown,
  params: ReturnParams,
  fragment: unknown = ""
): string {
  if (typeof pathname !== "string" || fragment !== "") {
    return "";
  }
  const keys = exactParamKeys(params);
  if (pathname === GIFT_CHECKOUT_RECOVERY_PATH) {
    return keys.length === 0 ? GIFT_CHECKOUT_RECOVERY_PATH : "";
  }
  if (pathname === "/offers") {
    return keys.length === 1 && keys[0] === "gift" && params.gift === "1"
      ? OFFERS_GIFT_RETURN_PATH
      : "";
  }
  if (pathname === GIFT_CHECKOUT_SUCCESS_PATH) {
    if (keys.length !== 1 || keys[0] !== "session_id") return "";
    const sessionId = normalizeGiftCheckoutSessionId(params.session_id);
    return sessionId
      ? `${GIFT_CHECKOUT_SUCCESS_PATH}?session_id=${encodeURIComponent(sessionId)}`
      : "";
  }
  if (pathname === GIFT_CHECKOUT_CANCEL_PATH) {
    if (keys.length === 0) return GIFT_CHECKOUT_CANCEL_PATH;
    if (keys.length !== 1 || keys[0] !== "checkout_attempt_id") return "";
    const attemptId = normalizeGiftCheckoutAttemptId(params.checkout_attempt_id);
    return attemptId
      ? `${GIFT_CHECKOUT_CANCEL_PATH}?checkout_attempt_id=${encodeURIComponent(
          attemptId
        )}`
      : "";
  }
  return "";
}

export function resolveAuthReturnPath(
  pathname: unknown,
  params: ReturnParams,
  fragment: unknown = "",
  rawBrowserPath?: unknown
): string {
  const decoded = buildAuthReturnPath(pathname, params, fragment);
  if (rawBrowserPath === undefined) return decoded;
  if (typeof rawBrowserPath !== "string") return "";
  const raw = parseAuthReturnPath(rawBrowserPath);
  return raw && raw === decoded ? raw : "";
}

export function isCanonicalLegacyCancelReturn(rawBrowserPath?: unknown): boolean {
  return rawBrowserPath === undefined || rawBrowserPath === GIFT_CHECKOUT_CANCEL_PATH;
}

export function parseSafeLoginReturnPath(value: unknown): string {
  return parseAuthReturnPath(value) || parseClaimReturnPath(value);
}

export function safeLoginPath(email: unknown, next: unknown): string {
  const params = new URLSearchParams();
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  const safeNext = parseSafeLoginReturnPath(next);
  if (normalizedEmail) params.set("email", normalizedEmail);
  if (safeNext) params.set("next", safeNext);
  const query = params.toString();
  return query ? `/login?${query}` : "/login";
}
