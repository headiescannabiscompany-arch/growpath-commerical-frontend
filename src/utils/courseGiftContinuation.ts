import { giftClaimTokenFromFragment } from "./claimReturnPath";
import { COURSE_GIFT_CLAIM_PATH, courseGiftAttemptId } from "./courseGiftPaths";
import {
  GIFT_SALE_RECOVERY_MS,
  sameGiftRecovery,
  validGiftSaleRecovery,
  type GiftSaleRecovery,
  type GiftRecoveryRead
} from "./courseGiftSaleRecovery";
export {
  COURSE_GIFT_CLAIM_PATH,
  COURSE_GIFT_CHECKOUT_PATH,
  courseGiftAttemptId,
  courseGiftReturnPath,
  courseGiftCheckoutAttempt
} from "./courseGiftPaths";

export const COURSE_GIFT_CHECKOUT_STORAGE_KEY = "course_gift_checkout_v1";
export const COURSE_GIFT_LINK_MEMORY_MS = 15 * 60 * 1000;
const RECOVERY_MS = 60 * 60 * 1000;
const objectId = (value: unknown): value is string =>
  typeof value === "string" && value.length === 24 && /^[a-f0-9]{24}$/.test(value);

export type CourseGiftAuth = {
  state: "pending" | "signed_out" | "ready";
  userId: string;
  sessionKey: string;
  emailVerified: boolean;
};
type BrowserLocation = {
  location: { pathname: string; search: string; hash: string };
  history: { replaceState: (state: unknown, unused: string, url: string) => void };
};
type RecoveryStorage = Pick<Storage, "getItem" | "setItem">;

/** Unmounted web continuation. No module-global token, native storage, credential
 * read, telemetry or browser effect. A future route owns one instance, observes
 * every auth transition and disposes it on exit. Memory TTL is not gift expiry.
 */
export function createCourseGiftContinuation({
  now = Date.now,
  storage
}: { now?: () => number; storage?: RecoveryStorage } = {}) {
  let token = "";
  let expiresAt = 0;
  let revision = 0;
  let scope = "";
  let userId = "";
  let tokenScope = "";
  let pendingCheckout = "";
  const saleMemory = new Map<string, string>();

  function saleKey(courseId: string, kind: GiftSaleRecovery["kind"]) {
    if (
      !scope ||
      !objectId(userId) ||
      !objectId(courseId) ||
      !["buyer", "creator"].includes(kind)
    )
      return "";
    return `course_gift_sale_v1:${userId}:${courseId}:${kind}`;
  }
  function readSale(courseId: string, kind: GiftSaleRecovery["kind"]) {
    const key = saleKey(courseId, kind);
    if (!key) throw new Error("Gift recovery unavailable");
    let raw = saleMemory.get(key) || "";
    try {
      raw = storage?.getItem(key) || raw;
    } catch {
      if (!raw) throw new Error("Gift recovery unavailable");
    }
    if (!raw) return null;
    if (raw.length > 2048) throw new Error("Gift recovery unavailable");
    const record = JSON.parse(raw);
    if (
      Object.keys(record).sort().join() !== "expiresAt,userId,value,version" ||
      record.version !== 1 ||
      record.userId !== userId ||
      !Number.isSafeInteger(record.expiresAt) ||
      !validGiftSaleRecovery(record.value) ||
      record.value.courseId !== courseId ||
      record.value.kind !== kind
    )
      throw new Error("Gift recovery unavailable");
    return record as {
      version: 1;
      userId: string;
      expiresAt: number;
      value: GiftSaleRecovery;
    };
  }
  function recoverSale(
    courseId: string,
    kind: GiftSaleRecovery["kind"]
  ): GiftRecoveryRead {
    try {
      const record = readSale(courseId, kind);
      if (!record) return { state: "empty", value: null };
      const at = now();
      return {
        state:
          Number.isSafeInteger(at) &&
          record.expiresAt > at &&
          record.expiresAt <= at + GIFT_SALE_RECOVERY_MS
            ? "ready"
            : "blocked",
        value: { ...record.value }
      };
    } catch {
      return { state: "blocked", value: null };
    }
  }
  function rememberSale(value: GiftSaleRecovery): boolean {
    if (!validGiftSaleRecovery(value)) return false;
    try {
      const old = readSale(value.courseId, value.kind);
      const at = now();
      if (
        !Number.isSafeInteger(at) ||
        (old &&
          (recoverSale(value.courseId, value.kind).state !== "ready" ||
            !sameGiftRecovery(old.value, value)))
      )
        return false;
      const key = saleKey(value.courseId, value.kind);
      const raw = JSON.stringify({
        version: 1,
        userId,
        expiresAt: old?.expiresAt || at + GIFT_SALE_RECOVERY_MS,
        value
      });
      saleMemory.set(key, raw);
      storage?.setItem(key, raw);
      return Boolean(storage);
    } catch {
      return false;
    }
  }
  function clearSale(courseId: string, requestId: string): boolean {
    try {
      const old = readSale(courseId, "creator");
      if (!old || old.value.kind !== "creator" || old.value.requestId !== requestId)
        return false;
      const key = saleKey(courseId, "creator");
      storage?.setItem(key, "");
      saleMemory.delete(key);
      return true;
    } catch {
      return false;
    }
  }

  function clear() {
    token = "";
    tokenScope = "";
    expiresAt = 0;
    revision += 1;
  }
  function observe(auth: CourseGiftAuth) {
    const ready =
      auth.state === "ready" &&
      objectId(auth.userId) &&
      typeof auth.sessionKey === "string" &&
      auth.sessionKey.length > 0 &&
      auth.sessionKey.length <= 256;
    const nextScope = ready ? JSON.stringify([auth.userId, auth.sessionKey]) : "";
    // A pending auth bootstrap blocks reads without confusing it with sign-out.
    if (auth.state === "pending") return "";
    if (tokenScope && nextScope !== tokenScope) clear();
    if (nextScope && token) tokenScope = nextScope;
    scope = nextScope;
    userId = ready ? auth.userId : "";
    return scope;
  }
  function capture(browser: BrowserLocation): boolean {
    clear();
    const { pathname, search, hash } = browser.location;
    if (pathname !== COURSE_GIFT_CLAIM_PATH) return false;
    // Scrub before retaining anything; malformed/query tokens are never admitted.
    // Do not carry history.state: it could itself contain a prior secret URL.
    try {
      browser.history.replaceState(null, "", COURSE_GIFT_CLAIM_PATH);
    } catch {
      return false;
    }
    const incoming = giftClaimTokenFromFragment(hash);
    if (
      search !== "" ||
      incoming.length !== 64 ||
      hash !== `#token=${incoming}` ||
      !/^[a-f0-9]{64}$/.test(incoming)
    )
      return false;
    token = incoming;
    tokenScope = scope;
    expiresAt = now() + COURSE_GIFT_LINK_MEMORY_MS;
    return true;
  }
  function tokenForScope(expectedScope: string): string {
    if (!expectedScope || scope !== expectedScope) return "";
    if (!Number.isFinite(now()) || expiresAt <= now()) {
      clear();
      return "";
    }
    return token;
  }
  function rememberCheckout(attempt: string): boolean {
    if (!scope || !userId || !courseGiftAttemptId(attempt)) return false;
    pendingCheckout = JSON.stringify({
      version: 1,
      userId,
      attempt,
      expiresAt: now() + RECOVERY_MS
    });
    try {
      storage?.setItem(COURSE_GIFT_CHECKOUT_STORAGE_KEY, pendingCheckout);
    } catch {
      return false;
    } // Caller must disclose that reload recovery was not saved.
    return Boolean(storage);
  }
  function recoverCheckout(): string {
    if (!scope || !userId) return "";
    let raw = pendingCheckout;
    try {
      raw = storage?.getItem(COURSE_GIFT_CHECKOUT_STORAGE_KEY) || raw;
    } catch {
      /* Current instance may still recover the same opaque attempt. */
    }
    try {
      const record = JSON.parse(raw);
      return record.version === 1 &&
        record.userId === userId &&
        Number.isSafeInteger(record.expiresAt) &&
        record.expiresAt > now() &&
        record.expiresAt <= now() + RECOVERY_MS &&
        courseGiftAttemptId(record.attempt)
        ? record.attempt
        : "";
    } catch {
      return "";
    }
  }
  return Object.freeze({
    capture,
    observe,
    clear,
    rememberCheckout,
    recoverCheckout,
    recoverSale,
    rememberSale,
    clearSale,
    revision: () => revision,
    // Internal transport access only: never pass this value to UI or navigation.
    tokenForScope,
    dispose() {
      clear();
      scope = "";
      userId = "";
      pendingCheckout = "";
      saleMemory.clear();
    }
  });
}
