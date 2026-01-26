import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const KEY = "gp_token";

export async function setToken(token: string | null) {
  if (Platform.OS === "web") {
    if (!token) {
      localStorage.removeItem(KEY);
      return;
    }
    localStorage.setItem(KEY, token);
    return;
  }

  if (!token) {
    await SecureStore.deleteItemAsync(KEY);
    return;
  }

  await SecureStore.setItemAsync(KEY, token);
}

export async function getToken() {
  if (Platform.OS === "web") {
    return localStorage.getItem(KEY);
  }
  return SecureStore.getItemAsync(KEY);
}
