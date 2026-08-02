import AsyncStorage from "@react-native-async-storage/async-storage";

export const GIFT_CHECKOUT_ATTEMPT_STORAGE_KEY = "growpath_gift_checkout_attempt_v1";

export type GiftCheckoutAttemptPhase = "quote_only" | "checkout_requested";

export type GiftCheckoutFingerprintInput = {
  plan: string;
  interval: string;
  recipientEmail: string;
  recipientName?: string;
  message?: string;
  successUrl?: string;
  cancelUrl?: string;
};

export type GiftCheckoutAttemptSummary = {
  checkoutAttemptId: string;
  phase: GiftCheckoutAttemptPhase;
  legacyVersion: boolean;
};

type StoredGiftCheckoutAttemptV2 = {
  version: 2;
  fingerprintHash: string;
  checkoutAttemptId: string;
  phase: GiftCheckoutAttemptPhase;
};

type StoredGiftCheckoutAttempt = StoredGiftCheckoutAttemptV2 & {
  legacyVersion: boolean;
};

type MemoryGiftCheckoutAttempt = StoredGiftCheckoutAttempt & {
  canonicalFingerprint: string | null;
};

let memoryAttempt: MemoryGiftCheckoutAttempt | null = null;

function browserSessionStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage || null;
  } catch {
    return null;
  }
}

function normalizeReturnUrl(value: unknown): string {
  const normalized = String(value || "").trim();
  if (!normalized) return "";

  try {
    return new URL(normalized).toString();
  } catch {
    return normalized;
  }
}

export function canonicalizeGiftCheckoutFingerprint(
  input: GiftCheckoutFingerprintInput
): string {
  return JSON.stringify({
    plan: String(input.plan || "pro")
      .trim()
      .toLowerCase(),
    interval: String(input.interval || "monthly")
      .trim()
      .toLowerCase(),
    recipientEmail: String(input.recipientEmail || "")
      .trim()
      .toLowerCase(),
    recipientName: String(input.recipientName || "").trim(),
    message: String(input.message || "").trim(),
    successUrl: normalizeReturnUrl(input.successUrl),
    cancelUrl: normalizeReturnUrl(input.cancelUrl)
  });
}

function hashCanonicalFingerprint(value: string): string {
  const seeds = [0x811c9dc5, 0x9e3779b9, 0x85ebca6b, 0xc2b2ae35];

  return seeds
    .map((seed) => {
      let hash = seed;
      for (let index = 0; index < value.length; index += 1) {
        hash = Math.imul(hash ^ value.charCodeAt(index), 0x01000193);
        hash ^= hash >>> 13;
      }
      hash = Math.imul(hash ^ (hash >>> 16), 0x85ebca6b);
      return (hash >>> 0).toString(16).padStart(8, "0");
    })
    .join("");
}

function isUuidV4(value: unknown): value is string {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || "")
  );
}

function createCheckoutAttemptId(): string {
  const cryptoObject = (globalThis as any)?.crypto;
  if (typeof cryptoObject?.randomUUID === "function") {
    try {
      const generated = cryptoObject.randomUUID();
      if (isUuidV4(generated)) return generated.toLowerCase();
    } catch {
      // Fall through to random bytes when this runtime exposes but blocks randomUUID.
    }
  }

  const bytes = new Uint8Array(16);
  if (typeof cryptoObject?.getRandomValues === "function") {
    try {
      cryptoObject.getRandomValues(bytes);
    } catch {
      fillFallbackRandomBytes(bytes);
    }
  } else {
    fillFallbackRandomBytes(bytes);
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10, 16).join("")
  ].join("-");
}

function fillFallbackRandomBytes(bytes: Uint8Array): void {
  let timestamp = Date.now();
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Math.floor(Math.random() * 256) ^ (timestamp & 0xff);
    timestamp = Math.floor(timestamp / 256);
  }
}

function parseStoredAttempt(value: string | null): StoredGiftCheckoutAttempt | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    if (
      ![1, 2].includes(Number(parsed.version)) ||
      !/^[0-9a-f]{32}$/i.test(String(parsed.fingerprintHash || "")) ||
      !isUuidV4(parsed.checkoutAttemptId)
    ) {
      return null;
    }

    if (
      Number(parsed.version) === 2 &&
      !["quote_only", "checkout_requested"].includes(String(parsed.phase || ""))
    ) {
      return null;
    }

    return {
      version: 2,
      fingerprintHash: String(parsed.fingerprintHash).toLowerCase(),
      checkoutAttemptId: String(parsed.checkoutAttemptId).toLowerCase(),
      phase:
        Number(parsed.version) === 1
          ? "checkout_requested"
          : (parsed.phase as GiftCheckoutAttemptPhase),
      legacyVersion: Number(parsed.version) === 1
    };
  } catch {
    return null;
  }
}

function checkoutAttemptStorageError(
  message: string,
  code = "GIFT_CHECKOUT_ATTEMPT_STORAGE_UNAVAILABLE"
): Error & { code: string } {
  return Object.assign(new Error(message), { code });
}

function checkoutAttemptReconcileError(): Error & { code: string } {
  return checkoutAttemptStorageError(
    "A gift checkout may already exist for this browser session. Reconcile it before reviewing another gift price.",
    "GIFT_CHECKOUT_ATTEMPT_RECONCILE_REQUIRED"
  );
}

async function readStoredAttempt(): Promise<StoredGiftCheckoutAttempt | null> {
  let value: string | null;
  try {
    if (typeof window !== "undefined") {
      const sessionStorage = browserSessionStorage();
      if (!sessionStorage) {
        throw checkoutAttemptStorageError(
          "Secure checkout retry storage is unavailable in this browser. No checkout was created."
        );
      }
      value = sessionStorage.getItem(GIFT_CHECKOUT_ATTEMPT_STORAGE_KEY);
    } else {
      value = await AsyncStorage.getItem(GIFT_CHECKOUT_ATTEMPT_STORAGE_KEY);
    }
  } catch (error) {
    if ((error as any)?.code === "GIFT_CHECKOUT_ATTEMPT_STORAGE_UNAVAILABLE") {
      throw error;
    }
    throw checkoutAttemptStorageError(
      "Secure checkout retry storage could not be read. No checkout was created."
    );
  }

  const parsed = parseStoredAttempt(value);
  if (value && !parsed) {
    throw checkoutAttemptStorageError(
      "Secure checkout retry storage is invalid. Review Sent Gifts before trying again.",
      "GIFT_CHECKOUT_ATTEMPT_STORAGE_INVALID"
    );
  }
  return parsed;
}

async function writeStoredAttempt(attempt: StoredGiftCheckoutAttemptV2): Promise<void> {
  const value = JSON.stringify(attempt);
  try {
    if (typeof window !== "undefined") {
      const sessionStorage = browserSessionStorage();
      if (!sessionStorage) {
        throw checkoutAttemptStorageError(
          "Secure checkout retry storage is unavailable in this browser. No checkout was created."
        );
      }
      sessionStorage.setItem(GIFT_CHECKOUT_ATTEMPT_STORAGE_KEY, value);
      return;
    }
    await AsyncStorage.setItem(GIFT_CHECKOUT_ATTEMPT_STORAGE_KEY, value);
  } catch (error) {
    if ((error as any)?.code === "GIFT_CHECKOUT_ATTEMPT_STORAGE_UNAVAILABLE") {
      throw error;
    }
    throw checkoutAttemptStorageError(
      "Secure checkout retry storage could not be written. No checkout was created."
    );
  }
}

async function persistGiftCheckoutAttempt(
  attempt: StoredGiftCheckoutAttemptV2
): Promise<StoredGiftCheckoutAttempt> {
  await writeStoredAttempt(attempt);
  const verified = await readStoredAttempt();
  if (
    !verified ||
    verified.legacyVersion ||
    verified.fingerprintHash !== attempt.fingerprintHash ||
    verified.checkoutAttemptId !== attempt.checkoutAttemptId ||
    verified.phase !== attempt.phase
  ) {
    throw checkoutAttemptStorageError(
      "Secure checkout retry storage could not be verified. No checkout was created."
    );
  }
  return verified;
}

function memoryValue(
  attempt: StoredGiftCheckoutAttempt,
  canonicalFingerprint: string | null
): MemoryGiftCheckoutAttempt {
  return { ...attempt, canonicalFingerprint };
}

export async function prepareGiftCheckoutQuoteAttempt(
  input: GiftCheckoutFingerprintInput
): Promise<GiftCheckoutAttemptSummary> {
  const canonicalFingerprint = canonicalizeGiftCheckoutFingerprint(input);
  const fingerprintHash = hashCanonicalFingerprint(canonicalFingerprint);
  const stored = await readStoredAttempt();

  if (stored?.phase === "checkout_requested") {
    memoryAttempt = memoryValue(
      stored,
      stored.fingerprintHash === fingerprintHash ? canonicalFingerprint : null
    );
    throw checkoutAttemptReconcileError();
  }

  if (stored?.phase === "quote_only" && stored.fingerprintHash === fingerprintHash) {
    memoryAttempt = memoryValue(stored, canonicalFingerprint);
    return {
      checkoutAttemptId: stored.checkoutAttemptId,
      phase: stored.phase,
      legacyVersion: false
    };
  }

  if (!stored && memoryAttempt?.phase === "checkout_requested") {
    throw checkoutAttemptReconcileError();
  }

  const checkoutAttemptId =
    !stored &&
    memoryAttempt?.phase === "quote_only" &&
    memoryAttempt.canonicalFingerprint === canonicalFingerprint
      ? memoryAttempt.checkoutAttemptId
      : createCheckoutAttemptId();
  const persisted = await persistGiftCheckoutAttempt({
    version: 2,
    fingerprintHash,
    checkoutAttemptId,
    phase: "quote_only"
  });
  memoryAttempt = memoryValue(persisted, canonicalFingerprint);
  return { checkoutAttemptId, phase: "quote_only", legacyVersion: false };
}

export async function markGiftCheckoutRequested(
  input: GiftCheckoutFingerprintInput,
  checkoutAttemptId: string
): Promise<GiftCheckoutAttemptSummary> {
  const canonicalFingerprint = canonicalizeGiftCheckoutFingerprint(input);
  const fingerprintHash = hashCanonicalFingerprint(canonicalFingerprint);
  const stored = await readStoredAttempt();

  if (
    !stored ||
    stored.legacyVersion ||
    stored.phase !== "quote_only" ||
    stored.checkoutAttemptId !== checkoutAttemptId ||
    stored.fingerprintHash !== fingerprintHash
  ) {
    throw checkoutAttemptReconcileError();
  }

  const persisted = await persistGiftCheckoutAttempt({
    version: 2,
    fingerprintHash,
    checkoutAttemptId,
    phase: "checkout_requested"
  });
  memoryAttempt = memoryValue(persisted, canonicalFingerprint);
  return {
    checkoutAttemptId,
    phase: "checkout_requested",
    legacyVersion: false
  };
}

export async function downgradeGiftCheckoutToQuoteOnly(
  input: GiftCheckoutFingerprintInput,
  checkoutAttemptId: string
): Promise<GiftCheckoutAttemptSummary> {
  const canonicalFingerprint = canonicalizeGiftCheckoutFingerprint(input);
  const fingerprintHash = hashCanonicalFingerprint(canonicalFingerprint);
  const stored = await readStoredAttempt();
  if (
    !stored ||
    stored.legacyVersion ||
    stored.phase !== "checkout_requested" ||
    stored.checkoutAttemptId !== checkoutAttemptId ||
    stored.fingerprintHash !== fingerprintHash
  ) {
    throw checkoutAttemptReconcileError();
  }

  const persisted = await persistGiftCheckoutAttempt({
    version: 2,
    fingerprintHash,
    checkoutAttemptId,
    phase: "quote_only"
  });
  memoryAttempt = memoryValue(persisted, canonicalFingerprint);
  return {
    checkoutAttemptId,
    phase: "quote_only",
    legacyVersion: false
  };
}

export async function getStoredGiftCheckoutAttempt(): Promise<GiftCheckoutAttemptSummary | null> {
  const stored = await readStoredAttempt();
  if (!stored) return null;
  memoryAttempt = memoryValue(stored, null);
  return {
    checkoutAttemptId: stored.checkoutAttemptId,
    phase: stored.phase,
    legacyVersion: stored.legacyVersion
  };
}

export async function clearGiftCheckoutAttemptWhenAllowed(
  canStartNewAttempt: boolean
): Promise<boolean> {
  if (canStartNewAttempt !== true) return false;
  try {
    if (typeof window !== "undefined") {
      const sessionStorage = browserSessionStorage();
      if (!sessionStorage) {
        throw checkoutAttemptStorageError(
          "Secure checkout retry storage is unavailable. The verified attempt was not cleared."
        );
      }
      sessionStorage.removeItem(GIFT_CHECKOUT_ATTEMPT_STORAGE_KEY);
      if (sessionStorage.getItem(GIFT_CHECKOUT_ATTEMPT_STORAGE_KEY) !== null) {
        throw checkoutAttemptStorageError(
          "Secure checkout retry storage could not be cleared."
        );
      }
    } else {
      await AsyncStorage.removeItem(GIFT_CHECKOUT_ATTEMPT_STORAGE_KEY);
      if ((await AsyncStorage.getItem(GIFT_CHECKOUT_ATTEMPT_STORAGE_KEY)) !== null) {
        throw checkoutAttemptStorageError(
          "Secure checkout retry storage could not be cleared."
        );
      }
    }
  } catch (error) {
    if ((error as any)?.code === "GIFT_CHECKOUT_ATTEMPT_STORAGE_UNAVAILABLE") {
      throw error;
    }
    throw checkoutAttemptStorageError(
      "Secure checkout retry storage could not be cleared."
    );
  }
  memoryAttempt = null;
  return true;
}
