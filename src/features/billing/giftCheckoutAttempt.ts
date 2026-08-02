import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useRef } from "react";

export const GIFT_CHECKOUT_ATTEMPT_STORAGE_KEY = "growpath_gift_checkout_attempt_v1";

const CLOSED_GIFT_CHECKOUT_CODES = new Set([
  "GIFT_CHECKOUT_ATTEMPT_CLOSED",
  "GIFT_CHECKOUT_ATTEMPT_EXPIRED",
  "GIFT_CHECKOUT_PROVIDER_REJECTED"
]);

export type GiftCheckoutFingerprintInput = {
  plan: string;
  interval: string;
  recipientEmail: string;
  recipientName?: string;
  message?: string;
  successUrl?: string;
  cancelUrl?: string;
};

type StoredGiftCheckoutAttempt = {
  version: 1;
  fingerprintHash: string;
  checkoutAttemptId: string;
};

type MemoryGiftCheckoutAttempt = StoredGiftCheckoutAttempt & {
  canonicalFingerprint: string;
};

export type GiftCheckoutRunResult<T> =
  | { started: false }
  | { started: true; checkoutAttemptId: string; value: T };

type RunGiftCheckout = <T>(
  input: GiftCheckoutFingerprintInput,
  operation: (checkoutAttemptId: string) => Promise<T>
) => Promise<GiftCheckoutRunResult<T>>;

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
    const parsed = JSON.parse(value) as Partial<StoredGiftCheckoutAttempt>;
    if (
      parsed.version !== 1 ||
      !/^[0-9a-f]{32}$/i.test(String(parsed.fingerprintHash || "")) ||
      !isUuidV4(parsed.checkoutAttemptId)
    ) {
      return null;
    }
    return {
      version: 1,
      fingerprintHash: String(parsed.fingerprintHash).toLowerCase(),
      checkoutAttemptId: parsed.checkoutAttemptId.toLowerCase()
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

async function writeStoredAttempt(attempt: StoredGiftCheckoutAttempt): Promise<void> {
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
  attempt: StoredGiftCheckoutAttempt
): Promise<void> {
  await writeStoredAttempt(attempt);
  const verified = await readStoredAttempt();
  if (
    !verified ||
    verified.version !== attempt.version ||
    verified.fingerprintHash !== attempt.fingerprintHash ||
    verified.checkoutAttemptId !== attempt.checkoutAttemptId
  ) {
    throw checkoutAttemptStorageError(
      "Secure checkout retry storage could not be verified. No checkout was created."
    );
  }
}

export async function getOrCreateGiftCheckoutAttemptId(
  input: GiftCheckoutFingerprintInput
): Promise<string> {
  const canonicalFingerprint = canonicalizeGiftCheckoutFingerprint(input);
  const fingerprintHash = hashCanonicalFingerprint(canonicalFingerprint);

  if (memoryAttempt?.canonicalFingerprint === canonicalFingerprint) {
    await persistGiftCheckoutAttempt({
      version: memoryAttempt.version,
      fingerprintHash: memoryAttempt.fingerprintHash,
      checkoutAttemptId: memoryAttempt.checkoutAttemptId
    });
    return memoryAttempt.checkoutAttemptId;
  }

  if (!memoryAttempt) {
    const stored = await readStoredAttempt();
    if (stored?.fingerprintHash === fingerprintHash) {
      memoryAttempt = { ...stored, canonicalFingerprint };
      return stored.checkoutAttemptId;
    }
  }

  const next: MemoryGiftCheckoutAttempt = {
    version: 1,
    fingerprintHash,
    checkoutAttemptId: createCheckoutAttemptId(),
    canonicalFingerprint
  };
  await persistGiftCheckoutAttempt({
    version: next.version,
    fingerprintHash: next.fingerprintHash,
    checkoutAttemptId: next.checkoutAttemptId
  });
  memoryAttempt = next;
  return next.checkoutAttemptId;
}

export async function clearGiftCheckoutAttempt(): Promise<void> {
  memoryAttempt = null;
  try {
    const sessionStorage = browserSessionStorage();
    if (typeof window !== "undefined") {
      sessionStorage?.removeItem(GIFT_CHECKOUT_ATTEMPT_STORAGE_KEY);
      return;
    }
    await AsyncStorage.removeItem(GIFT_CHECKOUT_ATTEMPT_STORAGE_KEY);
  } catch {
    // Checkout-attempt cleanup is best-effort.
  }
}

export async function clearClosedGiftCheckoutAttempt(error: unknown): Promise<boolean> {
  const code = String((error as any)?.code || "");
  if (!CLOSED_GIFT_CHECKOUT_CODES.has(code)) return false;
  await clearGiftCheckoutAttempt();
  return true;
}

export function useGiftCheckoutAttempt(): { runGiftCheckout: RunGiftCheckout } {
  const inFlightRef = useRef(false);

  const runGiftCheckout: RunGiftCheckout = useCallback(async (input, operation) => {
    if (inFlightRef.current) return { started: false };
    inFlightRef.current = true;

    try {
      const checkoutAttemptId = await getOrCreateGiftCheckoutAttemptId(input);
      const value = await operation(checkoutAttemptId);
      return { started: true, checkoutAttemptId, value };
    } finally {
      inFlightRef.current = false;
    }
  }, []);

  return { runGiftCheckout };
}
