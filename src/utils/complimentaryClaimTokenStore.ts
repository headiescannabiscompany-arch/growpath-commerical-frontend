import AsyncStorage from "@react-native-async-storage/async-storage";

export const COMPLIMENTARY_CLAIM_PATH = "/claim-complimentary-access";
export const COMPLIMENTARY_CLAIM_TOKEN_STORAGE_KEY = "complimentary_claim_token_v1";
export const COMPLIMENTARY_CLAIM_CONTINUATION_STORAGE_KEY =
  "complimentary_claim_continuation_v1";
export const COMPLIMENTARY_CLAIM_CONTINUATION_TTL_MS = 60 * 60 * 1000;
const MAX_TOKEN_LENGTH = 512;
let memoryToken = "";

type ContinuationRecord = {
  version: 1;
  token: string;
  expiresAt: number;
};

export function normalizeComplimentaryClaimToken(value: unknown): string {
  const token = Array.isArray(value) ? (value.length === 1 ? value[0] : "") : value;
  const normalized = typeof token === "string" ? token.trim() : "";
  return normalized &&
    normalized.length <= MAX_TOKEN_LENGTH &&
    /^[A-Za-z0-9._~-]+$/.test(normalized)
    ? normalized
    : "";
}

function browserStorage(kind: "localStorage" | "sessionStorage"): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window[kind] || null;
  } catch {
    return null;
  }
}

function readContinuationRecord(
  storage: Storage | null,
  { consume = false, now = Date.now() }: { consume?: boolean; now?: number } = {}
) {
  if (!storage) return "";
  let raw = "";
  try {
    raw = storage.getItem(COMPLIMENTARY_CLAIM_CONTINUATION_STORAGE_KEY) || "";
    if (!raw) return "";
    const parsed = JSON.parse(raw) as Partial<ContinuationRecord>;
    const token = normalizeComplimentaryClaimToken(parsed.token);
    const expiresAt = Number(parsed.expiresAt);
    const valid =
      parsed.version === 1 && token && Number.isSafeInteger(expiresAt) && expiresAt > now;
    if (consume || !valid) {
      storage.removeItem(COMPLIMENTARY_CLAIM_CONTINUATION_STORAGE_KEY);
    }
    return valid ? token : "";
  } catch {
    try {
      storage.removeItem(COMPLIMENTARY_CLAIM_CONTINUATION_STORAGE_KEY);
    } catch {
      // Invalid continuation state remains unusable even if cleanup is unavailable.
    }
    return "";
  }
}

export function browserComplimentaryClaimToken(): string {
  if (typeof window === "undefined") return "";
  const body = String(window.location.hash || "")
    .trim()
    .replace(/^#\??/, "");
  const params = new URLSearchParams(body);
  const entries = Array.from(params.entries());
  return entries.length === 1 && entries[0][0] === "token"
    ? normalizeComplimentaryClaimToken(entries[0][1])
    : "";
}

export function scrubComplimentaryClaimTokenFromUrl(): void {
  if (typeof window === "undefined" || !window.history?.replaceState) return;
  const params = new URLSearchParams(window.location.search);
  const hadQueryToken = params.has("token");
  params.delete("token");
  const fragment = new URLSearchParams(
    String(window.location.hash || "")
      .trim()
      .replace(/^#\??/, "")
  );
  const hadFragmentToken = fragment.has("token");
  fragment.delete("token");
  if (!hadQueryToken && !hadFragmentToken) return;
  const search = params.toString();
  const hash = fragment.toString();
  window.history.replaceState(
    window.history.state ?? null,
    "",
    `${window.location.pathname}${search ? `?${search}` : ""}${hash ? `#${hash}` : ""}`
  );
}

export async function writeComplimentaryClaimToken(value: unknown) {
  const token = normalizeComplimentaryClaimToken(value);
  if (!token) return false;
  memoryToken = token;
  if (typeof window !== "undefined") {
    try {
      browserStorage("sessionStorage")?.setItem(
        COMPLIMENTARY_CLAIM_TOKEN_STORAGE_KEY,
        token
      );
    } catch {
      // The current page still has the captured token in memory.
    }
    try {
      const continuation: ContinuationRecord = {
        version: 1,
        token,
        expiresAt: Date.now() + COMPLIMENTARY_CLAIM_CONTINUATION_TTL_MS
      };
      browserStorage("localStorage")?.setItem(
        COMPLIMENTARY_CLAIM_CONTINUATION_STORAGE_KEY,
        JSON.stringify(continuation)
      );
    } catch {
      // Cross-tab continuation is best effort; the original email remains the fallback.
    }
  } else {
    try {
      await AsyncStorage.setItem(COMPLIMENTARY_CLAIM_TOKEN_STORAGE_KEY, token);
    } catch {
      // The in-memory value keeps the current native claim navigation usable.
    }
  }
  return true;
}

export async function readComplimentaryClaimToken() {
  if (typeof window !== "undefined") {
    const sessionStorage = browserStorage("sessionStorage");
    try {
      const sessionToken = normalizeComplimentaryClaimToken(
        sessionStorage?.getItem(COMPLIMENTARY_CLAIM_TOKEN_STORAGE_KEY)
      );
      if (sessionToken) return sessionToken;
      sessionStorage?.removeItem(COMPLIMENTARY_CLAIM_TOKEN_STORAGE_KEY);
    } catch {
      // Try the one-time cross-tab continuation below.
    }

    const continuationToken = readContinuationRecord(browserStorage("localStorage"), {
      consume: true
    });
    if (!continuationToken) return "";
    memoryToken = continuationToken;
    try {
      sessionStorage?.setItem(COMPLIMENTARY_CLAIM_TOKEN_STORAGE_KEY, continuationToken);
    } catch {
      // The current page still holds the consumed token in memory.
    }
    return continuationToken;
  }

  try {
    const stored = await AsyncStorage.getItem(COMPLIMENTARY_CLAIM_TOKEN_STORAGE_KEY);
    return normalizeComplimentaryClaimToken(stored || memoryToken);
  } catch {
    return normalizeComplimentaryClaimToken(memoryToken);
  }
}

export function hasPendingComplimentaryClaimContinuation() {
  if (typeof window === "undefined") return false;
  return Boolean(readContinuationRecord(browserStorage("localStorage")));
}

export async function clearComplimentaryClaimToken() {
  memoryToken = "";
  if (typeof window !== "undefined") {
    try {
      browserStorage("sessionStorage")?.removeItem(COMPLIMENTARY_CLAIM_TOKEN_STORAGE_KEY);
    } catch {
      // Cleanup remains best effort after clearing memory.
    }
    try {
      browserStorage("localStorage")?.removeItem(
        COMPLIMENTARY_CLAIM_CONTINUATION_STORAGE_KEY
      );
    } catch {
      // Cleanup remains best effort after clearing memory.
    }
  } else {
    try {
      await AsyncStorage.removeItem(COMPLIMENTARY_CLAIM_TOKEN_STORAGE_KEY);
    } catch {
      // Cleanup remains best effort after clearing memory.
    }
  }
}
