import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import { getVideoPlayback, VideoWorkspaceType } from "@/api/videos";
import { useEntitlements } from "@/entitlements";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";
import { resolveImageUri } from "@/utils/photoUploads";

type Props = {
  lesson: any;
  compact?: boolean;
  context?: "lesson" | "video";
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

export default function LessonMediaCard({
  lesson,
  compact = false,
  context = "lesson"
}: Props) {
  const entitlements = useEntitlements();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [playerLoaded, setPlayerLoaded] = useState(false);
  const [protectedPlaybackUrl, setProtectedPlaybackUrl] = useState("");
  const [protectedPlaybackLoading, setProtectedPlaybackLoading] = useState(false);
  const [protectedPlaybackError, setProtectedPlaybackError] = useState("");
  const normalized = useMemo(
    () => normalizeLessonMediaDraft(lessonMediaDraftFromLesson(lesson)),
    [lesson]
  );
  const media = normalized.mediaSource;
  const videoAssetId = String(lesson?.videoAssetId || "");
  const suppliedPlaybackUrl = String(lesson?.playbackUrl || "");
  const protectedGrowPathMedia = Boolean(
    media?.sourceType === "growpath_upload" &&
    String(media.canonicalUrl || media.originalUrl || "").startsWith(
      "/api/videos/uploads/"
    )
  );

  useEffect(() => {
    let active = true;
    setProtectedPlaybackError("");
    if (!protectedGrowPathMedia) {
      setProtectedPlaybackUrl("");
      setProtectedPlaybackLoading(false);
      return () => {
        active = false;
      };
    }
    if (suppliedPlaybackUrl) {
      setProtectedPlaybackUrl(suppliedPlaybackUrl);
      setProtectedPlaybackLoading(false);
      return () => {
        active = false;
      };
    }
    if (!videoAssetId) {
      setProtectedPlaybackUrl("");
      setProtectedPlaybackLoading(false);
      setProtectedPlaybackError(
        "This protected video is not connected to its library record."
      );
      return () => {
        active = false;
      };
    }
    setProtectedPlaybackLoading(true);
    getVideoPlayback(
      videoAssetId,
      entitlements.mode as VideoWorkspaceType,
      entitlements.facilityId || undefined
    )
      .then((result) => {
        if (active) setProtectedPlaybackUrl(result.playbackUrl);
      })
      .catch(() => {
        if (active) {
          setProtectedPlaybackUrl("");
          setProtectedPlaybackError(
            "This protected video is unavailable or your account does not have access."
          );
        }
      })
      .finally(() => {
        if (active) setProtectedPlaybackLoading(false);
      });
    return () => {
      active = false;
    };
  }, [
    entitlements.facilityId,
    entitlements.mode,
    protectedGrowPathMedia,
    suppliedPlaybackUrl,
    videoAssetId
  ]);

  if (!media) return null;

  const sourceUrl = protectedGrowPathMedia
    ? protectedPlaybackUrl
    : resolveImageUri(
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
  const playerUrl = protectedGrowPathMedia
    ? protectedPlaybackUrl
    : resolveImageUri(
        media.embedCapability === "native" ? media.canonicalUrl : media.embedUrl
      );
  const clickToLoad = media.privacyMode === "click_to_load";
  const shouldRenderPlayer = canEmbed && (playerLoaded || !clickToLoad);
  const title = media.title || lesson?.title || `${media.providerLabel} lesson video`;

  return (
    <View
      style={[styles.card, compact && styles.compactCard]}
      accessibilityLabel={context === "lesson" ? "Lesson video" : "Video"}
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
            accessibilityLabel={`Load ${media.providerLabel} ${context === "lesson" ? "lesson " : ""}video`}
            accessibilityRole="button"
            onPress={() => setPlayerLoaded(true)}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Load {media.providerLabel} video</Text>
          </Pressable>
        </View>
      ) : null}

      {protectedPlaybackLoading ? (
        <View
          accessibilityLabel="Preparing protected video playback"
          accessibilityLiveRegion="polite"
          style={styles.playbackStatus}
        >
          <ActivityIndicator color={palette.accent} />
          <Text style={styles.statusText}>Preparing protected playback…</Text>
        </View>
      ) : null}
      {protectedPlaybackError ? (
        <View style={styles.warningBox}>
          <Text style={styles.warningTitle}>Video playback unavailable</Text>
          <Text style={styles.warningText}>{protectedPlaybackError}</Text>
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
          accessibilityLabel={`Open ${media.providerLabel} ${context === "lesson" ? "lesson " : ""}video in provider`}
          accessibilityRole="link"
          onPress={() => Linking.openURL(sourceUrl)}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryButtonText}>Open on {media.providerLabel}</Text>
        </Pressable>
      ) : null}

      {context === "lesson" ? (
        <Text style={styles.progressNote}>
          Watching here or at the provider does not complete the lesson automatically.
          Your GrowPath course progress changes only when you choose Mark Complete.
        </Text>
      ) : null}
      {media.lastCheckedAt ? (
        <Text style={styles.checkedAt}>
          Source last checked {new Date(media.lastCheckedAt).toLocaleString()}.
        </Text>
      ) : null}
    </View>
  );
}

export const createStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    card: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      backgroundColor: palette.surface,
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
    kicker: { color: palette.info, fontSize: 12, fontWeight: "800" },
    title: { color: palette.text, fontSize: 17, fontWeight: "800", marginTop: 2 },
    badge: {
      color: palette.success,
      backgroundColor: palette.accentSoft,
      borderRadius: 999,
      fontSize: 11,
      fontWeight: "700",
      paddingHorizontal: 9,
      paddingVertical: 5,
      overflow: "hidden",
      textTransform: "capitalize"
    },
    badgeWarning: { color: palette.warning, backgroundColor: palette.surfaceMuted },
    thumbnail: { width: "100%", minHeight: 190, borderRadius: radius.card },
    warningBox: {
      borderWidth: 1,
      borderColor: palette.warning,
      backgroundColor: palette.surfaceMuted,
      borderRadius: radius.card,
      padding: 11
    },
    warningTitle: { color: palette.warning, fontWeight: "800", marginBottom: 3 },
    warningText: { color: palette.text, fontSize: 12, lineHeight: 18 },
    consentBox: {
      borderWidth: 1,
      borderColor: palette.info,
      backgroundColor: palette.surfaceMuted,
      borderRadius: radius.card,
      padding: 12,
      gap: 8
    },
    consentTitle: { color: palette.info, fontWeight: "800" },
    consentText: { color: palette.text, fontSize: 12, lineHeight: 18 },
    player: {
      width: "100%",
      minHeight: 260,
      overflow: "hidden",
      borderRadius: radius.card
    },
    nativePlayer: { width: "100%", minHeight: 260, backgroundColor: "#020617" },
    summaryBox: {
      borderLeftWidth: 4,
      borderLeftColor: palette.accent,
      backgroundColor: palette.accentSoft,
      padding: 11
    },
    summaryTitle: { color: palette.text, fontWeight: "800", marginBottom: 4 },
    summaryText: { color: palette.text, fontSize: 14, lineHeight: 20 },
    accessibilityText: { color: palette.textMuted, fontSize: 11, marginTop: 7 },
    primaryButton: {
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      paddingHorizontal: 13,
      paddingVertical: 10,
      alignItems: "center"
    },
    primaryButtonText: { color: palette.accentText, fontWeight: "800" },
    secondaryButton: {
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surfaceMuted,
      borderRadius: radius.card,
      paddingHorizontal: 13,
      paddingVertical: 10,
      alignItems: "center"
    },
    secondaryButtonText: { color: palette.link, fontWeight: "800" },
    statusText: { color: palette.textMuted, fontSize: 12, lineHeight: 18 },
    playbackStatus: {
      alignItems: "center",
      flexDirection: "row",
      gap: 9,
      justifyContent: "center",
      paddingVertical: 12
    },
    progressNote: {
      color: palette.text,
      fontSize: 12,
      lineHeight: 18,
      fontWeight: "600"
    },
    checkedAt: { color: palette.textMuted, fontSize: 11 }
  });
