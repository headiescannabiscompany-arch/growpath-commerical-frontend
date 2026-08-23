import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { GrowPathVideo, searchVideos } from "@/api/videos";
import { useAuth } from "@/auth/AuthContext";
import FollowButton from "@/components/FollowButton";
import { InlineError } from "@/components/InlineError";
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
import VideoCard from "@/components/videos/VideoCard";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";

export default function CreatorProfileRoute() {
  const params = useLocalSearchParams<{ ownerId?: string }>();
  const auth = useAuth();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const ownerId = String(
    Array.isArray(params.ownerId) ? params.ownerId[0] : params.ownerId || ""
  );
  const [videos, setVideos] = useState<GrowPathVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    searchVideos({ ownerId, sort: "new", limit: 50 })
      .then((rows) => {
        if (active) setVideos(rows);
      })
      .catch((reason) => {
        if (active) setError(reason);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [ownerId]);

  const owner = videos[0]?.owner;
  const signedInUserId = String(auth.user?.id || auth.user?._id || "");

  return (
    <AppPage
      routeKey="creator-profile"
      backFallbackHref="/videos"
      header={
        <View style={styles.header}>
          <Text style={styles.kicker}>GrowPath creator</Text>
          <Text accessibilityRole="header" aria-level={1} style={styles.title}>
            {owner?.displayName || (loading ? "Creator profile" : "Creator unavailable")}
          </Text>
          {owner?.workspaceType ? (
            <Text style={styles.subtitle}>{owner.workspaceType} video library</Text>
          ) : null}
        </View>
      }
    >
      {loading ? (
        <ActivityIndicator
          accessibilityLabel="Loading creator profile"
          color={palette.accent}
        />
      ) : null}
      <InlineError error={error} />
      {!loading && !error && owner ? (
        <>
          <AppCard style={styles.identityCard}>
            <View style={styles.identityCopy}>
              <Text style={styles.identityName}>{owner.displayName}</Text>
              <Text style={styles.identityMeta}>
                {videos.length} public {videos.length === 1 ? "video" : "videos"}
              </Text>
            </View>
            {auth.isAuthed && owner.id !== signedInUserId ? (
              <FollowButton userId={owner.id} />
            ) : null}
          </AppCard>
          <Text accessibilityRole="header" aria-level={2} style={styles.sectionTitle}>
            Videos you can watch
          </Text>
          <View style={styles.videoList}>
            {videos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </View>
        </>
      ) : null}
      {!loading && !error && !owner ? (
        <AppCard>
          <Text style={styles.emptyTitle}>No public creator page is available.</Text>
          <Text style={styles.emptyCopy}>
            This creator has no videos available to your account, or the shared link is no
            longer active.
          </Text>
        </AppCard>
      ) : null}
    </AppPage>
  );
}

const createStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    header: { gap: 5 },
    kicker: {
      color: palette.accent,
      fontSize: 12,
      fontWeight: "900",
      textTransform: "uppercase"
    },
    title: { color: palette.heroText, fontSize: 28, fontWeight: "900" },
    subtitle: {
      color: palette.textMuted,
      fontWeight: "700",
      textTransform: "capitalize"
    },
    identityCard: {
      alignItems: "center",
      flexDirection: "row",
      gap: 12,
      justifyContent: "space-between"
    },
    identityCopy: { flex: 1 },
    identityName: { color: palette.text, fontSize: 20, fontWeight: "900" },
    identityMeta: { color: palette.textMuted, marginTop: 4 },
    sectionTitle: {
      color: palette.text,
      fontSize: 20,
      fontWeight: "900",
      marginTop: 4
    },
    videoList: { gap: 12 },
    emptyTitle: { color: palette.text, fontSize: 18, fontWeight: "900" },
    emptyCopy: { color: palette.textMuted, lineHeight: 20, marginTop: 6 }
  });
