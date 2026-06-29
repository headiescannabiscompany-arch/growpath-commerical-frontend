import { Linking, Platform } from "react-native";

export async function openExternalUrl(url) {
  if (Platform.OS === "web" && typeof window !== "undefined" && window.location) {
    window.location.href = url;
    return;
  }
  await Linking.openURL(url);
}
