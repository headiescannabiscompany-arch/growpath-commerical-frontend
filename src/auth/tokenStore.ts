import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

const KEY = "auth_token_v1";

function normalizeToken(t: any): string | null {
  if (!t) return null;
  const s = String(t);
  const raw = s.startsWith("Bearer ") ? s.slice("Bearer ".length) : s;
  const out = raw.trim();
  return out ? out : null;
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
    return;
  }

  if (!t) await SecureStore.deleteItemAsync(KEY);
  else await SecureStore.setItemAsync(KEY, t);
}

export async function clearToken(): Promise<void> {
  await setToken(null);
}
