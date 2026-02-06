import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "gp_token";

export async function setToken(token: string | null) {
  if (Platform.OS === "web") {
    // Web: use AsyncStorage instead of localStorage
    if (!token) {
      await AsyncStorage.removeItem(KEY);
      return;
    }
    await AsyncStorage.setItem(KEY, token);
    return;
  }

  // Native: use SecureStore
  if (!token) {
    await SecureStore.deleteItemAsync(KEY);
    return;
  }

  await SecureStore.setItemAsync(KEY, token);
}

export async function getToken() {
  if (Platform.OS === "web") {
    return AsyncStorage.getItem(KEY);
  }
  return SecureStore.getItemAsync(KEY);
}
