"use strict";

const AVAILABILITY_STATUSES = new Set([
  "unchecked",
  "available",
  "link_only",
  "unavailable",
  "restricted"
]);
const ACCESSIBILITY_STATUSES = new Set([
  "unknown",
  "provided",
  "not_provided",
  "not_applicable"
]);

function cleanString(value) {
  return String(value || "").trim();
}

function cleanEnum(value, allowed, fallback) {
  const normalized = cleanString(value).toLowerCase();
  return allowed.has(normalized) ? normalized : fallback;
}

function safeTimestamp(value) {
  const text = cleanString(value);
  if (!text) return "";
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
}

function hasUnsafeMarkup(value) {
  const text = cleanString(value);
  return (
    /<\s*\/?\s*(?:iframe|script|object|embed|video|html)\b/i.test(text) ||
    /(?:javascript|data)\s*:/i.test(text)
  );
}

function parseHttpUrl(value) {
  const text = cleanString(value);
  if (!text) return null;
  if (text.startsWith("/")) {
    if (!text.startsWith("/uploads/")) return null;
    return { parsed: new URL(text, "https://growpathai.com"), relative: text };
  }
  try {
    const parsed = new URL(text);
    if (!new Set(["http:", "https:"]).has(parsed.protocol)) return null;
    if (parsed.username || parsed.password) return null;
    return { parsed, relative: "" };
  } catch (_error) {
    return null;
  }
}

function youtubeVideoId(parsed) {
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
  if (["embed", "shorts", "live"].includes(parts[0])) return parts[1] || "";
  return "";
}

function vimeoVideoParts(parsed) {
  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  if (!new Set(["vimeo.com", "player.vimeo.com"]).has(host))
    return { id: "", privacyHash: "" };
  const parts = parsed.pathname.split("/").filter(Boolean);
  const idIndex = parts[0] === "video" ? 1 : 0;
  const candidate = parts[idIndex];
  return /^\d+$/.test(candidate || "")
    ? {
        id: candidate,
        privacyHash: /^[a-z0-9]+$/i.test(parts[idIndex + 1] || "")
          ? parts[idIndex + 1]
          : cleanString(parsed.searchParams.get("h"))
      }
    : { id: "", privacyHash: "" };
}

function rumbleVideoId(parsed) {
  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  if (host !== "rumble.com") return "";
  const segment = parsed.pathname.split("/").filter(Boolean)[0] || "";
  return /^v[a-z0-9]+/i.test(segment) ? segment : "";
}

function detectSource(parsed, relative) {
  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  const firstPartyUpload =
    relative.startsWith("/uploads/") ||
    (new Set(["growpathai.com", "api.growpathai.com"]).has(host) &&
      parsed.pathname.startsWith("/uploads/"));
  if (firstPartyUpload) {
    return { sourceType: "growpath_upload", providerVideoId: "" };
  }
  const youtubeId = youtubeVideoId(parsed);
  if (youtubeId) return { sourceType: "youtube", providerVideoId: youtubeId };
  const vimeo = vimeoVideoParts(parsed);
  if (vimeo.id)
    return {
      sourceType: "vimeo",
      providerVideoId: vimeo.id,
      providerPrivacyHash: vimeo.privacyHash
    };
  const rumbleId = rumbleVideoId(parsed);
  if (rumbleId) return { sourceType: "rumble", providerVideoId: rumbleId };
  return { sourceType: "other_url", providerVideoId: "", providerPrivacyHash: "" };
}

function providerFields(
  sourceType,
  parsed,
  relative,
  providerVideoId,
  providerPrivacyHash
) {
  if (sourceType === "youtube") {
    return {
      provider: "youtube",
      providerLabel: "YouTube",
      canonicalUrl: `https://www.youtube.com/watch?v=${providerVideoId}`,
      embedUrl: `https://www.youtube-nocookie.com/embed/${providerVideoId}`,
      embedCapability: "supported",
      thumbnailUrl: `https://i.ytimg.com/vi/${providerVideoId}/hqdefault.jpg`,
      privacyMode: "click_to_load"
    };
  }
  if (sourceType === "vimeo") {
    const privacySuffix = providerPrivacyHash ? `/${providerPrivacyHash}` : "";
    const privacyQuery = providerPrivacyHash
      ? `?h=${encodeURIComponent(providerPrivacyHash)}`
      : "";
    return {
      provider: "vimeo",
      providerLabel: "Vimeo",
      canonicalUrl: `https://vimeo.com/${providerVideoId}${privacySuffix}`,
      embedUrl: `https://player.vimeo.com/video/${providerVideoId}${privacyQuery}`,
      embedCapability: "supported",
      thumbnailUrl: "",
      privacyMode: "click_to_load"
    };
  }
  if (sourceType === "rumble") {
    return {
      provider: "rumble",
      providerLabel: "Rumble",
      canonicalUrl: `https://rumble.com${parsed.pathname}`,
      embedUrl: "",
      embedCapability: "link_only",
      thumbnailUrl: "",
      privacyMode: "not_applicable"
    };
  }
  if (sourceType === "growpath_upload") {
    return {
      provider: "growpath",
      providerLabel: "GrowPath upload",
      canonicalUrl: relative || parsed.toString(),
      embedUrl: "",
      embedCapability: "native",
      thumbnailUrl: "",
      privacyMode: "not_applicable"
    };
  }
  parsed.hash = "";
  return {
    provider: "other",
    providerLabel: "External video",
    canonicalUrl: parsed.toString(),
    embedUrl: "",
    embedCapability: "link_only",
    thumbnailUrl: "",
    privacyMode: "not_applicable"
  };
}

function normalizeLessonMedia(input = {}, options = {}) {
  const fallback = options.fallback || {};
  const originalUrl = cleanString(
    input.originalUrl ||
      input.canonicalUrl ||
      options.legacyUrl ||
      fallback.originalUrl ||
      fallback.canonicalUrl ||
      ""
  );
  if (!originalUrl) {
    if (cleanString(input.sourceType || fallback.sourceType)) {
      return {
        mediaSource: null,
        errors: ["A video URL or GrowPath upload is required."]
      };
    }
    return { mediaSource: null, errors: [] };
  }
  if (hasUnsafeMarkup(originalUrl)) {
    return {
      mediaSource: null,
      errors: ["Paste a video page URL, not iframe, embed, script, or HTML code."]
    };
  }
  const parsedResult = parseHttpUrl(originalUrl);
  if (!parsedResult) {
    return {
      mediaSource: null,
      errors: ["Video sources must use a valid HTTP(S) URL or GrowPath upload path."]
    };
  }
  const detected = detectSource(parsedResult.parsed, parsedResult.relative);
  const provider = providerFields(
    detected.sourceType,
    parsedResult.parsed,
    parsedResult.relative,
    detected.providerVideoId,
    detected.providerPrivacyHash || ""
  );
  const availabilityStatus = cleanEnum(
    input.availabilityStatus || fallback.availabilityStatus,
    AVAILABILITY_STATUSES,
    "unchecked"
  );
  const captionsStatus = cleanEnum(
    input.captionsStatus || fallback.captionsStatus,
    ACCESSIBILITY_STATUSES,
    "unknown"
  );
  const transcriptStatus = cleanEnum(
    input.transcriptStatus || fallback.transcriptStatus,
    ACCESSIBILITY_STATUSES,
    "unknown"
  );
  const allowEmbed =
    provider.embedCapability === "supported" &&
    availabilityStatus === "available" &&
    Boolean(input.allowEmbed ?? fallback.allowEmbed);
  const canonicalUrl = provider.canonicalUrl;
  return {
    errors: [],
    mediaSource: {
      sourceType: detected.sourceType,
      provider: provider.provider,
      providerLabel: provider.providerLabel,
      originalUrl,
      canonicalUrl,
      providerVideoId: detected.providerVideoId,
      providerPrivacyHash: detected.providerPrivacyHash || "",
      title: cleanString(input.title || fallback.title),
      thumbnailUrl: cleanString(
        input.thumbnailUrl || fallback.thumbnailUrl || provider.thumbnailUrl
      ),
      embedUrl: allowEmbed ? provider.embedUrl : "",
      embedCapability: provider.embedCapability,
      allowEmbed,
      linkOnlyFallback:
        !allowEmbed ||
        provider.embedCapability === "link_only" ||
        new Set(["link_only", "unavailable", "restricted"]).has(availabilityStatus),
      externalLinkFallback: canonicalUrl,
      availabilityStatus,
      availabilityNote: cleanString(input.availabilityNote || fallback.availabilityNote),
      creatorRightsConfirmed: Boolean(
        input.creatorRightsConfirmed ?? fallback.creatorRightsConfirmed
      ),
      captionsStatus,
      transcriptStatus,
      textSummary: cleanString(input.textSummary || fallback.textSummary),
      privacyMode: provider.privacyMode,
      lastCheckedAt: safeTimestamp(input.lastCheckedAt || fallback.lastCheckedAt)
    }
  };
}

function lessonMediaPublishBlockers(lesson, index = 0) {
  const label = cleanString(lesson?.title) || `Lesson ${index + 1}`;
  const normalized = normalizeLessonMedia(lesson?.mediaSource || {}, {
    legacyUrl: lesson?.videoUrl || lesson?.externalVideoUrl || "",
    fallback: lesson?.mediaSource || {}
  });
  if (!normalized.mediaSource && !normalized.errors.length) return [];
  const blockers = normalized.errors.map((message) => `${label}: ${message}`);
  const media = normalized.mediaSource;
  if (!media) return blockers;
  if (!media.creatorRightsConfirmed) {
    blockers.push(`${label}: confirm creator rights or permission for the video source.`);
  }
  if (media.availabilityStatus === "unchecked" || !media.lastCheckedAt) {
    blockers.push(`${label}: check and record the current media availability.`);
  }
  if (!media.textSummary) {
    blockers.push(`${label}: add a learner-visible text summary.`);
  }
  if (media.captionsStatus === "unknown" && media.transcriptStatus === "unknown") {
    blockers.push(`${label}: record captions or transcript status.`);
  }
  if (!media.externalLinkFallback) {
    blockers.push(`${label}: add an external-link fallback.`);
  }
  return blockers;
}

module.exports = {
  normalizeLessonMedia,
  lessonMediaPublishBlockers
};
