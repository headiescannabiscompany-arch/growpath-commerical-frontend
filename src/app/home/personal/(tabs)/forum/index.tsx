import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "expo-router";
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";

import { listForumPosts, postId, type SocialPost } from "@/api/communitySocial";
import { useAuth } from "@/auth/AuthContext";
import PersonalFeedPlacement from "@/components/feed/PersonalFeedPlacement";
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import { radius } from "@/theme/theme";
import { resolveImageUri } from "@/utils/photoUploads";
import { flattenGrowInterests, normalizeInterestList } from "@/utils/growInterests";

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

function matchesInterests(post: SocialPost, interests: string[]) {
  const tags = tagsOf(post);
  if (!tags.length || !interests.length) return true;
  const selected = new Set(interests.map((item) => item.toLowerCase()));
  return tags.some((tag) => selected.has(String(tag).toLowerCase()));
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

function ForumPostImage({ photo, index }: { photo: string; index: number }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <View style={[styles.photoThumb, styles.photoFallback]}>
        <Text style={styles.emptyImageText}>Image failed to load</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: photo }}
      style={styles.photoThumb}
      resizeMode="cover"
      accessibilityLabel={`Forum post photo ${index + 1}`}
      onError={() => setFailed(true)}
    />
  );
}

export default function ForumRoute() {
  const auth = useAuth();
  const entitlements = useEntitlements();
  const canView = entitlements.can(CAPABILITY_KEYS.FORUM_VIEW);
  const canPost = entitlements.can(CAPABILITY_KEYS.FORUM_POST);

  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [feedScope, setFeedScope] = useState<"for-you" | "all">("for-you");
  const userInterests = useMemo(
    () => flattenGrowInterests(auth.user?.growInterests || {}),
    [auth.user?.growInterests]
  );
  const visiblePosts = useMemo(
    () =>
      feedScope === "all"
        ? posts
        : posts.filter((post) => matchesInterests(post, userInterests)),
    [feedScope, posts, userInterests]
  );

  const load = useCallback(
    async (opts?: { refresh?: boolean }) => {
      if (!canView) {
        setLoading(false);
        return;
      }
      if (opts?.refresh) setRefreshing(true);
      else setLoading(true);
      setFeedback("");
      try {
        const postRows = await listForumPosts();
        setPosts(postRows);
      } catch (error: any) {
        setFeedback(error?.message || "Unable to load forum posts.");
        setPosts([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [canView]
  );

  useEffect(() => {
    load();
  }, [load]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => load({ refresh: true })}
        />
      }
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Forum / Q&A</Text>
          <Text style={styles.subtitle}>
            Discussion, Q&A, grow help, course/product/live questions, and community
            replies. Promotional feed placements around this page are campaign ads, not
            forum threads.
          </Text>
        </View>
      </View>
      {canPost ? (
        <View style={styles.composerGrid}>
          <Link href="/forum/new-post" asChild>
            <Pressable
              style={styles.composer}
              accessibilityRole="button"
              accessibilityLabel="Create forum post"
            >
              <Text style={styles.composerTitle}>New Discussion</Text>
              <Text style={styles.cardText}>Ask or share with growers like you.</Text>
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
              style={styles.quickComposer}
              accessibilityRole="button"
              accessibilityLabel="Ask forum for diagnosis help"
            >
              <Text style={styles.quickComposerTitle}>Ask for Diagnosis Help</Text>
              <Text style={styles.cardText}>
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
              style={styles.quickComposer}
              accessibilityRole="button"
              accessibilityLabel="Share a grow update to forum"
            >
              <Text style={styles.quickComposerTitle}>Share a Grow Update</Text>
              <Text style={styles.cardText}>
                Attach the grow from its dashboard for full context.
              </Text>
            </Pressable>
          </Link>
        </View>
      ) : null}

      <View style={styles.feedHeader}>
        <Text style={styles.feedTitle}>Forum Feed</Text>
        <Text style={styles.feedSubtitle}>
          Latest discussions from growers, tagged by grow interests.
        </Text>
        <View style={styles.scopeRow}>
          {(["for-you", "all"] as const).map((scope) => (
            <Pressable
              key={scope}
              onPress={() => setFeedScope(scope)}
              style={[styles.scopeBtn, feedScope === scope && styles.scopeBtnActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: feedScope === scope }}
              accessibilityLabel={
                scope === "for-you"
                  ? "Show forum posts for my grow interests"
                  : "Show all forum posts"
              }
            >
              <Text
                style={[styles.scopeText, feedScope === scope && styles.scopeTextActive]}
              >
                {scope === "for-you" ? "For You" : "All Discussions"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {feedback ? (
        <View style={styles.errorCard}>
          <Text style={styles.cardTitle}>Forum could not load</Text>
          <Text style={styles.cardText}>{feedback}</Text>
          <Pressable
            onPress={() => load()}
            style={styles.primaryBtn}
            accessibilityRole="button"
            accessibilityLabel="Retry loading forum posts"
          >
            <Text style={styles.primaryText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}
      {!canView ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Forum unavailable</Text>
          <Text style={styles.cardText}>This account does not have `FORUM_VIEW`.</Text>
        </View>
      ) : null}
      {loading ? (
        <View style={styles.card}>
          <ActivityIndicator />
        </View>
      ) : null}
      {!loading && canView && !feedback && !visiblePosts.length ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {posts.length ? "No matching discussions" : "No posts yet"}
          </Text>
          <Text style={styles.cardText}>
            {posts.length
              ? "Try All Discussions, or update your grow interests in Profile."
              : "Start the first discussion for your grow interests."}
          </Text>
        </View>
      ) : null}

      {visiblePosts.map((post) => {
        const id = postId(post);
        const photos = photosOf(post);
        return (
          <Link
            key={id || titleOf(post)}
            href={{ pathname: "/forum/post", params: { id } }}
            asChild
          >
            <Pressable
              style={styles.card}
              accessibilityRole="link"
              accessibilityLabel={`Open forum post ${titleOf(post)}`}
            >
              <Text style={styles.meta}>
                {authorOf(post)}
                {timeOf(post) ? ` | ${timeOf(post)}` : ""}
              </Text>
              <Text style={styles.cardTitle}>{titleOf(post)}</Text>
              {bodyOf(post) ? (
                <Text style={styles.cardText} numberOfLines={3}>
                  {bodyOf(post)}
                </Text>
              ) : (
                <Text style={styles.emptyImageText}>No text preview available</Text>
              )}
              {photos.length ? (
                <View style={styles.photoRow}>
                  {photos.slice(0, 3).map((photo, index) => (
                    <ForumPostImage
                      key={`${photo}-${index}`}
                      photo={photo}
                      index={index}
                    />
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyImageText}>No image attached</Text>
              )}
              {tagsOf(post).length ? (
                <View style={styles.tagRow}>
                  {tagsOf(post).map((tag) => (
                    <Text key={String(tag)} style={styles.tag}>
                      {String(tag)}
                    </Text>
                  ))}
                </View>
              ) : null}
              <Text style={styles.meta}>
                {post.likeCount || 0} likes |{" "}
                {(post as any).commentCount ?? (post.comments || []).length} replies
              </Text>
              <Text style={styles.openText}>Open discussion</Text>
            </Pressable>
          </Link>
        );
      })}
      <PersonalFeedPlacement placement="top" routeKey="personal_forum" longContent />
      <PersonalFeedPlacement placement="middle" routeKey="personal_forum" longContent />
      <PersonalFeedPlacement placement="bottom" routeKey="personal_forum" longContent />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  content: { padding: 20, paddingBottom: 36, gap: 12 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  title: { fontSize: 24, fontWeight: "800" },
  subtitle: { color: "#64748B", marginTop: 4 },
  card: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: radius.card,
    padding: 14,
    backgroundColor: "#F8FAFC",
    gap: 6
  },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#0F172A" },
  cardText: { color: "#475569", lineHeight: 20 },
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
    backgroundColor: "#E2E8F0"
  },
  composer: {
    borderWidth: 1,
    borderColor: "#166534",
    borderRadius: radius.card,
    padding: 14,
    backgroundColor: "#F0FDF4",
    gap: 4
  },
  composerGrid: { gap: 10 },
  quickComposer: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    padding: 12,
    backgroundColor: "#FFFFFF",
    gap: 4
  },
  quickComposerTitle: { color: "#0F172A", fontSize: 15, fontWeight: "900" },
  composerTitle: { color: "#166534", fontSize: 16, fontWeight: "900" },
  feedHeader: {
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingTop: 6,
    paddingBottom: 10
  },
  feedTitle: { color: "#0F172A", fontSize: 18, fontWeight: "900" },
  feedSubtitle: { color: "#64748B", marginTop: 2 },
  scopeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  scopeBtn: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7
  },
  scopeBtnActive: { borderColor: "#166534", backgroundColor: "#DCFCE7" },
  scopeText: { color: "#475569", fontSize: 12, fontWeight: "800" },
  scopeTextActive: { color: "#166534" },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    color: "#475569",
    fontSize: 12,
    fontWeight: "700"
  },
  emptyImageText: { color: "#64748B", fontSize: 12, fontWeight: "700" },
  photoFallback: {
    alignItems: "center",
    justifyContent: "center",
    padding: 8
  },
  openText: { color: "#166534", fontWeight: "900", marginTop: 4 },
  meta: { color: "#64748B", fontSize: 12, fontWeight: "700" },
  primaryBtn: {
    alignSelf: "flex-start",
    backgroundColor: "#166534",
    borderRadius: radius.card,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  primaryText: { color: "#FFFFFF", fontWeight: "800" },
  feedback: {
    color: "#334155",
    backgroundColor: "#F1F5F9",
    borderRadius: radius.card,
    padding: 9,
    fontWeight: "700"
  },
  errorCard: {
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: radius.card,
    padding: 14,
    backgroundColor: "#FEF2F2",
    gap: 8
  }
});
