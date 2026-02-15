import { Platform } from "react-native";

export function blurActiveElement() {
  if (Platform.OS !== "web") return;
  try {
    const el = document?.activeElement as any;
    if (el && typeof el.blur === "function") el.blur();
  } catch {
    // ignore
  }
}
