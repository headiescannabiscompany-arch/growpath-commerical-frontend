import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import {
  addForumComment,
  getForumPost,
  likeForumPost,
  listForumComments,
  postId,
  reportForumPost,
  saveForumPostToGrowLog,
  type SocialPost,
  unlikeForumPost
} from "@/api/communitySocial";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import PersonalFeedPlacement from "@/components/feed/PersonalFeedPlacement";
import { resolveImageUri } from "@/utils/photoUploads";

type CommentRow = {
  id?: string;
  _id?: string;
  text?: string;
  body?: string;
  content?: string;
  author?: any;
  user?: any;
  createdAt?: string;
};

function getId(params: Record<string, any>): string {
  const raw = params?.id;
  if (Array.isArray(raw)) return String(raw[0] ?? "");
  return String(raw ?? "");
}

function param(value: unknown): string {
  if (Array.isArray(value)) return String(value[0] ?? "");
  return String(value ?? "");
}

function authorName(row: any) {
  const author = row?.author || row?.user;
  return String(
    author?.name || author?.username || row?.authorName || "Community member"
  );
}

function bodyOf(row: any) {
  return String(row?.body || row?.content || row?.text || "");
}

function titleOf(post: SocialPost | null) {
  return String(post?.title || post?.text || post?.content || post?.body || "Forum post");
}

function photosOf(post: SocialPost | null) {
  if (!post) return [];
  const rows = [
    post.photos,
    post.photoUrls,
    post.images,
    post.imageUrl ? [post.imageUrl] : []
  ].find((value) => Array.isArray(value) && value.length);
  return (rows || []).map((uri) => resolveImageUri(uri)).filter(Boolean);
}

function likedByViewer(post: SocialPost | null) {
  return Boolean(
    (post as any)?.viewerHasLiked ||
    (post as any)?.currentUserLiked ||
    (post as any)?.liked ||
    (post as any)?.isLiked
  );
}

function likeTotal(post: SocialPost | null) {
  if (!post) return 0;
  if (typeof post.likeCount === "number") return post.likeCount;
  return Array.isArray(post.likes) ? post.likes.length : 0;
}

export default function ForumPostDetailRoute() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const id = getId(params as any);
  const growId = param((params as any).growId);
  const entitlements = useEntitlements();
  const canView = entitlements.can(CAPABILITY_KEYS.FORUM_VIEW);
  const canPost = entitlements.can(CAPABILITY_KEYS.FORUM_POST);

  const [post, setPost] = useState<SocialPost | null>(null);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [commentText, setCommentText] = useState("");
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");

  const loadedId = useMemo(() => postId(post), [post]);

  const load = useCallback(
    async (opts?: { refresh?: boolean }) => {
      if (!id || !canView) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (opts?.refresh) setRefreshing(true);
      else setLoading(true);
      setFeedback("");

      try {
        const [nextPost, nextComments] = await Promise.all([
          getForumPost(id),
          listForumComments(id)
        ]);
        setPost(nextPost);
        setComments(nextComments);
        setLiked(likedByViewer(nextPost));
        setLikes(likeTotal(nextPost));
      } catch (error: any) {
        setFeedback(error?.message || "Unable to load discussion.");
        setPost(null);
        setComments([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [canView, id]
  );

  useEffect(() => {
    load();
  }, [load]);

  async function toggleLike() {
    const targetId = loadedId || id;
    if (!targetId || !canPost) return;
    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikes((value) => Math.max(0, value + (nextLiked ? 1 : -1)));
    setSaving(true);
    setFeedback("");
    try {
      if (nextLiked) await likeForumPost(targetId);
      else await unlikeForumPost(targetId);
    } catch (error: any) {
      setLiked(!nextLiked);
      setLikes((value) => Math.max(0, value + (nextLiked ? -1 : 1)));
      setFeedback(error?.message || "Unable to update like.");
    } finally {
      setSaving(false);
    }
  }

  async function submitComment() {
    const targetId = loadedId || id;
    const text = commentText.trim();
    if (!targetId || !text || !canPost) return;
    setSaving(true);
    setFeedback("");
    try {
      await addForumComment(targetId, text);
      setCommentText("");
      const nextComments = await listForumComments(targetId);
      setComments(nextComments);
    } catch (error: any) {
      setFeedback(error?.message || "Unable to add comment.");
    } finally {
      setSaving(false);
    }
  }

  async function saveToGrowLog() {
    const targetId = loadedId || id;
    if (!targetId || !growId || !canPost) return;
    setSaving(true);
    setFeedback("");
    try {
      await saveForumPostToGrowLog(targetId, growId);
      setFeedback("Post saved to grow journal.");
    } catch (error: any) {
      setFeedback(error?.message || "Unable to save post to grow journal.");
    } finally {
      setSaving(false);
    }
  }

  async function reportPost() {
    const targetId = loadedId || id;
    if (!targetId || !canPost) return;
    setSaving(true);
    setFeedback("");
    try {
      await reportForumPost(targetId, {
        reason: "other",
        details: "Reported from personal forum post detail screen."
      });
      setFeedback("Report sent for moderation review.");
    } catch (error: any) {
      setFeedback(error?.message || "Unable to report this post.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScreenBoundary name="personal.forum.postDetail">
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
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back to forum"
        >
          <Text style={styles.backLink}>Back</Text>
        </Pressable>

        {!canView ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Forum unavailable</Text>
            <Text style={styles.cardText}>This account does not have `FORUM_VIEW`.</Text>
          </View>
        ) : null}

        {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}

        {loading ? (
          <View style={styles.card}>
            <ActivityIndicator />
          </View>
        ) : null}

        {!loading && canView ? (
          <View style={styles.card}>
            {post ? (
              <>
                <Text style={styles.title}>{titleOf(post)}</Text>
                <PersonalFeedPlacement
                  placement="top"
                  routeKey="personal_forum_post_id"
                  longContent
                />
                <Text style={styles.meta}>
                  {authorName(post)}
                  {post.createdAt
                    ? ` | ${new Date(post.createdAt).toLocaleString()}`
                    : ""}
                </Text>
                {bodyOf(post) ? <Text style={styles.body}>{bodyOf(post)}</Text> : null}
                {photosOf(post).length ? (
                  <View style={styles.photoGrid}>
                    {photosOf(post).map((photo, index) => (
                      <Image
                        key={`${photo}-${index}`}
                        source={{ uri: photo }}
                        style={styles.postPhoto}
                        resizeMode="cover"
                        accessibilityLabel={`Forum post photo ${index + 1}`}
                      />
                    ))}
                  </View>
                ) : null}
                <View style={styles.actions}>
                  <Pressable
                    disabled={!canPost || saving}
                    onPress={toggleLike}
                    style={[styles.secondaryBtn, (!canPost || saving) && styles.disabled]}
                    accessibilityRole="button"
                    accessibilityLabel={liked ? "Unlike forum post" : "Like forum post"}
                  >
                    <Text style={styles.secondaryText}>{liked ? "Unlike" : "Like"}</Text>
                  </Pressable>
                  {growId ? (
                    <Pressable
                      disabled={!canPost || saving}
                      onPress={saveToGrowLog}
                      style={[
                        styles.secondaryBtn,
                        (!canPost || saving) && styles.disabled
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel="Save forum post to grow log"
                    >
                      <Text style={styles.secondaryText}>Save to Log</Text>
                    </Pressable>
                  ) : null}
                  <Pressable
                    disabled={!canPost || saving}
                    onPress={reportPost}
                    style={[styles.dangerBtn, (!canPost || saving) && styles.disabled]}
                    accessibilityRole="button"
                    accessibilityLabel="Report forum post"
                  >
                    <Text style={styles.dangerText}>Report</Text>
                  </Pressable>
                  <Text style={styles.meta}>{likes} likes</Text>
                </View>
              </>
            ) : (
              <Text style={styles.cardText}>
                {id ? "No post returned." : "Missing post id."}
              </Text>
            )}
          </View>
        ) : null}

        {canView ? (
          <PersonalFeedPlacement
            placement="middle"
            routeKey="personal_forum_post_id"
            longContent
          />
        ) : null}

        {canView ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Comments</Text>
            {canPost ? (
              <View style={styles.commentComposer}>
                <TextInput
                  value={commentText}
                  onChangeText={setCommentText}
                  placeholder="Add a comment..."
                  multiline
                  editable={!saving}
                  style={[styles.input, styles.commentInput]}
                  accessibilityLabel="Forum comment"
                />
                <Pressable
                  disabled={!commentText.trim() || saving}
                  onPress={submitComment}
                  style={[
                    styles.primaryBtn,
                    (!commentText.trim() || saving) && styles.disabled
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Submit forum comment"
                >
                  <Text style={styles.primaryText}>Comment</Text>
                </Pressable>
              </View>
            ) : (
              <Text style={styles.cardText}>Commenting requires `FORUM_POST`.</Text>
            )}

            {comments.map((comment) => (
              <View
                key={String(comment._id || comment.id || bodyOf(comment))}
                style={styles.comment}
              >
                <Text style={styles.rowTitle}>{authorName(comment)}</Text>
                <Text style={styles.cardText}>
                  {bodyOf(comment) || "No comment text."}
                </Text>
              </View>
            ))}
            {!comments.length ? (
              <Text style={styles.cardText}>No comments yet.</Text>
            ) : null}
          </View>
        ) : null}

        <PersonalFeedPlacement
          placement="bottom"
          routeKey="personal_forum_post_id"
          longContent
        />
      </ScrollView>
    </ScreenBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  content: { padding: 20, paddingBottom: 36, gap: 12 },
  title: { fontSize: 24, fontWeight: "800", color: "#0F172A" },
  body: { color: "#334155", lineHeight: 21, marginTop: 10 },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 8 },
  postPhoto: {
    width: 160,
    height: 120,
    borderRadius: 8,
    backgroundColor: "#E2E8F0"
  },
  card: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 14,
    backgroundColor: "#F8FAFC",
    gap: 8
  },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#0F172A" },
  cardText: { color: "#475569", lineHeight: 20 },
  rowTitle: { fontWeight: "800", color: "#0F172A" },
  meta: { color: "#64748B", fontSize: 12, fontWeight: "700" },
  actions: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 6 },
  commentComposer: { gap: 8 },
  comment: {
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 10,
    gap: 4
  },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF"
  },
  commentInput: { minHeight: 90, textAlignVertical: "top" },
  primaryBtn: {
    alignSelf: "flex-start",
    backgroundColor: "#166534",
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  primaryText: { color: "#FFFFFF", fontWeight: "800" },
  secondaryBtn: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: "#FFFFFF"
  },
  secondaryText: { color: "#0F172A", fontWeight: "800" },
  dangerBtn: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: "#FEF2F2"
  },
  dangerText: { color: "#991B1B", fontWeight: "800" },
  disabled: { opacity: 0.5 },
  backLink: { color: "#166534", fontWeight: "800" },
  feedback: {
    color: "#334155",
    backgroundColor: "#F1F5F9",
    borderRadius: 9,
    padding: 9,
    fontWeight: "700"
  }
});
