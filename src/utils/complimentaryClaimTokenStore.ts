import AsyncStorage from "@react-native-async-storage/async-storage";

export const COMPLIMENTARY_CLAIM_PATH = "/claim-complimentary-access";
export const COMPLIMENTARY_CLAIM_TOKEN_STORAGE_KEY = "complimentary_claim_token_v1";
const MAX_TOKEN_LENGTH = 512;
let memoryToken = "";

export function normalizeComplimentaryClaimToken(value: unknown): string {
  const token = Array.isArray(value) ? value[0] : value;
  const normalized = typeof token === "string" ? token.trim() : "";
  return normalized &&
    normalized.length <= MAX_TOKEN_LENGTH &&
    !/[\s&#?]/.test(normalized)
    ? normalized
    : "";
}

function browserStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage || null;
  } catch {
    return null;
  }
}

export function browserComplimentaryClaimToken(): string {
  if (typeof window === "undefined") return "";
  const body = String(window.location.hash || "")
    .trim()
    .replace(/^#\??/, "");
  const params = new URLSearchParams(body);
  return params.size === 1 ? normalizeComplimentaryClaimToken(params.get("token")) : "";
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
  try {
    const storage = browserStorage();
    if (typeof window !== "undefined") {
      storage?.setItem(COMPLIMENTARY_CLAIM_TOKEN_STORAGE_KEY, token);
    } else {
      await AsyncStorage.setItem(COMPLIMENTARY_CLAIM_TOKEN_STORAGE_KEY, token);
    }
  } catch {
    // The in-memory value keeps the current claim navigation usable.
  }
  return true;
}

export async function readComplimentaryClaimToken() {
  try {
    const storage = browserStorage();
    const stored =
      typeof window !== "undefined"
        ? storage?.getItem(COMPLIMENTARY_CLAIM_TOKEN_STORAGE_KEY)
        : await AsyncStorage.getItem(COMPLIMENTARY_CLAIM_TOKEN_STORAGE_KEY);
    return normalizeComplimentaryClaimToken(stored || memoryToken);
  } catch {
    return normalizeComplimentaryClaimToken(memoryToken);
  }
}

export async function clearComplimentaryClaimToken() {
  memoryToken = "";
  try {
    const storage = browserStorage();
    if (typeof window !== "undefined") {
      storage?.removeItem(COMPLIMENTARY_CLAIM_TOKEN_STORAGE_KEY);
    } else {
      await AsyncStorage.removeItem(COMPLIMENTARY_CLAIM_TOKEN_STORAGE_KEY);
    }
  } catch {
    // Cleanup remains best effort after clearing memory.
  }
}
