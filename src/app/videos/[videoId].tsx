import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { getVideo, GrowPathVideo } from "@/api/videos";
import { useAuth } from "@/auth/AuthContext";
import FollowButton from "@/components/FollowButton";
import { InlineError } from "@/components/InlineError";
import ReportModal from "@/components/ReportModal";
import LessonMediaCard from "@/components/learning/LessonMediaCard";
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
import { formatDuration } from "@/features/videos/videoPresentation";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

export default function VideoDetailRoute() {
  const params = useLocalSearchParams<{ videoId?: string }>();
  const auth = useAuth();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const videoId = String(
    Array.isArray(params.videoId) ? params.videoId[0] : params.videoId || ""
  );
  const [video, setVideo] = useState<GrowPathVideo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [reportVisible, setReportVisible] = useState(false);
  const [feedback, setFeedback] = useState("");
  const ownerId = String(video?.owner?.id || "");
  const canReport =
    auth.isAuthed &&
    Boolean(ownerId) &&
    ownerId !== String(auth.user?.id || "") &&
    ownerId !== String(auth.user?._id || "");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    getVideo(videoId)
      .then((result) => {
        if (active) setVideo(result);
      })
      .catch((err) => {
        if (active) setError(err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [videoId]);

  return (
    <AppPage
      routeKey="video-detail"
      backFallbackHref="/videos"
      header={
        <View>
          <Text accessibilityRole="header" aria-level={1} style={styles.title}>
            {video?.title || "Video"}
          </Text>
        </View>
      }
    >
      {loading ? (
        <ActivityIndicator accessibilityLabel="Loading video" color={palette.accent} />
      ) : null}
      <InlineError error={error} />
      {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
      {video ? (
        <>
          <AppCard>
            <View style={styles.ownerRow}>
              <View style={styles.ownerCopy}>
                <Text style={styles.owner}>
                  {video.owner?.displayName || "GrowPath member"}
                </Text>
                <Text style={styles.meta}>
                  {[
                    video.owner?.workspaceType,
                    formatDuration(video.durationSeconds),
                    video.visibility.replace(/_/g, " "),
                    video.publishedAt
                      ? new Date(video.publishedAt).toLocaleDateString()
                      : ""
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              </View>
              {auth.isAuthed &&
              video.owner?.id &&
              video.owner.id !== auth.user?.id &&
              video.owner.id !== auth.user?._id ? (
                <FollowButton userId={video.owner.id} />
              ) : null}
            </View>
            {video.description ? (
              <Text style={styles.description}>{video.description}</Text>
            ) : null}
            {video.cannabisSpecific ? (
              <Text style={styles.context}>
                Cannabis/hemp-specific content shown under GrowPath visibility rules.
              </Text>
            ) : null}
            {canReport ? (
              <Pressable
                accessibilityLabel={`Report ${video.title || "video"}`}
                accessibilityRole="button"
                onPress={() => setReportVisible(true)}
                style={styles.reportButton}
              >
                <Text style={styles.reportButtonText}>Report Video</Text>
              </Pressable>
            ) : null}
          </AppCard>
          <LessonMediaCard
            context="video"
            lesson={{
              title: video.title,
              mediaSource: video.mediaSource,
              videoUrl: video.mediaSource?.canonicalUrl,
              videoAssetId: video.id,
              playbackUrl: video.playbackUrl
            }}
          />
          {video.tags?.length || video.growInterests?.length ? (
            <AppCard>
              <Text accessibilityRole="header" aria-level={2} style={styles.sectionTitle}>
                Topics
              </Text>
              <View style={styles.tags}>
                {[...(video.tags || []), ...(video.growInterests || [])].map((tag) => (
                  <Text key={tag} style={styles.tag}>
                    {tag}
                  </Text>
                ))}
              </View>
            </AppCard>
          ) : null}
        </>
      ) : null}
      <ReportModal
        visible={reportVisible}
        onClose={() => setReportVisible(false)}
        contentType="video"
        contentId={videoId}
        contentTitle={video?.title || "Video"}
        targetUrl={`/videos/${encodeURIComponent(videoId)}`}
        onSuccess={() => setFeedback("Video report submitted for administrator review.")}
      />
    </AppPage>
  );
}

export const createStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    title: { color: palette.heroText, fontSize: 28, fontWeight: "900" },
    ownerRow: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: 12,
      justifyContent: "space-between"
    },
    ownerCopy: { flex: 1 },
    owner: { color: palette.text, fontSize: 17, fontWeight: "800" },
    meta: {
      color: palette.textMuted,
      fontSize: 12,
      marginTop: 3,
      textTransform: "capitalize"
    },
    feedback: {
      backgroundColor: palette.accentSoft,
      borderRadius: radius.card,
      color: palette.success,
      fontWeight: "700",
      marginBottom: 10,
      padding: 10
    },
    reportButton: {
      alignSelf: "flex-start",
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      marginTop: 12,
      paddingHorizontal: 12,
      paddingVertical: 9
    },
    reportButtonText: { color: palette.link, fontWeight: "800" },
    description: { color: palette.text, lineHeight: 21, marginTop: 12 },
    context: {
      backgroundColor: palette.accentSoft,
      borderRadius: radius.card,
      color: palette.success,
      fontSize: 12,
      fontWeight: "700",
      marginTop: 12,
      padding: 10
    },
    sectionTitle: { color: palette.text, fontSize: 18, fontWeight: "800" },
    tags: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 9 },
    tag: {
      backgroundColor: palette.surfaceMuted,
      borderRadius: 999,
      color: palette.textMuted,
      fontSize: 12,
      fontWeight: "700",
      overflow: "hidden",
      paddingHorizontal: 10,
      paddingVertical: 6
    }
  });
