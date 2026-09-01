import { Platform, Share } from "react-native";

export function currentPublicUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const location = (globalThis as any)?.window?.location;
  if (typeof location?.origin === "string") return `${location.origin}${cleanPath}`;
  return `https://growpathai.com${cleanPath}`;
}

export type PublicShareDetails = {
  description?: string;
  priceLabel?: string;
  socialPreviewUrl?: string;
};

export function publicShareMessage(
  title: string,
  path: string,
  details: PublicShareDetails = {}
) {
  const url = currentPublicUrl(path);
  return [title, details.priceLabel, details.description, url]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join("\n");
}

export async function sharePublicLink(
  title: string,
  path: string,
  details: PublicShareDetails = {}
) {
  const url = details.socialPreviewUrl
    ? currentPublicUrl(details.socialPreviewUrl)
    : currentPublicUrl(path);
  const text = [details.priceLabel, details.description]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(" — ");
  const nav = (globalThis as any)?.navigator;

  if (Platform.OS === "web") {
    if (typeof nav?.share === "function") {
      await nav.share({ title, text, url });
      return { method: "web-share", url };
    }
    if (typeof nav?.clipboard?.writeText === "function") {
      await nav.clipboard.writeText(url);
      return { method: "web-clipboard", url };
    }
  }

  await Share.share({ title, message: publicShareMessage(title, path, details), url });
  return { method: "native-share", url };
}

export type PublicShareTarget = {
  key: "facebook" | "x" | "bluesky" | "reddit" | "linkedin" | "email" | "text";
  label: string;
  href: string;
};

export function buildPublicShareTargets(
  title: string,
  path: string,
  details: PublicShareDetails = {}
): PublicShareTarget[] {
  const url = currentPublicUrl(path);
  const previewUrl = details.socialPreviewUrl
    ? currentPublicUrl(details.socialPreviewUrl)
    : url;
  const encodedPreviewUrl = encodeURIComponent(previewUrl);
  const encodedTitle = encodeURIComponent(title);
  const encodedMessage = encodeURIComponent(
    publicShareMessage(title, details.socialPreviewUrl || path, details)
  );
  const encodedSummary = encodeURIComponent(
    [title, details.priceLabel, details.description]
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .join(" — ")
  );

  return [
    {
      key: "facebook",
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedPreviewUrl}`
    },
    {
      key: "x",
      label: "X",
      href: `https://twitter.com/intent/tweet?text=${encodedSummary}&url=${encodedPreviewUrl}`
    },
    {
      key: "bluesky",
      label: "Bluesky",
      href: `https://bsky.app/intent/compose?text=${encodedMessage}`
    },
    {
      key: "reddit",
      label: "Reddit",
      href: `https://www.reddit.com/submit?url=${encodedPreviewUrl}&title=${encodedTitle}`
    },
    {
      key: "linkedin",
      label: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedPreviewUrl}`
    },
    {
      key: "email",
      label: "Email",
      href: `mailto:?subject=${encodedTitle}&body=${encodedMessage}`
    },
    { key: "text", label: "Text", href: `sms:?body=${encodedMessage}` }
  ];
}
