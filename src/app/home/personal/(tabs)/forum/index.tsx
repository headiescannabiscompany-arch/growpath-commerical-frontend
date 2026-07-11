import React, { useCallback, useEffect, useState } from "react";
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
import PersonalFeedPlacement from "@/components/feed/PersonalFeedPlacement";
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import { radius } from "@/theme/theme";
import { resolveImageUri } from "@/utils/photoUploads";

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
  const tags =
    (post as any).growInterests ||
    (post as any).growTags ||
    (post as any).tags ||
    (post as any).topicTags ||
    [];
  return Array.isArray(tags) ? tags.filter(Boolean).slice(0, 4) : [];
}

function photosOf(post: SocialPost) {
  const rows = [
    post.photos,
    post.photoUrls,
    post.images,
    post.imageUrl ? [post.imageUrl] : []
  ].find((value) => Array.isArray(value) && value.length);
  return (rows || []).map((uri) => resolveImageUri(uri)).filter(Boolean);
}

export default function ForumRoute() {
  const entitlements = useEntitlements();
  const canView = entitlements.can(CAPABILITY_KEYS.FORUM_VIEW);
  const canPost = entitlements.can(CAPABILITY_KEYS.FORUM_POST);

  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedback, setFeedback] = useState("");

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
        setPosts(await listForumPosts());
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
        <Link href="/home/personal/forum/new-post" asChild>
          <Pressable
            style={styles.composer}
            accessibilityRole="button"
            accessibilityLabel="Create forum post"
          >
            <Text style={styles.composerTitle}>New Discussion</Text>
            <Text style={styles.cardText}>What do you want to ask or share?</Text>
          </Pressable>
        </Link>
      ) : null}
      <PersonalFeedPlacement placement="top" routeKey="personal_forum" longContent />

      {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
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
      {!loading && canView && !feedback && !posts.length ? (
        <View style={styles.card}>
          <Text style={styles.cardText}>No posts yet.</Text>
        </View>
      ) : null}

      <PersonalFeedPlacement placement="middle" routeKey="personal_forum" longContent />

      {posts.map((post) => {
        const id = postId(post);
        const photos = photosOf(post);
        return (
          <Link
            key={id || titleOf(post)}
            href={`/home/personal/forum/post/${encodeURIComponent(id)}`}
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
                    <Image
                      key={`${photo}-${index}`}
                      source={{ uri: photo }}
                      style={styles.photoThumb}
                      resizeMode="cover"
                      accessibilityLabel={`Forum post photo ${index + 1}`}
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
                {post.likeCount || 0} likes | {(post.comments || []).length} replies
              </Text>
              <Text style={styles.openText}>Open discussion</Text>
            </Pressable>
          </Link>
        );
      })}
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
  photoRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  photoThumb: {
    width: 96,
    height: 72,
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
  composerTitle: { color: "#166534", fontSize: 16, fontWeight: "900" },
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
  }
});
