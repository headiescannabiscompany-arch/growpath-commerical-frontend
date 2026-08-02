import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  type ImageStyle,
  type StyleProp,
  Text,
  View
} from "react-native";

import { listForumPosts, postId, type SocialPost } from "@/api/communitySocial";
import { listVideoLibrary } from "@/api/videos";
import { useAuth } from "@/auth/AuthContext";
import PersonalFeedPlacement from "@/components/feed/PersonalFeedPlacement";
import ExpandableForumImage from "@/components/forum/ExpandableForumImage";
import InlineForumDiscussion from "@/components/forum/InlineForumDiscussion";
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import { formatBytes, videoStorageFallback } from "@/features/videos/videoPresentation";
import { type ThemePalette, useAppTheme } from "@/theme/appTheme";
import { radius } from "@/theme/theme";
import { resolveImageUri } from "@/utils/photoUploads";
import {
  flattenGrowInterests,
  matchesTieredGrowInterests,
  normalizeInterestList
} from "@/utils/growInterests";

function titleOf(post: SocialPost) {
  return String(post.title || post.text || post.content || post.body || "Forum post");
}

function bodyOf(post: SocialPost) {
  return String(post.body || post.content || post.text || "");
}

function authorOf(post: SocialPost) {
  const author = post.author || post.user || {};
  return String(author.displayName || author.name || author.email || "GrowPath member");
}

function timeOf(post: SocialPost) {
  const raw = post.createdAt || post.updatedAt;
  if (!raw) return "";
  return String(raw).slice(0, 10);
}

function tagsOf(post: SocialPost) {
  const interests = (post as any).growInterests;
  const tags =
    interests && !Array.isArray(interests)
      ? flattenGrowInterests(interests)
      : normalizeInterestList(interests);
  return Array.from(
    new Set([
      ...tags,
      ...normalizeInterestList((post as any).growTags),
      ...normalizeInterestList((post as any).tags),
      ...normalizeInterestList((post as any).topicTags)
    ])
  ).slice(0, 6);
}

function photoUri(value: any) {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "";
  return String(
    value.url ||
      value.uri ||
      value.src ||
      value.storageUrl ||
      value.imageUrl ||
      value.photoUrl ||
      value.path ||
      ""
  );
}

function photosOf(post: SocialPost): string[] {
  const rows = [
    post.photos,
    post.photoUrls,
    (post as any).imageUrls,
    (post as any).media,
    (post as any).attachments,
    post.images,
    post.imageUrl ? [post.imageUrl] : []
  ].find((value) => Array.isArray(value) && value.length);
  return ((rows || []) as unknown[])
    .map(photoUri)
    .map((uri: string) => resolveImageUri(uri))
    .filter((uri: string): uri is string => Boolean(uri));
}

function ForumPostImage({
  photo,
  index,
  style
}: {
  photo: string;
  index: number;
  style: StyleProp<ImageStyle>;
}) {
  return (
    <ExpandableForumImage
      uri={photo}
      style={style}
      label={`forum post photo ${index + 1}`}
    />
  );
}

export default function ForumRoute() {
  const auth = useAuth();
  const entitlements = useEntitlements();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createPersonalForumStyles(palette), [palette]);
  const isSignedIn = Boolean(auth.isAuthed || auth.user?.id);
  const canView = entitlements.can(CAPABILITY_KEYS.FORUM_VIEW);
  const canPost = isSignedIn && entitlements.can(CAPABILITY_KEYS.FORUM_POST);

  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [videoLibrary, setVideoLibrary] = useState<any>(null);
  const [videoLibraryLoading, setVideoLibraryLoading] = useState(true);
  const [feedScope, setFeedScope] = useState<"for-you" | "all">("for-you");
  const visiblePosts = useMemo(
    () =>
      feedScope === "all"
        ? posts
        : posts.filter((post) =>
            matchesTieredGrowInterests(tagsOf(post), auth.user?.growInterests || {})
          ),
    [auth.user?.growInterests, feedScope, posts]
  );
  const videoQuota = useMemo(() => {
    return (
      videoLibrary?.quota || {
        plan: String(entitlements.plan || "free"),
        limitBytes: videoStorageFallback(entitlements.plan),
        usedBytes: 0,
        remainingBytes: videoStorageFallback(entitlements.plan),
        externalSourcesConsumeStorage: false,
        growPathUploadsConsumeStorage: true
      }
    );
  }, [entitlements.plan, videoLibrary?.quota]);

  const load = useCallback(
    async (opts?: { refresh?: boolean }) => {
      if (!canView || !isSignedIn) {
        setLoading(false);
        return;
      }
      if (opts?.refresh) setRefreshing(true);
      else setLoading(true);
      setFeedback("");
      try {
        const postRows = await listForumPosts(
          1,
          normalizeInterestList(auth.user?.growInterests?.crops)
        );
        setPosts(postRows);
      } catch (error: any) {
        setFeedback(error?.message || "Unable to load forum posts.");
        setPosts([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [auth.user?.growInterests?.crops, canView, isSignedIn]
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let alive = true;
    async function loadLibrary() {
      if (!isSignedIn) {
        if (alive) {
          setVideoLibrary(null);
          setVideoLibraryLoading(false);
        }
        return;
      }
      if (alive) setVideoLibraryLoading(true);
      try {
        const library = await listVideoLibrary("personal");
        if (alive) setVideoLibrary(library);
      } catch {
        if (alive) setVideoLibrary(null);
      } finally {
        if (alive) setVideoLibraryLoading(false);
      }
    }
    void loadLibrary();
    return () => {
      alive = false;
    };
  }, [isSignedIn]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: palette.page }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => load({ refresh: true })}
          tintColor={palette.accent}
          colors={[palette.accent]}
          progressBackgroundColor={palette.surface}
        />
      }
    >
      <View style={styles.headerRow}>
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: palette.heroText }]}
        >
          Forum / Q&A
        </Text>
        <Text style={[styles.subtitle, { color: palette.textMuted }]}>
          Discussion, Q&amp;A, grow help, course/product/live questions, and community
          replies. Promotional feed placements around this page are campaign ads, not
          forum threads.
        </Text>
      </View>

      {canPost ? (
        <View style={styles.composerGrid}>
          <Link href="/forum/new-post" asChild>
            <Pressable
              style={StyleSheet.flatten([
                styles.composer,
                { backgroundColor: palette.accentSoft, borderColor: palette.accent }
              ])}
              accessibilityRole="button"
              accessibilityLabel="Create forum post"
            >
              <Text style={[styles.composerTitle, { color: palette.accent }]}>
                New Discussion
              </Text>
              <Text style={[styles.cardText, { color: palette.textMuted }]}>
                Ask or share with growers like you.
              </Text>
            </Pressable>
          </Link>
          <Link
            href={{
              pathname: "/forum/new-post",
              params: {
                purpose: "diagnosis",
                title: "Diagnosis help: ",
                body: "What I am seeing:\n\nWhat changed recently:\n\nEnvironment / feeding details:\n"
              }
            }}
            asChild
          >
            <Pressable
              style={StyleSheet.flatten([
                styles.quickComposer,
                { backgroundColor: palette.surface, borderColor: palette.border }
              ])}
              accessibilityRole="button"
              accessibilityLabel="Ask forum for diagnosis help"
            >
              <Text style={[styles.quickComposerTitle, { color: palette.text }]}>
                Ask for Diagnosis Help
              </Text>
              <Text style={[styles.cardText, { color: palette.textMuted }]}>
                Start with a useful issue template and add photos.
              </Text>
            </Pressable>
          </Link>
          <Link
            href={{
              pathname: "/forum/new-post",
              params: { purpose: "grow_update", title: "Grow update: " }
            }}
            asChild
          >
            <Pressable
              style={StyleSheet.flatten([
                styles.quickComposer,
                { backgroundColor: palette.surface, borderColor: palette.border }
              ])}
              accessibilityRole="button"
              accessibilityLabel="Share a grow update to forum"
            >
              <Text style={[styles.quickComposerTitle, { color: palette.text }]}>
                Share a Grow Update
              </Text>
              <Text style={[styles.cardText, { color: palette.textMuted }]}>
                Attach the grow from its dashboard for full context.
              </Text>
            </Pressable>
          </Link>
        </View>
      ) : null}

      {!isSignedIn ? (
        <View
          style={[
            styles.publicAccessCard,
            { backgroundColor: palette.surface, borderColor: palette.border }
          ]}
        >
          <Text style={[styles.cardTitle, { color: palette.text }]}>
            Sign in to browse Forum / Q&amp;A
          </Text>
          <Text style={[styles.cardText, { color: palette.textMuted }]}>
            Public visitors can learn what the GrowPath Forum covers here. Sign in or
            create a free account to browse discussions, follow grow interests, ask
            questions, or reply.
          </Text>
          <View style={styles.publicActionRow}>
            <Link
              href="/login"
              style={StyleSheet.flatten([
                styles.publicPrimaryLink,
                { backgroundColor: palette.accent, color: palette.accentText }
              ])}
            >
              Sign in
            </Link>
            <Link
              href="/register"
              style={StyleSheet.flatten([
                styles.publicSecondaryLink,
                { borderColor: palette.accent, color: palette.accent }
              ])}
            >
              Create free account
            </Link>
          </View>
        </View>
      ) : null}

      <View
        style={[
          styles.card,
          { backgroundColor: palette.surface, borderColor: palette.border }
        ]}
      >
        <Text style={[styles.cardTitle, { color: palette.text }]}>Forum videos</Text>
        <Text style={[styles.cardText, { color: palette.textMuted }]}>
          Upload clips, review storage usage, browse community videos, and reuse your
          library in courses and other workflows.
        </Text>
        {videoLibraryLoading ? (
          <Text style={[styles.cardText, { color: palette.textMuted }]}>
            Loading video storage…
          </Text>
        ) : (
          <View style={styles.videoStats}>
            <View
              style={[
                styles.videoStat,
                { backgroundColor: palette.surfaceMuted, borderColor: palette.border }
              ]}
            >
              <Text style={[styles.videoStatValue, { color: palette.text }]}>
                {formatBytes(videoQuota.usedBytes)} used
              </Text>
              <Text style={[styles.videoStatLabel, { color: palette.textMuted }]}>
                of {formatBytes(videoQuota.limitBytes)} total
              </Text>
            </View>
            <View
              style={[
                styles.videoStat,
                { backgroundColor: palette.surfaceMuted, borderColor: palette.border }
              ]}
            >
              <Text style={[styles.videoStatValue, { color: palette.text }]}>
                {Array.isArray(videoLibrary?.videos) ? videoLibrary.videos.length : 0}
              </Text>
              <Text style={[styles.videoStatLabel, { color: palette.textMuted }]}>
                Workspace videos
              </Text>
            </View>
          </View>
        )}
        <Link href="/videos?tab=library" asChild>
          <Pressable
            style={StyleSheet.flatten([
              styles.primaryBtn,
              { backgroundColor: palette.accent }
            ])}
            accessibilityRole="button"
            accessibilityLabel="Open video library"
          >
            <Text style={[styles.primaryText, { color: palette.accentText }]}>
              Open Video Library
            </Text>
          </Pressable>
        </Link>
        <Link href="/videos?tab=discover" asChild>
          <Pressable
            style={StyleSheet.flatten([
              styles.secondaryBtn,
              { borderColor: palette.accent, backgroundColor: palette.surfaceMuted }
            ])}
            accessibilityRole="button"
            accessibilityLabel="Browse videos"
          >
            <Text style={[styles.secondaryText, { color: palette.accent }]}>
              Browse Videos
            </Text>
          </Pressable>
        </Link>
      </View>

      <View style={[styles.feedHeader, { borderBottomColor: palette.border }]}>
        <Text style={[styles.feedTitle, { color: palette.text }]}>Forum Feed</Text>
        <Text style={[styles.feedSubtitle, { color: palette.textMuted }]}>
          {isSignedIn
            ? "Latest discussions from growers, tagged by grow interests."
            : "Discussions stay behind account sign-in so participation, moderation, and workspace context remain attributable."}
        </Text>
        {isSignedIn ? (
          <View style={styles.scopeRow}>
            {(["for-you", "all"] as const).map((scope) => (
              <Pressable
                key={scope}
                onPress={() => setFeedScope(scope)}
                style={[
                  styles.scopeBtn,
                  { borderColor: palette.border, backgroundColor: palette.surfaceMuted },
                  feedScope === scope && {
                    borderColor: palette.accent,
                    backgroundColor: palette.accentSoft
                  }
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: feedScope === scope }}
                accessibilityLabel={
                  scope === "for-you"
                    ? "Show forum posts for my grow interests"
                    : "Show all forum posts"
                }
              >
                <Text
                  style={[
                    styles.scopeText,
                    { color: palette.textMuted },
                    feedScope === scope && {
                      color: palette.accent
                    }
                  ]}
                >
                  {scope === "for-you" ? "For You" : "All Discussions"}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
      <PersonalFeedPlacement
        placement="top"
        routeKey="personal_forum"
        longContent
        compact
      />

      {isSignedIn && feedback ? (
        <View
          style={[
            styles.errorCard,
            { backgroundColor: palette.surfaceMuted, borderColor: palette.danger }
          ]}
        >
          <Text style={[styles.cardTitle, { color: palette.text }]}>
            Forum could not load
          </Text>
          <Text style={[styles.cardText, { color: palette.textMuted }]}>{feedback}</Text>
          <Pressable
            onPress={() => load()}
            style={[styles.primaryBtn, { backgroundColor: palette.accent }]}
            accessibilityRole="button"
            accessibilityLabel="Retry loading forum posts"
          >
            <Text style={[styles.primaryText, { color: palette.accentText }]}>Retry</Text>
          </Pressable>
        </View>
      ) : null}
      {!canView ? (
        <View
          style={[
            styles.card,
            { backgroundColor: palette.surface, borderColor: palette.border }
          ]}
        >
          <Text style={[styles.cardTitle, { color: palette.text }]}>
            Forum unavailable
          </Text>
          <Text style={[styles.cardText, { color: palette.textMuted }]}>
            This account does not have `FORUM_VIEW`.
          </Text>
        </View>
      ) : null}
      {isSignedIn && loading ? (
        <View
          style={[
            styles.card,
            { backgroundColor: palette.surface, borderColor: palette.border }
          ]}
        >
          <ActivityIndicator color={palette.accent} />
        </View>
      ) : null}
      {isSignedIn && !loading && canView && !feedback && !visiblePosts.length ? (
        <View
          style={[
            styles.card,
            { backgroundColor: palette.surface, borderColor: palette.border }
          ]}
        >
          <Text style={[styles.cardTitle, { color: palette.text }]}>
            {posts.length ? "No matching discussions" : "No posts yet"}
          </Text>
          <Text style={[styles.cardText, { color: palette.textMuted }]}>
            {posts.length
              ? "Try All Discussions, or update your grow interests in Profile."
              : "Start the first discussion for your grow interests."}
          </Text>
        </View>
      ) : null}

      {visiblePosts.map((post, index) => {
        const id = postId(post);
        const photos = photosOf(post);
        return (
          <React.Fragment key={id || titleOf(post)}>
            <View
              style={[
                styles.card,
                { backgroundColor: palette.surface, borderColor: palette.border }
              ]}
            >
              <Text style={[styles.meta, { color: palette.textMuted }]}>
                {authorOf(post)}
                {timeOf(post) ? ` | ${timeOf(post)}` : ""}
              </Text>
              <Text style={[styles.cardTitle, { color: palette.text }]}>
                {titleOf(post)}
              </Text>
              {bodyOf(post) ? (
                <Text
                  style={[styles.cardText, { color: palette.textMuted }]}
                  numberOfLines={3}
                >
                  {bodyOf(post)}
                </Text>
              ) : (
                <Text style={[styles.emptyImageText, { color: palette.textMuted }]}>
                  No text preview available
                </Text>
              )}
              {photos.length ? (
                <View style={styles.photoRow}>
                  {photos.slice(0, 3).map((photo, photoIndex) => (
                    <ForumPostImage
                      key={`${photo}-${photoIndex}`}
                      photo={photo}
                      index={photoIndex}
                      style={styles.photoThumb}
                    />
                  ))}
                </View>
              ) : (
                <Text style={[styles.emptyImageText, { color: palette.textMuted }]}>
                  No image attached
                </Text>
              )}
              {tagsOf(post).length ? (
                <View style={styles.tagRow}>
                  {tagsOf(post).map((tag) => (
                    <Text
                      key={String(tag)}
                      style={[
                        styles.tag,
                        {
                          backgroundColor: palette.surfaceMuted,
                          borderColor: palette.border,
                          color: palette.textMuted
                        }
                      ]}
                    >
                      {String(tag)}
                    </Text>
                  ))}
                </View>
              ) : null}
              <Text style={[styles.meta, { color: palette.textMuted }]}>
                {post.likeCount || 0} likes
              </Text>
              <InlineForumDiscussion
                canReply={canPost}
                replyCount={(post as any).commentCount ?? (post.comments || []).length}
                threadId={id}
                title={titleOf(post)}
              />
            </View>
            {index === 3 ? (
              <PersonalFeedPlacement
                placement="middle"
                routeKey="personal_forum"
                longContent
                compact
              />
            ) : null}
          </React.Fragment>
        );
      })}
      <PersonalFeedPlacement
        placement="bottom"
        routeKey="personal_forum"
        longContent
        compact
      />
    </ScrollView>
  );
}

export function createPersonalForumStyles(palette: ThemePalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.page },
    content: { padding: 20, paddingBottom: 36, gap: 12 },
    headerRow: { gap: 4 },
    title: { color: palette.heroText, fontSize: 24, fontWeight: "800" },
    subtitle: { color: palette.textMuted, marginTop: 4 },
    card: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      padding: 14,
      backgroundColor: palette.surface,
      gap: 6
    },
    cardTitle: { fontSize: 16, fontWeight: "800", color: palette.text },
    cardText: { color: palette.textMuted, lineHeight: 20 },
    videoStats: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      marginTop: 8
    },
    videoStat: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      flexBasis: 180,
      flexGrow: 1,
      padding: 10
    },
    videoStatValue: { color: palette.text, fontSize: 16, fontWeight: "800" },
    videoStatLabel: { color: palette.textMuted, fontSize: 12, marginTop: 2 },
    publicAccessCard: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      padding: 14,
      backgroundColor: palette.surface,
      gap: 8
    },
    publicActionRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    publicPrimaryLink: {
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      color: palette.accentText,
      fontWeight: "800",
      overflow: "hidden",
      paddingHorizontal: 14,
      paddingVertical: 10,
      textDecorationLine: "none"
    },
    publicSecondaryLink: {
      borderColor: palette.accent,
      borderWidth: 1,
      borderRadius: radius.card,
      color: palette.link,
      fontWeight: "800",
      overflow: "hidden",
      paddingHorizontal: 14,
      paddingVertical: 9,
      textDecorationLine: "none"
    },
    photoRow: {
      alignItems: "center",
      gap: 8,
      marginTop: 6,
      width: "100%"
    },
    photoThumb: {
      width: "100%",
      maxWidth: 680,
      aspectRatio: 4 / 3,
      alignSelf: "center",
      borderRadius: radius.card,
      backgroundColor: palette.surfaceMuted
    },
    composer: {
      borderWidth: 1,
      borderColor: palette.accent,
      borderRadius: radius.card,
      padding: 14,
      backgroundColor: palette.accentSoft,
      gap: 4
    },
    composerGrid: { gap: 10 },
    quickComposer: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      padding: 12,
      backgroundColor: palette.surface,
      gap: 4
    },
    quickComposerTitle: { color: palette.text, fontSize: 15, fontWeight: "900" },
    composerTitle: { color: palette.accent, fontSize: 16, fontWeight: "900" },
    feedHeader: {
      borderBottomWidth: 1,
      borderBottomColor: palette.border,
      paddingTop: 6,
      paddingBottom: 10
    },
    feedTitle: { color: palette.text, fontSize: 18, fontWeight: "900" },
    feedSubtitle: { color: palette.textMuted, marginTop: 2 },
    scopeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
    scopeBtn: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 999,
      paddingHorizontal: 11,
      paddingVertical: 7
    },
    scopeBtnActive: { borderColor: palette.accent, backgroundColor: palette.accentSoft },
    scopeText: { color: palette.textMuted, fontSize: 12, fontWeight: "800" },
    scopeTextActive: { color: palette.accent },
    tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    tag: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 3,
      color: palette.textMuted,
      fontSize: 12,
      fontWeight: "700"
    },
    emptyImageText: { color: palette.textMuted, fontSize: 12, fontWeight: "700" },
    photoFallback: {
      alignItems: "center",
      justifyContent: "center",
      padding: 8
    },
    meta: { color: palette.textMuted, fontSize: 12, fontWeight: "700" },
    primaryBtn: {
      alignSelf: "flex-start",
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      paddingHorizontal: 12,
      paddingVertical: 9
    },
    primaryText: { color: palette.accentText, fontWeight: "800" },
    secondaryBtn: {
      alignSelf: "flex-start",
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.accent,
      borderRadius: radius.card,
      borderWidth: 1,
      marginTop: 8,
      paddingHorizontal: 12,
      paddingVertical: 8
    },
    secondaryText: { color: palette.link, fontWeight: "800" },
    feedback: {
      color: palette.text,
      backgroundColor: palette.surfaceMuted,
      borderRadius: radius.card,
      padding: 9,
      fontWeight: "700"
    },
    errorCard: {
      borderWidth: 1,
      borderColor: palette.danger,
      borderRadius: radius.card,
      padding: 14,
      backgroundColor: palette.surfaceMuted,
      gap: 8
    }
  });
}
