import React, { useCallback, useEffect, useState } from "react";
import { Link } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";

import { listForumPosts, postId, type SocialPost } from "@/api/communitySocial";
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";

function titleOf(post: SocialPost) {
  return String(post.title || post.text || post.content || post.body || "Forum post");
}

function bodyOf(post: SocialPost) {
  return String(post.body || post.content || post.text || "");
}

export default function ForumRoute() {
  const entitlements = useEntitlements();
  const canView = entitlements.can(CAPABILITY_KEYS.FORUM_VIEW);
  const canPost = entitlements.can(CAPABILITY_KEYS.FORUM_POST);

  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedback, setFeedback] = useState("");

  const load = useCallback(async (opts?: { refresh?: boolean }) => {
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
  }, [canView]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => load({ refresh: true })} />
      }
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Forum</Text>
          <Text style={styles.subtitle}>Community discussions from the forum endpoint.</Text>
        </View>
        {canPost ? (
          <Link href="/home/personal/forum/new-post" asChild>
            <Pressable style={styles.primaryBtn}>
              <Text style={styles.primaryText}>New</Text>
            </Pressable>
          </Link>
        ) : null}
      </View>

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
      {!loading && canView && !posts.length ? (
        <View style={styles.card}>
          <Text style={styles.cardText}>No posts yet.</Text>
        </View>
      ) : null}

      {posts.map((post) => {
        const id = postId(post);
        return (
          <Link
            key={id || titleOf(post)}
            href={`/home/personal/forum/post/${encodeURIComponent(id)}`}
            asChild
          >
            <Pressable style={styles.card}>
              <Text style={styles.cardTitle}>{titleOf(post)}</Text>
              {bodyOf(post) ? (
                <Text style={styles.cardText} numberOfLines={3}>
                  {bodyOf(post)}
                </Text>
              ) : null}
              <Text style={styles.meta}>{post.likeCount || 0} likes</Text>
            </Pressable>
          </Link>
        );
      })}
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
    borderRadius: 12,
    padding: 14,
    backgroundColor: "#F8FAFC",
    gap: 6
  },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#0F172A" },
  cardText: { color: "#475569", lineHeight: 20 },
  meta: { color: "#64748B", fontSize: 12, fontWeight: "700" },
  primaryBtn: {
    alignSelf: "flex-start",
    backgroundColor: "#166534",
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  primaryText: { color: "#FFFFFF", fontWeight: "800" },
  feedback: { color: "#334155", backgroundColor: "#F1F5F9", borderRadius: 9, padding: 9, fontWeight: "700" }
});
