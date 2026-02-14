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
      const v = await AsyncStorage.getItem(KEY);
      return normalizeToken(v);
    }
    const v = await SecureStore.getItemAsync(KEY);
    return normalizeToken(v);
  } catch {
    return null;
  }
}

export async function setToken(token: string | null): Promise<void> {
  const t = normalizeToken(token);

  try {
    if (Platform.OS === "web") {
      if (!t) await AsyncStorage.removeItem(KEY);
      else await AsyncStorage.setItem(KEY, t);
      return;
    }

    if (!t) await SecureStore.deleteItemAsync(KEY);
    else await SecureStore.setItemAsync(KEY, t);
  } catch {
    // ignore
  }
}

export async function clearToken(): Promise<void> {
  await setToken(null);
}
