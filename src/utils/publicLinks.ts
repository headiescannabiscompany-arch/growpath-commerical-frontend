import { Platform, Share } from "react-native";

export function currentPublicUrl(path: string) {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const location = (globalThis as any)?.window?.location;
  if (typeof location?.origin === "string") return `${location.origin}${cleanPath}`;
  return `https://growpathai.com${cleanPath}`;
}

export async function sharePublicLink(title: string, path: string) {
  const url = currentPublicUrl(path);
  const nav = (globalThis as any)?.navigator;

  if (Platform.OS === "web") {
    if (typeof nav?.share === "function") {
      await nav.share({ title, url });
      return { method: "web-share", url };
    }
    if (typeof nav?.clipboard?.writeText === "function") {
      await nav.clipboard.writeText(url);
      return { method: "web-clipboard", url };
    }
  }

  await Share.share({ title, message: url, url });
  return { method: "native-share", url };
}
