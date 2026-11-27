import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { uuid } from "expo-modules-core";

const validKey = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function journalSaveKey() {
  return globalThis.crypto?.randomUUID?.() || uuid.v4();
}

export function journalReceiptScope(accountId: string | undefined, growId: string) {
  return accountId && growId
    ? `personal-journal-save-v1:${JSON.stringify([accountId, growId])}`
    : null;
}

// Store only an opaque reference. A grower's notes and photos stay out of device storage.
// Web scopes this to a tab. A newly opened tab can deliberately start its own entry.
export async function readJournalReceipt(scope: string | null): Promise<string | null> {
  if (!scope) return null;
  try {
    const found =
      Platform.OS !== "web" || typeof window === "undefined"
        ? await AsyncStorage.getItem(scope)
        : window.sessionStorage.getItem(scope);
    return found && validKey.test(found) ? found : null;
  } catch {
    return null;
  }
}

export async function writeJournalReceipt(scope: string | null, key: string) {
  if (!scope) return;
  try {
    if (Platform.OS !== "web" || typeof window === "undefined")
      await AsyncStorage.setItem(scope, key);
    else window.sessionStorage.setItem(scope, key);
  } catch {
    /* The mounted form retains its reference if storage is unavailable. */
  }
}

export async function clearJournalReceipt(scope: string | null, key: string) {
  if (!scope || (await readJournalReceipt(scope)) !== key) return;
  try {
    if (Platform.OS !== "web" || typeof window === "undefined")
      await AsyncStorage.removeItem(scope);
    else window.sessionStorage.removeItem(scope);
  } catch {
    /* Reopening safely checks the same reference. */
  }
}
