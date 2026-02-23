import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "preferred_mode_v1";
const MODES = new Set(["personal", "commercial", "facility"]);

export type PreferredMode = "personal" | "commercial" | "facility";

export async function getPreferredMode(): Promise<PreferredMode | null> {
  try {
    const v = await AsyncStorage.getItem(KEY);
    if (v && MODES.has(v)) return v as PreferredMode;
    return null;
  } catch {
    return null;
  }
}

export async function setPreferredMode(mode: PreferredMode | null): Promise<void> {
  try {
    if (!mode) {
      await AsyncStorage.removeItem(KEY);
      return;
    }
    await AsyncStorage.setItem(KEY, mode);
  } catch {
    // ignore
  }
}
