import { Linking, Platform } from "react-native";

export async function openAuthorizedExternalUrl(url: string): Promise<void> {
  const target = String(url || "").trim();
  if (!target) throw new Error("A destination URL is required.");
  if (Platform.OS === "web" && typeof window !== "undefined" && window.location) {
    window.location.href = target;
    return;
  }
  await Linking.openURL(target);
}
