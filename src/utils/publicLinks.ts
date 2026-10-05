import { Platform, Share } from "react-native";
import extractUrlsWithIndices from "twitter-text/dist/extractUrlsWithIndices";
import parseTweet from "twitter-text/dist/parseTweet";

function configuredPublicSiteUrl() {
  return String(process.env.EXPO_PUBLIC_SITE_URL || "https://growpathai.com").replace(
    /\/+$/,
    ""
  );
}

export function currentPublicUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const location = (globalThis as any)?.window?.location;
  if (typeof location?.origin === "string") return `${location.origin}${cleanPath}`;
  return `${configuredPublicSiteUrl()}${cleanPath}`;
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

// X counts links and emoji differently from JS string length. Keep URLs atomic
// while shortening the prefill; the canonical preview itself is never shortened.
function* xSummaryUnits(text: string): Generator<string> {
  const Segmenter = (
    Intl as typeof Intl & {
      Segmenter?: new (
        locale: undefined,
        options: { granularity: "grapheme" }
      ) => { segment: (value: string) => Iterable<{ segment: string }> };
    }
  ).Segmenter;
  const segmenter = Segmenter
    ? new Segmenter(undefined, { granularity: "grapheme" })
    : null;
  function* plainUnits(value: string) {
    if (segmenter) {
      for (const part of segmenter.segment(value)) yield part.segment;
    } else {
      // Older engines retain complete whitespace-delimited chunks rather than
      // cutting an emoji, combining sequence or surrogate pair in half.
      yield* value.match(/\s+|\S+/gu) || [];
    }
  }
  let offset = 0;
  for (const entity of extractUrlsWithIndices(text)) {
    yield* plainUnits(text.slice(offset, entity.indices[0]));
    yield text.slice(entity.indices[0], entity.indices[1]);
    offset = entity.indices[1];
  }
  yield* plainUnits(text.slice(offset));
}

function xShareSummary(title: string, previewUrl: string, details: PublicShareDetails) {
  const parts = [title, details.priceLabel, details.description]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
  const summary = parts.join(" — ");
  // The hosted X intent composer inserts a separator and a trailing space.
  // Budget both; an exact 280-character text+URL otherwise arrives as 281.
  const fits = (text: string) =>
    parseTweet(`${text} ${previewUrl} `).weightedLength <= 280;
  if (fits(summary)) return summary;

  let prefix = "";
  for (const unit of xSummaryUnits(summary)) {
    const next = prefix + unit;
    if (!fits(`${next.trimEnd()}…`)) break;
    prefix = next;
  }
  const shortened = `${prefix.trimEnd()}…`;
  // Description yields before a fitting complete title/price, even when an
  // ellipsis would otherwise consume the final character of either field.
  const heading = [title, details.priceLabel]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(" — ");
  if (fits(heading) && !shortened.startsWith(heading)) return heading;
  const cleanTitle = title.trim();
  if (!fits(heading) && fits(cleanTitle)) return cleanTitle;
  if (fits(cleanTitle) && !shortened.startsWith(cleanTitle)) return cleanTitle;
  return shortened;
}

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
  const encodedSummary = encodeURIComponent(xShareSummary(title, previewUrl, details));

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
