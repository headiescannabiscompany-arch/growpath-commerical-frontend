export type LessonMediaSourceType =
  | "growpath_upload"
  | "youtube"
  | "rumble"
  | "vimeo"
  | "other_url";

export type LessonMediaAvailability =
  | "unchecked"
  | "available"
  | "link_only"
  | "unavailable"
  | "restricted";

export type LessonMediaAccessibility =
  | "unknown"
  | "provided"
  | "not_provided"
  | "not_applicable";

export type LessonMediaSource = {
  sourceType: LessonMediaSourceType;
  provider: string;
  providerLabel: string;
  originalUrl: string;
  canonicalUrl: string;
  providerVideoId: string;
  providerPrivacyHash: string;
  title: string;
  thumbnailUrl: string;
  embedUrl: string;
  embedCapability: "supported" | "link_only" | "native";
  allowEmbed: boolean;
  linkOnlyFallback: boolean;
  externalLinkFallback: string;
  availabilityStatus: LessonMediaAvailability;
  availabilityNote: string;
  creatorRightsConfirmed: boolean;
  captionsStatus: LessonMediaAccessibility;
  transcriptStatus: LessonMediaAccessibility;
  textSummary: string;
  privacyMode: "click_to_load" | "not_applicable";
  lastCheckedAt: string;
};

export type LessonMediaDraft = Pick<
  LessonMediaSource,
  | "sourceType"
  | "originalUrl"
  | "title"
  | "thumbnailUrl"
  | "allowEmbed"
  | "availabilityStatus"
  | "availabilityNote"
  | "creatorRightsConfirmed"
  | "captionsStatus"
  | "transcriptStatus"
  | "textSummary"
  | "lastCheckedAt"
>;

export const LESSON_MEDIA_SOURCE_OPTIONS: Array<{
  value: LessonMediaSourceType;
  label: string;
}> = [
  { value: "growpath_upload", label: "GrowPath upload" },
  { value: "youtube", label: "YouTube" },
  { value: "rumble", label: "Rumble" },
  { value: "vimeo", label: "Vimeo" },
  { value: "other_url", label: "Other URL" }
];

const SOURCE_TYPES = new Set(LESSON_MEDIA_SOURCE_OPTIONS.map((option) => option.value));
const AVAILABILITY = new Set<LessonMediaAvailability>([
  "unchecked",
  "available",
  "link_only",
  "unavailable",
  "restricted"
]);
const ACCESSIBILITY = new Set<LessonMediaAccessibility>([
  "unknown",
  "provided",
  "not_provided",
  "not_applicable"
]);

function clean(value: unknown) {
  return String(value || "").trim();
}

function validTimestamp(value: unknown) {
  const text = clean(value);
  if (!text) return "";
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
}

function unsafeMarkup(value: string) {
  return (
    /<\s*\/?\s*(?:iframe|script|object|embed|video|html)\b/i.test(value) ||
    /(?:javascript|data)\s*:/i.test(value)
  );
}

function parseMediaUrl(value: string) {
  if (value.startsWith("/")) {
    if (!value.startsWith("/uploads/")) return null;
    return { parsed: new URL(value, "https://growpathai.com"), relative: value };
  }
  try {
    const parsed = new URL(value);
    if (!new Set(["http:", "https:"]).has(parsed.protocol)) return null;
    if (parsed.username || parsed.password) return null;
    return { parsed, relative: "" };
  } catch (_error) {
    return null;
  }
}

function youtubeId(parsed: URL) {
  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  if (host === "youtu.be") return parsed.pathname.split("/").filter(Boolean)[0] || "";
  if (
    !new Set([
      "youtube.com",
      "m.youtube.com",
      "music.youtube.com",
      "youtube-nocookie.com"
    ]).has(host)
  ) {
    return "";
  }
  if (parsed.pathname === "/watch") return parsed.searchParams.get("v") || "";
  const parts = parsed.pathname.split("/").filter(Boolean);
  return ["embed", "shorts", "live"].includes(parts[0]) ? parts[1] || "" : "";
}

function vimeoParts(parsed: URL) {
  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  if (!new Set(["vimeo.com", "player.vimeo.com"]).has(host)) {
    return { id: "", privacyHash: "" };
  }
  const parts = parsed.pathname.split("/").filter(Boolean);
  const idIndex = parts[0] === "video" ? 1 : 0;
  const candidate = parts[idIndex];
  return /^\d+$/.test(candidate || "")
    ? {
        id: candidate,
        privacyHash: /^[a-z0-9]+$/i.test(parts[idIndex + 1] || "")
          ? parts[idIndex + 1]
          : clean(parsed.searchParams.get("h"))
      }
    : { id: "", privacyHash: "" };
}

function rumbleId(parsed: URL) {
  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  if (host !== "rumble.com") return "";
  const segment = parsed.pathname.split("/").filter(Boolean)[0] || "";
  return /^v[a-z0-9]+/i.test(segment) ? segment : "";
}

export function emptyLessonMediaDraft(
  sourceType: LessonMediaSourceType = "youtube"
): LessonMediaDraft {
  return {
    sourceType,
    originalUrl: "",
    title: "",
    thumbnailUrl: "",
    allowEmbed: false,
    availabilityStatus: "unchecked",
    availabilityNote: "",
    creatorRightsConfirmed: false,
    captionsStatus: "unknown",
    transcriptStatus: "unknown",
    textSummary: "",
    lastCheckedAt: ""
  };
}

export function lessonMediaDraftFromLesson(lesson: any): LessonMediaDraft {
  const source = lesson?.mediaSource || {};
  const sourceType = SOURCE_TYPES.has(source.sourceType)
    ? source.sourceType
    : "other_url";
  return {
    ...emptyLessonMediaDraft(sourceType),
    originalUrl: clean(
      source.originalUrl ||
        source.canonicalUrl ||
        lesson?.videoUrl ||
        lesson?.externalVideoUrl
    ),
    title: clean(source.title),
    thumbnailUrl: clean(source.thumbnailUrl),
    allowEmbed: Boolean(source.allowEmbed),
    availabilityStatus: AVAILABILITY.has(source.availabilityStatus)
      ? source.availabilityStatus
      : "unchecked",
    availabilityNote: clean(source.availabilityNote),
    creatorRightsConfirmed: Boolean(source.creatorRightsConfirmed),
    captionsStatus: ACCESSIBILITY.has(source.captionsStatus)
      ? source.captionsStatus
      : "unknown",
    transcriptStatus: ACCESSIBILITY.has(source.transcriptStatus)
      ? source.transcriptStatus
      : "unknown",
    textSummary: clean(source.textSummary),
    lastCheckedAt: validTimestamp(source.lastCheckedAt)
  };
}

export function normalizeLessonMediaDraft(
  draft: Partial<LessonMediaDraft> | null | undefined,
  urlOverride?: string
): { mediaSource: LessonMediaSource | null; errors: string[] } {
  const originalUrl = clean(urlOverride ?? draft?.originalUrl);
  if (!originalUrl) return { mediaSource: null, errors: [] };
  if (unsafeMarkup(originalUrl)) {
    return {
      mediaSource: null,
      errors: ["Paste a video page URL, not iframe, embed, script, or HTML code."]
    };
  }
  const parsedResult = parseMediaUrl(originalUrl);
  if (!parsedResult) {
    return {
      mediaSource: null,
      errors: ["Video sources must use a valid HTTP(S) URL or GrowPath upload path."]
    };
  }

  const { parsed, relative } = parsedResult;
  const firstPartyUpload =
    relative.startsWith("/uploads/") ||
    (new Set(["growpathai.com", "api.growpathai.com"]).has(
      parsed.hostname.toLowerCase().replace(/^www\./, "")
    ) &&
      parsed.pathname.startsWith("/uploads/"));
  const detectedYoutube = youtubeId(parsed);
  const detectedVimeo = vimeoParts(parsed);
  const detectedRumble = rumbleId(parsed);
  const sourceType: LessonMediaSourceType = firstPartyUpload
    ? "growpath_upload"
    : detectedYoutube
      ? "youtube"
      : detectedVimeo.id
        ? "vimeo"
        : detectedRumble
          ? "rumble"
          : "other_url";
  const providerVideoId = detectedYoutube || detectedVimeo.id || detectedRumble;
  const providerPrivacyHash = sourceType === "vimeo" ? detectedVimeo.privacyHash : "";

  let provider = "other";
  let providerLabel = "External video";
  let canonicalUrl = parsed.toString();
  let embedUrl = "";
  let embedCapability: LessonMediaSource["embedCapability"] = "link_only";
  let thumbnailUrl = "";
  let privacyMode: LessonMediaSource["privacyMode"] = "not_applicable";

  if (sourceType === "youtube") {
    provider = "youtube";
    providerLabel = "YouTube";
    canonicalUrl = `https://www.youtube.com/watch?v=${providerVideoId}`;
    embedUrl = `https://www.youtube-nocookie.com/embed/${providerVideoId}`;
    embedCapability = "supported";
    thumbnailUrl = `https://i.ytimg.com/vi/${providerVideoId}/hqdefault.jpg`;
    privacyMode = "click_to_load";
  } else if (sourceType === "vimeo") {
    provider = "vimeo";
    providerLabel = "Vimeo";
    canonicalUrl = `https://vimeo.com/${providerVideoId}${
      providerPrivacyHash ? `/${providerPrivacyHash}` : ""
    }`;
    embedUrl = `https://player.vimeo.com/video/${providerVideoId}${
      providerPrivacyHash ? `?h=${encodeURIComponent(providerPrivacyHash)}` : ""
    }`;
    embedCapability = "supported";
    privacyMode = "click_to_load";
  } else if (sourceType === "rumble") {
    provider = "rumble";
    providerLabel = "Rumble";
    canonicalUrl = `https://rumble.com${parsed.pathname}`;
  } else if (sourceType === "growpath_upload") {
    provider = "growpath";
    providerLabel = "GrowPath upload";
    canonicalUrl = relative || parsed.toString();
    embedCapability = "native";
  } else {
    parsed.hash = "";
    canonicalUrl = parsed.toString();
  }

  const availabilityStatus = AVAILABILITY.has(
    draft?.availabilityStatus as LessonMediaAvailability
  )
    ? (draft?.availabilityStatus as LessonMediaAvailability)
    : "unchecked";
  const captionsStatus = ACCESSIBILITY.has(
    draft?.captionsStatus as LessonMediaAccessibility
  )
    ? (draft?.captionsStatus as LessonMediaAccessibility)
    : "unknown";
  const transcriptStatus = ACCESSIBILITY.has(
    draft?.transcriptStatus as LessonMediaAccessibility
  )
    ? (draft?.transcriptStatus as LessonMediaAccessibility)
    : "unknown";
  const allowEmbed =
    embedCapability === "supported" &&
    availabilityStatus === "available" &&
    Boolean(draft?.allowEmbed);

  return {
    errors: [],
    mediaSource: {
      sourceType,
      provider,
      providerLabel,
      originalUrl,
      canonicalUrl,
      providerVideoId,
      providerPrivacyHash,
      title: clean(draft?.title),
      thumbnailUrl: clean(draft?.thumbnailUrl || thumbnailUrl),
      embedUrl: allowEmbed ? embedUrl : "",
      embedCapability,
      allowEmbed,
      linkOnlyFallback:
        !allowEmbed ||
        embedCapability === "link_only" ||
        new Set(["link_only", "unavailable", "restricted"]).has(availabilityStatus),
      externalLinkFallback: canonicalUrl,
      availabilityStatus,
      availabilityNote: clean(draft?.availabilityNote),
      creatorRightsConfirmed: Boolean(draft?.creatorRightsConfirmed),
      captionsStatus,
      transcriptStatus,
      textSummary: clean(draft?.textSummary),
      privacyMode,
      lastCheckedAt: validTimestamp(draft?.lastCheckedAt)
    }
  };
}

export function lessonMediaPublishIssues(
  mediaOrLesson: LessonMediaSource | any
): string[] {
  const isSource = Boolean(mediaOrLesson?.sourceType && mediaOrLesson?.canonicalUrl);
  const normalized = isSource
    ? normalizeLessonMediaDraft(mediaOrLesson)
    : normalizeLessonMediaDraft(lessonMediaDraftFromLesson(mediaOrLesson));
  if (!normalized.mediaSource) return normalized.errors;
  const media = normalized.mediaSource;
  const issues = [...normalized.errors];
  if (!media.creatorRightsConfirmed) issues.push("confirm creator rights or permission");
  if (media.availabilityStatus === "unchecked" || !media.lastCheckedAt) {
    issues.push("open the source and record an availability check");
  }
  if (!media.textSummary) issues.push("add a learner-visible text summary");
  if (media.captionsStatus === "unknown" && media.transcriptStatus === "unknown") {
    issues.push("record captions or transcript status");
  }
  return issues;
}

export function lessonHasMedia(lesson: any) {
  return Boolean(
    lesson?.mediaSource?.canonicalUrl || lesson?.videoUrl || lesson?.externalVideoUrl
  );
}

export function prepareLessonMediaSubmission(
  draft: LessonMediaDraft,
  urlOverride?: string
) {
  const normalized = normalizeLessonMediaDraft(draft, urlOverride);
  return {
    ...normalized,
    videoUrl: normalized.mediaSource?.canonicalUrl || "",
    externalVideoUrl: normalized.mediaSource?.canonicalUrl || ""
  };
}
