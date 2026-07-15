import React, { useCallback, useEffect, useMemo, useState } from "react";
import * as ImagePicker from "expo-image-picker";
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
import { useLocalSearchParams } from "expo-router";

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
import { createPersonalTask } from "@/api/tasks";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import PersonalFeedPlacement from "@/components/feed/PersonalFeedPlacement";
import { radius } from "@/theme/theme";
import { resolveImageUri } from "@/utils/photoUploads";
import { flattenGrowInterests, normalizeInterestList } from "@/utils/growInterests";

type CommentRow = {
  id?: string;
  _id?: string;
  text?: string;
  body?: string;
  content?: string;
  author?: any;
  user?: any;
  createdAt?: string;
  photos?: string[];
  attachments?: any[];
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
  return String(author?.name || author?.username || row?.authorName || "Forum member");
}

function bodyOf(row: any) {
  return String(row?.body || row?.content || row?.text || "");
}

function commentPhotos(row: CommentRow): string[] {
  const structured = [row?.photos, row?.attachments]
    .filter(Array.isArray)
    .flat()
    .map(photoUri)
    .filter(Boolean);
  const embedded = bodyOf(row)
    .split(/\s+/)
    .filter((value) => /^https?:\/\//i.test(value) || value.startsWith("/uploads/"));
  return Array.from(new Set([...structured, ...embedded]))
    .map((uri: string) => resolveImageUri(uri))
    .filter((uri: string): uri is string => Boolean(uri));
}

function visibleCommentBody(row: CommentRow) {
  const photoSet = new Set(commentPhotos(row));
  return bodyOf(row)
    .split("\n")
    .filter((line) => !photoSet.has(resolveImageUri(line.trim())))
    .join("\n")
    .trim();
}

function titleOf(post: SocialPost | null) {
  return String(post?.title || post?.text || post?.content || post?.body || "Forum post");
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

function photosOf(post: SocialPost | null): string[] {
  if (!post) return [];
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

function tagsOf(post: SocialPost | null) {
  if (!post) return [];
  const interests = (post as any).growInterests;
  const structured =
    interests && !Array.isArray(interests)
      ? flattenGrowInterests(interests)
      : normalizeInterestList(interests);
  return Array.from(
    new Set([
      ...structured,
      ...normalizeInterestList((post as any).growTags),
      ...normalizeInterestList((post as any).tags)
    ])
  );
}

function ForumImage({ uri, style, label }: { uri: string; style: any; label: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <View
        style={[style, styles.imageFallback]}
        accessibilityLabel={`${label} unavailable`}
      >
        <Text style={styles.imageFallbackText}>Photo unavailable</Text>
      </View>
    );
  }
  return (
    <Image
      source={{ uri }}
      style={style}
      resizeMode="cover"
      accessibilityLabel={label}
      onError={() => setFailed(true)}
    />
  );
}

export default function ForumPostDetailRoute() {
  const params = useLocalSearchParams();
  const id = getId(params as any);
  const growId = param((params as any).growId);
  const entitlements = useEntitlements();
  const canView = entitlements.can(CAPABILITY_KEYS.FORUM_VIEW);
  const canPost = entitlements.can(CAPABILITY_KEYS.FORUM_POST);

  const [post, setPost] = useState<SocialPost | null>(null);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [commentText, setCommentText] = useState("");
  const [commentPhotoUris, setCommentPhotoUris] = useState<string[]>([]);
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);
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
    if (!targetId || (!text && !commentPhotoUris.length) || !canPost) return;
    setSaving(true);
    setFeedback("");
    try {
      const created: any = await addForumComment(
        targetId,
        text || "Photo comment",
        commentPhotoUris
      );
      if (created?.isHidden || created?.moderationStatus === "held") {
        setFeedback(
          created?.moderationNotice ||
            "This comment is hidden while a human moderator reviews it."
        );
        return;
      }
      setCommentText("");
      setCommentPhotoUris([]);
      const nextComments = await listForumComments(targetId);
      setComments(nextComments);
    } catch (error: any) {
      setFeedback(error?.message || "Unable to add comment.");
    } finally {
      setSaving(false);
    }
  }

  async function pickCommentPhotos() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setFeedback("Photo-library permission is required to add comment photos.");
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      allowsEditing: false,
      quality: 0.8
    });
    if (picked.canceled) return;
    setCommentPhotoUris((current) => [
      ...current,
      ...picked.assets.map((asset) => asset.uri).filter(Boolean)
    ]);
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

  async function createFollowUpTask() {
    const targetId = loadedId || id;
    if (!targetId || !growId || !canPost || creatingTask) return;
    setCreatingTask(true);
    setFeedback("");
    const due = new Date();
    due.setDate(due.getDate() + 3);
    try {
      const created = await createPersonalTask({
        growId,
        linkedGrowId: growId,
        title: `Follow up on forum advice: ${titleOf(post)}`,
        description: [
          "Created from a Forum/Q&A discussion so community advice becomes trackable grow work.",
          bodyOf(post) ? `Post context: ${bodyOf(post)}` : "",
          comments.length
            ? `Current comments: ${comments
                .slice(0, 3)
                .map((comment) => bodyOf(comment))
                .filter(Boolean)
                .join(" | ")}`
            : ""
        ]
          .filter(Boolean)
          .join("\n"),
        dueDate: due.toISOString().slice(0, 10),
        priority: "medium",
        allDay: true,
        calendarType: "forum_followup",
        sourceStage: "forum_advice_review",
        sourceType: "forum",
        sourceObjectId: targetId,
        linkedForumThreadId: targetId,
        reminderPlan: { label: "24 hours before", channels: ["in_app"] }
      });
      setFeedback(created ? "Forum follow-up task created." : "Unable to create task.");
    } catch (error: any) {
      setFeedback(error?.message || "Unable to create task.");
    } finally {
      setCreatingTask(false);
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
    <ScreenBoundary
      name="personal.forum.postDetail"
      showBack
      backFallbackHref="/home/personal/forum"
    >
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
                {tagsOf(post).length ? (
                  <View style={styles.tagRow}>
                    {tagsOf(post).map((tag) => (
                      <Text key={tag} style={styles.tag}>
                        {tag}
                      </Text>
                    ))}
                  </View>
                ) : null}
                {(post as any).growId || (post as any).linkedGrowId ? (
                  <Text style={styles.contextText}>
                    Attached grow: {(post as any).growId || (post as any).linkedGrowId}
                  </Text>
                ) : null}
                {photosOf(post).length ? (
                  <View style={styles.photoGrid}>
                    {photosOf(post).map((photo, index) => (
                      <ForumImage
                        key={`${photo}-${index}`}
                        uri={photo}
                        style={styles.postPhoto}
                        label={`Forum post photo ${index + 1}`}
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
                    <>
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
                      <Pressable
                        disabled={!canPost || creatingTask}
                        onPress={createFollowUpTask}
                        style={[
                          styles.secondaryBtn,
                          (!canPost || creatingTask) && styles.disabled
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel="Create forum follow-up task"
                      >
                        <Text style={styles.secondaryText}>
                          {creatingTask ? "Creating..." : "Create Task"}
                        </Text>
                      </Pressable>
                    </>
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
                  disabled={saving}
                  onPress={pickCommentPhotos}
                  style={[styles.secondaryBtn, saving && styles.disabled]}
                  accessibilityRole="button"
                  accessibilityLabel="Attach forum comment photos"
                >
                  <Text style={styles.secondaryText}>
                    {commentPhotoUris.length ? "Add more photos" : "Attach photo"}
                  </Text>
                </Pressable>
                {commentPhotoUris.length ? (
                  <View style={styles.photoGrid}>
                    {commentPhotoUris.map((uri, index) => (
                      <View key={`${uri}-${index}`}>
                        <ForumImage
                          uri={resolveImageUri(uri)}
                          style={styles.commentPhoto}
                          label={`Forum comment draft photo ${index + 1}`}
                        />
                        <Pressable
                          onPress={() =>
                            setCommentPhotoUris((current) =>
                              current.filter((_, itemIndex) => itemIndex !== index)
                            )
                          }
                          accessibilityRole="button"
                          accessibilityLabel={`Remove forum comment photo ${index + 1}`}
                        >
                          <Text style={styles.dangerText}>Remove</Text>
                        </Pressable>
                      </View>
                    ))}
                  </View>
                ) : null}
                <Pressable
                  disabled={(!commentText.trim() && !commentPhotoUris.length) || saving}
                  onPress={submitComment}
                  style={[
                    styles.primaryBtn,
                    ((!commentText.trim() && !commentPhotoUris.length) || saving) &&
                      styles.disabled
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
                {visibleCommentBody(comment) ? (
                  <Text style={styles.cardText}>{visibleCommentBody(comment)}</Text>
                ) : null}
                {commentPhotos(comment).length ? (
                  <View style={styles.photoGrid}>
                    {commentPhotos(comment).map((photo, index) => (
                      <ForumImage
                        key={`${photo}-${index}`}
                        uri={photo}
                        style={styles.commentPhoto}
                        label={`Forum comment photo ${index + 1}`}
                      />
                    ))}
                  </View>
                ) : null}
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
    borderRadius: radius.card,
    backgroundColor: "#E2E8F0"
  },
  imageFallback: { alignItems: "center", justifyContent: "center", padding: 8 },
  imageFallbackText: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center"
  },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  tag: {
    backgroundColor: "#DCFCE7",
    borderRadius: 999,
    color: "#166534",
    fontSize: 12,
    fontWeight: "800",
    paddingHorizontal: 9,
    paddingVertical: 4
  },
  contextText: { color: "#166534", fontSize: 13, fontWeight: "800", marginTop: 4 },
  card: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: radius.card,
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
    borderRadius: radius.card,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF"
  },
  commentInput: { minHeight: 90, textAlignVertical: "top" },
  commentPhoto: {
    width: 120,
    height: 90,
    borderRadius: radius.card,
    backgroundColor: "#E2E8F0"
  },
  primaryBtn: {
    alignSelf: "flex-start",
    backgroundColor: "#166534",
    borderRadius: radius.card,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  primaryText: { color: "#FFFFFF", fontWeight: "800" },
  secondaryBtn: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: "#FFFFFF"
  },
  secondaryText: { color: "#0F172A", fontWeight: "800" },
  dangerBtn: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: radius.card,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: "#FEF2F2"
  },
  dangerText: { color: "#991B1B", fontWeight: "800" },
  disabled: { opacity: 0.5 },
  feedback: {
    color: "#334155",
    backgroundColor: "#F1F5F9",
    borderRadius: radius.card,
    padding: 9,
    fontWeight: "700"
  }
});
