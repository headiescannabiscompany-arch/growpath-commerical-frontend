import {
  parsePublicProductReturnPath,
  parseShopperSignupReturnPath
} from "@/utils/authReturnPath";

// This key stores only the latest revision; immutable records use `key:revision`.
export const PRODUCT_SIGNUP_CONTINUATION_STORAGE_KEY =
  "shopper_product_signup_continuation_v1";
export const PRODUCT_SIGNUP_CONTINUATION_TTL_MS = 60 * 60 * 1000;

export type ShopperSignupContinuation = {
  version: 1;
  email: string;
  path: string;
  expiresAt: number;
  revision: string;
};

export type ProductSignupContinuation = ShopperSignupContinuation;

function browserStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage || null;
  } catch {
    return null;
  }
}

function normalizedEmail(value: unknown): string {
  if (typeof value !== "string") return "";
  const email = value.trim().toLowerCase();
  return email.length <= 254 &&
    /^[^\s@]+@[^\s@]+$/.test(email) &&
    !Array.from(email).some((character) => {
      const code = character.charCodeAt(0);
      return code <= 0x1f || code === 0x7f;
    })
    ? email
    : "";
}

function canonicalProductPath(value: unknown): string {
  const path = parsePublicProductReturnPath(value);
  return path && path === path.trim() ? path : "";
}

function validRecord(value: unknown, now: number): ShopperSignupContinuation | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Partial<ShopperSignupContinuation>;
  if (
    Object.keys(record).length !== 5 ||
    record.version !== 1 ||
    !record.email ||
    normalizedEmail(record.email) !== record.email ||
    !record.path ||
    parseShopperSignupReturnPath(record.path) !== record.path ||
    typeof record.expiresAt !== "number" ||
    !Number.isSafeInteger(record.expiresAt) ||
    record.expiresAt <= now ||
    record.expiresAt > now + PRODUCT_SIGNUP_CONTINUATION_TTL_MS ||
    typeof record.revision !== "string" ||
    !/^[a-f0-9]{32}$/.test(record.revision)
  ) {
    return null;
  }
  return {
    version: 1,
    email: record.email,
    path: record.path,
    expiresAt: record.expiresAt,
    revision: record.revision
  };
}

function storedRecord(raw: string | null, now: number) {
  return raw && raw.length <= 1024 ? validRecord(JSON.parse(raw), now) : null;
}

function storedRevision(value: string | null): string {
  return value && /^[a-f0-9]{32}$/.test(value) ? value : "";
}

function revisionKey(revision: string): string {
  return `${PRODUCT_SIGNUP_CONTINUATION_STORAGE_KEY}:${revision}`;
}

export function rememberShopperSignupContinuation(
  email: unknown,
  path: unknown
): boolean {
  const storage = browserStorage();
  const safeEmail = normalizedEmail(email);
  const safePath = parseShopperSignupReturnPath(path);
  if (!storage || !safeEmail || !safePath) return false;
  let createdKey = "";
  try {
    const previousRevision = storedRevision(
      storage.getItem(PRODUCT_SIGNUP_CONTINUATION_STORAGE_KEY)
    );
    // A revision is a correlation identifier, never an auth or verification token.
    const random = new Uint32Array(4);
    window.crypto.getRandomValues(random);
    const record: ShopperSignupContinuation = {
      version: 1,
      email: safeEmail,
      path: safePath,
      expiresAt: Date.now() + PRODUCT_SIGNUP_CONTINUATION_TTL_MS,
      revision: Array.from(random, (part) => part.toString(16).padStart(8, "0")).join("")
    };
    const nextKey = revisionKey(record.revision);
    // Even an unexpected random collision must not overwrite an immutable record.
    if (storage.getItem(nextKey) !== null) return false;
    createdKey = nextKey;
    storage.setItem(nextKey, JSON.stringify(record));
    storage.setItem(PRODUCT_SIGNUP_CONTINUATION_STORAGE_KEY, record.revision);
    createdKey = "";
    if (previousRevision && previousRevision !== record.revision) {
      try {
        // Bound ordinary replacement storage without touching a newer pointer/record.
        storage.removeItem(revisionKey(previousRevision));
      } catch {
        // A cleanup denial must not undo a successfully published continuation.
      }
    }
    return true;
  } catch {
    if (createdKey) {
      try {
        // Pointer publication failed: remove only the record owned by this attempt.
        storage.removeItem(createdKey);
      } catch {
        // Storage denial may prevent cleanup; never clear another revision/pointer.
      }
    }
    // Signup stays successful if browser persistence or randomness is unavailable.
    return false;
  }
}

export function readShopperSignupContinuation(
  email: unknown
): ShopperSignupContinuation | null {
  const storage = browserStorage();
  const safeEmail = normalizedEmail(email);
  if (!storage || !safeEmail) return null;
  try {
    const revision = storedRevision(
      storage.getItem(PRODUCT_SIGNUP_CONTINUATION_STORAGE_KEY)
    );
    if (!revision) return null;
    const record = storedRecord(storage.getItem(revisionKey(revision)), Date.now());
    return record?.email === safeEmail &&
      record.revision === revision &&
      storage.getItem(PRODUCT_SIGNUP_CONTINUATION_STORAGE_KEY) === revision
      ? record
      : null;
  } catch {
    // Invalid, expired or unreadable records are unusable, not a reason to erase data.
    return null;
  }
}

export function consumeShopperSignupContinuation(
  snapshot: ShopperSignupContinuation
): boolean {
  const storage = browserStorage();
  if (!storage) return false;
  try {
    const now = Date.now();
    const expected = validRecord(snapshot, now);
    if (
      !expected ||
      storage.getItem(PRODUCT_SIGNUP_CONTINUATION_STORAGE_KEY) !== expected.revision
    ) {
      return false;
    }
    const key = revisionKey(expected.revision);
    const current = storedRecord(storage.getItem(key), now);
    if (
      !current ||
      current.version !== expected.version ||
      current.email !== expected.email ||
      current.path !== expected.path ||
      current.expiresAt !== expected.expiresAt ||
      current.revision !== expected.revision ||
      storage.getItem(PRODUCT_SIGNUP_CONTINUATION_STORAGE_KEY) !== expected.revision
    ) {
      return false;
    }
    // A concurrent remember can change the pointer, but this deletes only our record.
    // The dangling consumed pointer is harmless; this is not an atomic claim lock.
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

// Legacy product-only callers must never adopt or mutate a course continuation.
export function rememberProductSignupContinuation(
  email: unknown,
  path: unknown
): boolean {
  return !!canonicalProductPath(path) && rememberShopperSignupContinuation(email, path);
}

export function readProductSignupContinuation(
  email: unknown
): ProductSignupContinuation | null {
  const record = readShopperSignupContinuation(email);
  return record && canonicalProductPath(record.path) ? record : null;
}

export function consumeProductSignupContinuation(
  snapshot: ProductSignupContinuation
): boolean {
  try {
    return (
      !!canonicalProductPath(snapshot?.path) && consumeShopperSignupContinuation(snapshot)
    );
  } catch {
    return false;
  }
}
