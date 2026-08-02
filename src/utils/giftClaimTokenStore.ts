import AsyncStorage from "@react-native-async-storage/async-storage";

import { normalizeGiftClaimToken } from "./claimReturnPath";

export const GIFT_CLAIM_TOKEN_STORAGE_KEY = "gift_claim_token_v1";

let memoryToken = "";

function isBrowserRuntime() {
  return typeof window !== "undefined";
}

function browserSessionStorage(): Storage | null {
  if (!isBrowserRuntime()) return null;
  try {
    return window.sessionStorage || null;
  } catch {
    return null;
  }
}

export async function readGiftClaimToken(): Promise<string> {
  const sessionStorage = browserSessionStorage();
  try {
    const stored = isBrowserRuntime()
      ? sessionStorage?.getItem(GIFT_CLAIM_TOKEN_STORAGE_KEY)
      : await AsyncStorage.getItem(GIFT_CLAIM_TOKEN_STORAGE_KEY);
    const token = normalizeGiftClaimToken(stored || memoryToken);
    if (token) {
      memoryToken = token;
      return token;
    }
  } catch {
    return normalizeGiftClaimToken(memoryToken);
  }

  await clearGiftClaimToken();
  return "";
}

export async function writeGiftClaimToken(value: unknown): Promise<boolean> {
  const token = normalizeGiftClaimToken(value);
  if (!token) {
    await clearGiftClaimToken();
    return false;
  }

  memoryToken = token;
  try {
    const sessionStorage = browserSessionStorage();
    if (isBrowserRuntime()) {
      sessionStorage?.setItem(GIFT_CLAIM_TOKEN_STORAGE_KEY, token);
    } else {
      await AsyncStorage.setItem(GIFT_CLAIM_TOKEN_STORAGE_KEY, token);
    }
    return true;
  } catch {
    // The in-memory copy still supports navigation within the current app session.
    return true;
  }
}

export async function clearGiftClaimToken(): Promise<void> {
  memoryToken = "";
  try {
    const sessionStorage = browserSessionStorage();
    if (isBrowserRuntime()) {
      sessionStorage?.removeItem(GIFT_CLAIM_TOKEN_STORAGE_KEY);
    } else {
      await AsyncStorage.removeItem(GIFT_CLAIM_TOKEN_STORAGE_KEY);
    }
  } catch {
    // Storage cleanup is best-effort after the in-memory value is cleared.
  }
}
