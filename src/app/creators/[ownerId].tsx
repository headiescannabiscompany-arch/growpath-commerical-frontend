import { useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";

import {
  getPublicCreatorProfile,
  isSafeCreatorLink,
  type CreatorPublishedProfile
} from "@/api/creatorProfile";
import { GrowPathVideo, searchVideos } from "@/api/videos";
import { useAuth } from "@/auth/AuthContext";
import FollowButton from "@/components/FollowButton";
import { InlineError } from "@/components/InlineError";
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
import PublicShareActions from "@/components/sharing/PublicShareActions";
import VideoCard from "@/components/videos/VideoCard";
import VideoReadinessBoundary from "@/components/videos/VideoReadinessBoundary";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { CREATOR_PROFILE_EDITOR_PATH } from "@/utils/authReturnPath";

export default function CreatorProfileRoute() {
  const params = useLocalSearchParams<{ ownerId?: string; from?: string | string[] }>();
  const ownerId = String(
    Array.isArray(params.ownerId) ? params.ownerId[0] : params.ownerId || ""
  );
  const backToEditor =
    (Array.isArray(params.from) ? params.from[0] : params.from) ===
    "creator-profile-editor";
  return (
    <VideoReadinessBoundary
      detail
      backFallbackHref={backToEditor ? CREATOR_PROFILE_EDITOR_PATH : "/videos"}
      preferBackFallback={backToEditor}
    >
      <ReadyCreatorProfile key={ownerId} ownerId={ownerId} backToEditor={backToEditor} />
    </VideoReadinessBoundary>
  );
}

function ReadyCreatorProfile({
  ownerId,
  backToEditor
}: {
  ownerId: string;
  backToEditor: boolean;
}) {
  const auth = useAuth();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [profile, setProfile] = useState<CreatorPublishedProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<unknown>(null);
  const [videos, setVideos] = useState<GrowPathVideo[]>([]);
  const [videosLoading, setVideosLoading] = useState(true);
  const [videosError, setVideosError] = useState<unknown>(null);
  const [linkError, setLinkError] = useState("");
  const profilePending = useRef(false);
  const videosPending = useRef(false);
  const generation = useRef(0);
  const mounted = useRef(true);
  const validOwner = /^[a-zA-Z0-9_-]{1,128}$/.test(ownerId);

  const loadProfile = useCallback(async () => {
    if (!mounted.current || profilePending.current) return;
    profilePending.current = true;
    const requestGeneration = generation.current;
    setProfileLoading(true);
    setProfileError(null);
    setProfile(null);
    setLinkError("");
    try {
      if (!validOwner) throw new Error("The creator link is incomplete or invalid.");
      const result = await getPublicCreatorProfile(ownerId);
      if (!mounted.current || requestGeneration !== generation.current) return;
      if (
        result &&
        (result.ownerId !== ownerId ||
          !result.displayName ||
          !Array.isArray(result.links))
      ) {
        throw new Error("The requested creator profile could not be verified.");
      }
      setProfile(result);
    } catch (reason) {
      if (mounted.current && requestGeneration === generation.current)
        setProfileError(reason);
    } finally {
      if (mounted.current && requestGeneration === generation.current) {
        profilePending.current = false;
        setProfileLoading(false);
      }
    }
  }, [ownerId, validOwner]);

  const loadVideos = useCallback(async () => {
    if (!mounted.current || videosPending.current) return;
    videosPending.current = true;
    const requestGeneration = generation.current;
    setVideosLoading(true);
    setVideosError(null);
    setVideos([]);
    try {
      if (!validOwner) throw new Error("The creator link is incomplete or invalid.");
      const rows = await searchVideos({ ownerId, sort: "new", limit: 50 });
      if (!mounted.current || requestGeneration !== generation.current) return;
      if (
        !Array.isArray(rows) ||
        rows.some((row) => !row?.id || row.owner?.id !== ownerId)
      ) {
        throw new Error("The requested creator videos could not be verified.");
      }
      setVideos(rows);
    } catch (reason) {
      if (mounted.current && requestGeneration === generation.current)
        setVideosError(reason);
    } finally {
      if (mounted.current && requestGeneration === generation.current) {
        videosPending.current = false;
        setVideosLoading(false);
      }
    }
  }, [ownerId, validOwner]);

  useEffect(() => {
    mounted.current = true;
    void loadProfile();
    void loadVideos();
    return () => {
      mounted.current = false;
      generation.current += 1;
      profilePending.current = false;
      videosPending.current = false;
    };
  }, [loadProfile, loadVideos]);

  const owner = videos[0]?.owner;
  const displayName = profile?.displayName || owner?.displayName;
  const signedInUserId = String(auth.user?.id || auth.user?._id || "");
  const links = (profile?.links || []).flatMap((link) => {
    return isSafeCreatorLink(link?.url) &&
      typeof link?.label === "string" &&
      link.label.trim()
      ? [{ label: link.label, url: link.url }]
      : [];
  });

  async function openLink(url: string) {
    if (!isSafeCreatorLink(url)) return;
    const requestGeneration = generation.current;
    setLinkError("");
    try {
      await Linking.openURL(url);
    } catch {
      if (mounted.current && generation.current === requestGeneration) {
        setLinkError("This external link could not be opened. Please try again.");
      }
    }
  }

  return (
    <AppPage
      routeKey="creator-profile"
      backFallbackHref={backToEditor ? CREATOR_PROFILE_EDITOR_PATH : "/videos"}
      preferBackFallback={backToEditor}
      header={
        <View style={styles.header}>
          <Text style={styles.kicker}>GrowPath creator</Text>
          <Text accessibilityRole="header" aria-level={1} style={styles.title}>
            {displayName ||
              (profileLoading || videosLoading || profileError || videosError
                ? "Creator profile"
                : "Creator unavailable")}
          </Text>
          {!profile && owner?.workspaceType ? (
            <Text style={styles.subtitle}>{owner.workspaceType} video library</Text>
          ) : null}
        </View>
      }
    >
      {profileLoading ? (
        <ActivityIndicator
          accessibilityLabel="Loading creator profile"
          color={palette.accent}
        />
      ) : null}
      {profileError ? (
        <InlineError
          title="Creator profile unavailable"
          message="The public profile could not be loaded. This does not mean it was unpublished."
          onRetry={() => void loadProfile()}
        />
      ) : null}
      {displayName ? (
        <>
          <AppCard style={styles.identityCard}>
            <View style={styles.identityCopy}>
              <Text style={styles.identityName}>{displayName}</Text>
              {!videosLoading && !videosError ? (
                <Text style={styles.identityMeta}>
                  {videos.length} {videos.length === 1 ? "video" : "videos"} available to
                  you
                </Text>
              ) : null}
            </View>
            {auth.isAuthed && ownerId !== signedInUserId ? (
              <FollowButton userId={ownerId} />
            ) : null}
          </AppCard>
        </>
      ) : null}
      {profile ? (
        <>
          {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
          {links.length ? (
            <AppCard>
              <Text accessibilityRole="header" aria-level={2} style={styles.sectionTitle}>
                Creator links
              </Text>
              <Text style={styles.emptyCopy}>These links open outside GrowPathAI.</Text>
              {links.map((link, index) => (
                <Pressable
                  key={`${index}:${link.url}`}
                  accessibilityRole="link"
                  accessibilityLabel={`${link.label} (external website)`}
                  onPress={() => void openLink(link.url)}
                  style={styles.link}
                >
                  <Text style={styles.linkLabel}>{link.label}</Text>
                  <Text style={styles.linkUrl}>{link.url}</Text>
                </Pressable>
              ))}
              {linkError ? (
                <Text accessibilityRole="alert" style={styles.linkError}>
                  {linkError}
                </Text>
              ) : null}
            </AppCard>
          ) : null}
          <PublicShareActions
            key={`${ownerId}:${profile.publishedAt}`}
            title={profile.displayName}
            path={`/creators/${encodeURIComponent(ownerId)}`}
            heading="Share creator profile"
          />
        </>
      ) : null}
      {videosLoading ? (
        <ActivityIndicator
          accessibilityLabel="Loading creator videos"
          color={palette.accent}
        />
      ) : null}
      {videosError ? (
        <InlineError
          title="Creator videos unavailable"
          message="Videos could not be loaded. Retry to check which videos you can watch."
          onRetry={() => void loadVideos()}
        />
      ) : null}
      {videos.length ? (
        <>
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
      {profile && !videosLoading && !videosError && !videos.length ? (
        <Text style={styles.emptyCopy}>
          No videos are available to you from this creator yet.
        </Text>
      ) : null}
      {!profileLoading &&
      !videosLoading &&
      !profileError &&
      !videosError &&
      !profile &&
      !owner ? (
        <AppCard>
          <Text style={styles.emptyTitle}>No public creator page is available.</Text>
          <Text style={styles.emptyCopy}>
            This creator has no published profile or videos available to you, or the
            shared link is no longer active.
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
      alignItems: "stretch",
      flexDirection: "column",
      gap: 12,
      justifyContent: "space-between"
    },
    identityCopy: { minWidth: 0, width: "100%" },
    identityName: { color: palette.text, fontSize: 20, fontWeight: "900" },
    identityMeta: { color: palette.textMuted, marginTop: 4 },
    bio: { color: palette.text, fontSize: 16, lineHeight: 24 },
    link: { paddingVertical: 12, minHeight: 44, gap: 4 },
    linkLabel: { color: palette.link, fontWeight: "700" },
    linkUrl: { color: palette.textMuted, fontSize: 13, flexShrink: 1 },
    linkError: { color: palette.danger, marginTop: 8 },
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
