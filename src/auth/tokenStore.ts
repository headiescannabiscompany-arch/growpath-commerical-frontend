import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

const KEY = "auth_token_v1";
const localTokenListeners = new Set<(token: string | null) => void>();

function normalizeToken(t: any): string | null {
  if (!t) return null;
  const s = String(t);
  const raw = s.startsWith("Bearer ") ? s.slice("Bearer ".length) : s;
  const out = raw.trim();
  return out ? out : null;
}

/** Observe another tab's session changes without deleting its current token. */
export function subscribeToExternalTokenChanges(onChange: () => void): () => void {
  if (Platform.OS !== "web" || typeof window === "undefined") return () => {};

  let storage: Storage;
  let expectedToken: string | null;
  try {
    storage = window.localStorage;
    expectedToken = normalizeToken(storage.getItem(KEY));
  } catch {
    return () => {};
  }

  let changed = false;
  const check = () => {
    if (changed) return;
    let currentToken: string | null;
    try {
      currentToken = normalizeToken(storage.getItem(KEY));
    } catch {
      // Unavailable storage is not evidence of a logout.
      return;
    }
    if (currentToken === expectedToken) return;
    changed = true;
    onChange();
  };
  const onStorage = (event: StorageEvent) => {
    if (event.storageArea !== storage || (event.key !== null && event.key !== KEY)) {
      return;
    }
    // Read current storage: queued events can describe an intermediate login write.
    check();
  };
  const onVisibility = () => {
    if (window.document.visibilityState === "visible") check();
  };
  const onLocalToken = (token: string | null) => {
    expectedToken = token;
  };

  localTokenListeners.add(onLocalToken);
  window.addEventListener("storage", onStorage);
  window.addEventListener("focus", check);
  window.addEventListener("pageshow", check);
  window.document.addEventListener("visibilitychange", onVisibility);
  return () => {
    changed = true;
    localTokenListeners.delete(onLocalToken);
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("focus", check);
    window.removeEventListener("pageshow", check);
    window.document.removeEventListener("visibilitychange", onVisibility);
  };
}

export async function getToken(): Promise<string | null> {
  try {
    if (Platform.OS === "web") {
      const webToken = await AsyncStorage.getItem(KEY);
      const fallbackToken =
        typeof globalThis?.localStorage?.getItem === "function"
          ? globalThis.localStorage.getItem(KEY)
          : null;
      return normalizeToken(webToken || fallbackToken);
    }
    const nativeToken = await SecureStore.getItemAsync(KEY);
    return normalizeToken(nativeToken);
  } catch {
    return null;
  }
}

export async function setToken(token: string | null): Promise<void> {
  const t = normalizeToken(token);

  if (Platform.OS === "web") {
    if (!t) await AsyncStorage.removeItem(KEY);
    else await AsyncStorage.setItem(KEY, t);
    try {
      if (!t) {
        globalThis?.localStorage?.removeItem?.(KEY);
        globalThis?.sessionStorage?.removeItem?.(KEY);
      } else {
        globalThis?.localStorage?.setItem?.(KEY, t);
      }
    } catch {
      // Browser storage can be unavailable in privacy modes.
    }
    // Same-tab login/logout already updates AuthProvider; only other tabs reload.
    for (const listener of localTokenListeners) listener(t);
    return;
  }

  if (!t) await SecureStore.deleteItemAsync(KEY);
  else await SecureStore.setItemAsync(KEY, t);
}

export async function clearToken(): Promise<void> {
  await setToken(null);
}
