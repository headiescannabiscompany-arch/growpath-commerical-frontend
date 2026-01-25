import * as SecureStore from "expo-secure-store";
import { setTokenGetter } from "../api/client";

const KEY = "gp_token";

export async function setToken(token: string | null) {
  if (!token) {
    await SecureStore.deleteItemAsync(KEY);
    return;
  }
  await SecureStore.setItemAsync(KEY, token);
}

export async function getToken() {
  return SecureStore.getItemAsync(KEY);
}

// Wire token getter for api client (call once on import)
setTokenGetter(() => getToken());
