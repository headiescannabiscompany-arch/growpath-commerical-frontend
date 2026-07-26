import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { getVideo, GrowPathVideo } from "@/api/videos";
import { useAuth } from "@/auth/AuthContext";
import FollowButton from "@/components/FollowButton";
import { InlineError } from "@/components/InlineError";
import LessonMediaCard from "@/components/learning/LessonMediaCard";
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
import { formatDuration } from "@/features/videos/videoPresentation";
import { radius } from "@/theme/theme";

export default function VideoDetailRoute() {
  const params = useLocalSearchParams<{ videoId?: string }>();
  const router = useRouter();
  const auth = useAuth();
  const videoId = String(
    Array.isArray(params.videoId) ? params.videoId[0] : params.videoId || ""
  );
  const [video, setVideo] = useState<GrowPathVideo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

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
      header={
        <View>
          <Pressable
            accessibilityLabel="Back to videos"
            accessibilityRole="button"
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={styles.backText}>Back to Videos</Text>
          </Pressable>
          <Text accessibilityRole="header" style={styles.title}>
            {video?.title || "Video"}
          </Text>
        </View>
      }
    >
      {loading ? <ActivityIndicator accessibilityLabel="Loading video" /> : null}
      <InlineError error={error} />
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
              <Text style={styles.sectionTitle}>Topics</Text>
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
    </AppPage>
  );
}

const styles = StyleSheet.create({
  backButton: { alignSelf: "flex-start", marginBottom: 8 },
  backText: { color: "#166534", fontWeight: "800" },
  title: { color: "#0F172A", fontSize: 28, fontWeight: "900" },
  ownerRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between"
  },
  ownerCopy: { flex: 1 },
  owner: { color: "#0F172A", fontSize: 17, fontWeight: "800" },
  meta: { color: "#64748B", fontSize: 12, marginTop: 3, textTransform: "capitalize" },
  description: { color: "#334155", lineHeight: 21, marginTop: 12 },
  context: {
    backgroundColor: "#F0FDF4",
    borderRadius: radius.card,
    color: "#166534",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 12,
    padding: 10
  },
  sectionTitle: { color: "#0F172A", fontSize: 18, fontWeight: "800" },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 9 },
  tag: {
    backgroundColor: "#E2E8F0",
    borderRadius: 999,
    color: "#334155",
    fontSize: 12,
    fontWeight: "700",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 6
  }
});
