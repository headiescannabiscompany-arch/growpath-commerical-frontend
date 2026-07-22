import React, { useMemo, useState } from "react";
import {
  Image,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import { WebView } from "react-native-webview";

import {
  lessonMediaDraftFromLesson,
  normalizeLessonMediaDraft
} from "@/features/learning/lessonMedia";
import { radius } from "@/theme/theme";
import { resolveImageUri } from "@/utils/photoUploads";

type Props = {
  lesson: any;
  compact?: boolean;
};

function accessibilityLabel(status: string) {
  if (status === "provided") return "provided";
  if (status === "not_provided") return "not provided";
  if (status === "not_applicable") return "not applicable";
  return "not recorded";
}

function BrowserPlayer({
  uri,
  title,
  nativeVideo
}: {
  uri: string;
  title: string;
  nativeVideo: boolean;
}) {
  if (nativeVideo) {
    return React.createElement("video" as any, {
      src: uri,
      title,
      controls: true,
      preload: "metadata",
      style: { width: "100%", minHeight: 260, backgroundColor: "#020617" }
    });
  }
  return React.createElement("iframe" as any, {
    src: uri,
    title,
    allow: "accelerometer; encrypted-media; picture-in-picture; fullscreen",
    allowFullScreen: true,
    referrerPolicy: "strict-origin-when-cross-origin",
    style: { width: "100%", minHeight: 320, border: 0, backgroundColor: "#020617" }
  });
}

export default function LessonMediaCard({ lesson, compact = false }: Props) {
  const [playerLoaded, setPlayerLoaded] = useState(false);
  const normalized = useMemo(
    () => normalizeLessonMediaDraft(lessonMediaDraftFromLesson(lesson)),
    [lesson]
  );
  const media = normalized.mediaSource;
  if (!media) return null;

  const sourceUrl = resolveImageUri(
    media.externalLinkFallback || media.canonicalUrl || media.originalUrl
  );
  const isUnavailable = new Set(["unavailable", "restricted"]).has(
    media.availabilityStatus
  );
  const canEmbed =
    !isUnavailable &&
    media.availabilityStatus === "available" &&
    (media.embedCapability === "native" ||
      (media.embedCapability === "supported" && media.allowEmbed && media.embedUrl));
  const playerUrl = resolveImageUri(
    media.embedCapability === "native" ? media.canonicalUrl : media.embedUrl
  );
  const clickToLoad = media.privacyMode === "click_to_load";
  const shouldRenderPlayer = canEmbed && (playerLoaded || !clickToLoad);
  const title = media.title || lesson?.title || `${media.providerLabel} lesson video`;

  return (
    <View
      style={[styles.card, compact && styles.compactCard]}
      accessibilityLabel="Lesson video"
    >
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={styles.kicker}>{media.providerLabel}</Text>
          <Text style={styles.title}>{title}</Text>
        </View>
        <Text style={[styles.badge, isUnavailable && styles.badgeWarning]}>
          {media.availabilityStatus === "unchecked"
            ? "Not recently checked"
            : media.availabilityStatus.replace(/_/g, " ")}
        </Text>
      </View>

      {media.thumbnailUrl && !shouldRenderPlayer ? (
        <Image
          accessibilityLabel={`${title} thumbnail`}
          resizeMode="cover"
          source={{ uri: resolveImageUri(media.thumbnailUrl) }}
          style={styles.thumbnail}
        />
      ) : null}

      {isUnavailable ? (
        <View style={styles.warningBox}>
          <Text style={styles.warningTitle}>Video may not be available</Text>
          <Text style={styles.warningText}>
            {media.availabilityNote ||
              "The author recorded this source as unavailable or restricted. Use the summary below and try the provider link only if appropriate."}
          </Text>
        </View>
      ) : media.availabilityStatus === "unchecked" ? (
        <View style={styles.warningBox}>
          <Text style={styles.warningTitle}>Source availability is not confirmed</Text>
          <Text style={styles.warningText}>
            Third-party videos can be removed, restricted, age-gated, or blocked from
            embedding without notice. The external source and text summary remain below.
          </Text>
        </View>
      ) : null}

      {canEmbed && clickToLoad && !playerLoaded ? (
        <View style={styles.consentBox}>
          <Text style={styles.consentTitle}>Load video from {media.providerLabel}?</Text>
          <Text style={styles.consentText}>
            Loading connects your device to {media.providerLabel}. That provider may use
            cookies or collect viewing data under its own policies. GrowPath does not
            claim or verify provider watch analytics.
          </Text>
          <Pressable
            accessibilityLabel={`Load ${media.providerLabel} lesson video`}
            accessibilityRole="button"
            onPress={() => setPlayerLoaded(true)}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Load {media.providerLabel} video</Text>
          </Pressable>
        </View>
      ) : null}

      {shouldRenderPlayer && playerUrl ? (
        <View style={styles.player} accessibilityLabel={`${title} player`}>
          {Platform.OS === "web" ? (
            <BrowserPlayer
              uri={playerUrl}
              title={title}
              nativeVideo={media.embedCapability === "native"}
            />
          ) : (
            <WebView
              source={{ uri: playerUrl }}
              style={styles.nativePlayer}
              allowsFullscreenVideo
              allowsInlineMediaPlayback
              javaScriptEnabled={media.embedCapability !== "native"}
              mediaPlaybackRequiresUserAction
              originWhitelist={["https://*", "http://*"]}
            />
          )}
        </View>
      ) : null}

      {!canEmbed && !isUnavailable ? (
        <Text style={styles.statusText}>
          This source uses link-only playback. GrowPath does not accept pasted embed HTML
          or guess provider embed codes.
        </Text>
      ) : null}

      <View style={styles.summaryBox}>
        <Text style={styles.summaryTitle}>Video summary</Text>
        <Text style={styles.summaryText}>
          {media.textSummary ||
            "A text summary has not been added yet. The course author should provide one before publishing."}
        </Text>
        <Text style={styles.accessibilityText}>
          Captions: {accessibilityLabel(media.captionsStatus)} · Transcript:{" "}
          {accessibilityLabel(media.transcriptStatus)}
        </Text>
      </View>

      {sourceUrl ? (
        <Pressable
          accessibilityLabel={`Open ${media.providerLabel} lesson video in provider`}
          accessibilityRole="link"
          onPress={() => Linking.openURL(sourceUrl)}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryButtonText}>Open on {media.providerLabel}</Text>
        </Pressable>
      ) : null}

      <Text style={styles.progressNote}>
        Watching here or at the provider does not complete the lesson automatically. Your
        GrowPath course progress changes only when you choose Mark Complete.
      </Text>
      {media.lastCheckedAt ? (
        <Text style={styles.checkedAt}>
          Source last checked {new Date(media.lastCheckedAt).toLocaleString()}.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: radius.card,
    backgroundColor: "#fff",
    padding: 14,
    marginBottom: 16,
    gap: 11
  },
  compactCard: { marginBottom: 10 },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10
  },
  headerCopy: { flex: 1 },
  kicker: { color: "#1d4ed8", fontSize: 12, fontWeight: "800" },
  title: { color: "#0f172a", fontSize: 17, fontWeight: "800", marginTop: 2 },
  badge: {
    color: "#166534",
    backgroundColor: "#dcfce7",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: 9,
    paddingVertical: 5,
    overflow: "hidden",
    textTransform: "capitalize"
  },
  badgeWarning: { color: "#92400e", backgroundColor: "#fef3c7" },
  thumbnail: { width: "100%", minHeight: 190, borderRadius: radius.card },
  warningBox: {
    borderWidth: 1,
    borderColor: "#f59e0b",
    backgroundColor: "#fffbeb",
    borderRadius: radius.card,
    padding: 11
  },
  warningTitle: { color: "#92400e", fontWeight: "800", marginBottom: 3 },
  warningText: { color: "#78350f", fontSize: 12, lineHeight: 18 },
  consentBox: {
    borderWidth: 1,
    borderColor: "#93c5fd",
    backgroundColor: "#eff6ff",
    borderRadius: radius.card,
    padding: 12,
    gap: 8
  },
  consentTitle: { color: "#1e3a8a", fontWeight: "800" },
  consentText: { color: "#334155", fontSize: 12, lineHeight: 18 },
  player: {
    width: "100%",
    minHeight: 260,
    overflow: "hidden",
    borderRadius: radius.card
  },
  nativePlayer: { width: "100%", minHeight: 260, backgroundColor: "#020617" },
  summaryBox: {
    borderLeftWidth: 4,
    borderLeftColor: "#16a34a",
    backgroundColor: "#f0fdf4",
    padding: 11
  },
  summaryTitle: { color: "#14532d", fontWeight: "800", marginBottom: 4 },
  summaryText: { color: "#1e293b", fontSize: 14, lineHeight: 20 },
  accessibilityText: { color: "#475569", fontSize: 11, marginTop: 7 },
  primaryButton: {
    backgroundColor: "#1d4ed8",
    borderRadius: radius.card,
    paddingHorizontal: 13,
    paddingVertical: 10,
    alignItems: "center"
  },
  primaryButtonText: { color: "#fff", fontWeight: "800" },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#2563eb",
    backgroundColor: "#fff",
    borderRadius: radius.card,
    paddingHorizontal: 13,
    paddingVertical: 10,
    alignItems: "center"
  },
  secondaryButtonText: { color: "#1d4ed8", fontWeight: "800" },
  statusText: { color: "#475569", fontSize: 12, lineHeight: 18 },
  progressNote: { color: "#334155", fontSize: 12, lineHeight: 18, fontWeight: "600" },
  checkedAt: { color: "#64748b", fontSize: 11 }
});
