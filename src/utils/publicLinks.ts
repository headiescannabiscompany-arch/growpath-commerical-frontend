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

export type PublicShareTarget = {
  key: "facebook" | "x" | "bluesky" | "reddit" | "linkedin" | "email" | "text";
  label: string;
  href: string;
};

export function buildPublicShareTargets(
  title: string,
  path: string
): PublicShareTarget[] {
  const url = currentPublicUrl(path);
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const encodedMessage = encodeURIComponent(`${title}\n${url}`);

  return [
    {
      key: "facebook",
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`
    },
    {
      key: "x",
      label: "X",
      href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`
    },
    {
      key: "bluesky",
      label: "Bluesky",
      href: `https://bsky.app/intent/compose?text=${encodedMessage}`
    },
    {
      key: "reddit",
      label: "Reddit",
      href: `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`
    },
    {
      key: "linkedin",
      label: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`
    },
    {
      key: "email",
      label: "Email",
      href: `mailto:?subject=${encodedTitle}&body=${encodedMessage}`
    },
    { key: "text", label: "Text", href: `sms:?body=${encodedMessage}` }
  ];
}
