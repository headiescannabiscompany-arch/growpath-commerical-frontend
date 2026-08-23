import React, { useCallback, useEffect, useMemo, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { Link, useLocalSearchParams, useRouter } from "expo-router";

import {
  addForumComment,
  deleteForumComment,
  deleteForumPost,
  getForumPost,
  likeForumPost,
  listForumComments,
  postId,
  reportForumPost,
  saveForumPostToGrowLog,
  type SocialPost,
  unlikeForumPost,
  updateForumPost
} from "@/api/communitySocial";
import { createPersonalTask } from "@/api/tasks";
import { useAuth } from "@/auth/AuthContext";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import ReportModal from "@/components/ReportModal";
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import PersonalFeedPlacement from "@/components/feed/PersonalFeedPlacement";
import ExpandableForumImage from "@/components/forum/ExpandableForumImage";
import PublicShareActions from "@/components/sharing/PublicShareActions";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
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

function identityValues(value: any): string[] {
  if (!value) return [];
  if (typeof value === "string" || typeof value === "number") {
    return [String(value).trim().toLowerCase()].filter(Boolean);
  }
  return [
    value._id,
    value.id,
    value.userId,
    value.email,
    value.username,
    value.displayName,
    value.name
  ]
    .map((candidate) =>
      String(candidate || "")
        .trim()
        .toLowerCase()
    )
    .filter(Boolean);
}

function isOwnedBy(row: any, currentUser: any) {
  const viewer = new Set(identityValues(currentUser));
  if (!viewer.size) return false;
  const authoredBy = [
    row?.author,
    row?.user,
    row?.authorId,
    row?.userId,
    row?.createdBy
  ].flatMap(identityValues);
  return authoredBy.some((candidate) => viewer.has(candidate));
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
  return <ExpandableForumImage uri={uri} style={style} label={label} />;
}

export default function ForumPostDetailRoute() {
  const auth = useAuth();
  const router = useRouter();
  const [reportedComment, setReportedComment] = useState<CommentRow | null>(null);
  const params = useLocalSearchParams();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createForumPostDetailStyles(palette), [palette]);
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
  const [editingPost, setEditingPost] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");

  const loadedId = useMemo(() => postId(post), [post]);
  const isPostOwner = useMemo(() => isOwnedBy(post, auth.user), [auth.user, post]);

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
      } catch {
        setFeedback("This discussion is unavailable.");
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

  function confirmDeleteComment(comment: CommentRow) {
    const commentId = String(comment._id || comment.id || "");
    if (!commentId || !isOwnedBy(comment, auth.user)) return;
    Alert.alert(
      "Delete comment?",
      "This permanently removes your comment from the discussion.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setSaving(true);
            setFeedback("");
            try {
              await deleteForumComment(commentId);
              setComments((current) =>
                current.filter((item) => String(item._id || item.id || "") !== commentId)
              );
              setFeedback("Comment deleted.");
            } catch (error: any) {
              setFeedback(error?.message || "Unable to delete this comment.");
            } finally {
              setSaving(false);
            }
          }
        }
      ],
      { cancelable: true }
    );
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
      selectionLimit: Math.max(10 - commentPhotoUris.length, 1),
      allowsEditing: false,
      quality: 0.8
    });
    if (picked.canceled) return;
    setCommentPhotoUris((current) =>
      [...current, ...picked.assets.map((asset) => asset.uri).filter(Boolean)].slice(
        0,
        10
      )
    );
    if (commentPhotoUris.length + picked.assets.length > 10) {
      setFeedback("Maximum 10 comment photos.");
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

  function beginEditPost() {
    if (!post || !isPostOwner || saving) return;
    setEditTitle(String(post.title || ""));
    setEditBody(bodyOf(post));
    setEditingPost(true);
    setFeedback("");
  }

  async function savePostEdit() {
    const targetId = loadedId || id;
    if (!targetId || !isPostOwner || !editBody.trim() || saving) return;
    setSaving(true);
    setFeedback("");
    try {
      const updated = await updateForumPost(targetId, {
        title: editTitle,
        body: editBody
      });
      setPost(updated);
      setEditingPost(false);
      setFeedback(
        updated?.isHidden
          ? updated.moderationNotice ||
              "This update is hidden while a human moderator reviews it."
          : "Post updated."
      );
    } catch (error: any) {
      setFeedback(error?.message || "Unable to update this post.");
    } finally {
      setSaving(false);
    }
  }

  function confirmDeletePost() {
    const targetId = loadedId || id;
    if (!targetId || !isPostOwner || saving) return;
    Alert.alert(
      "Delete post?",
      "This removes the discussion from Forum and public feeds. This cannot be undone from the app.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setSaving(true);
            setFeedback("");
            try {
              await deleteForumPost(targetId);
              router.replace("/forum");
            } catch (error: any) {
              setFeedback(error?.message || "Unable to delete this post.");
              setSaving(false);
            }
          }
        }
      ],
      { cancelable: true }
    );
  }

  if (!canView || !id || (!loading && !post)) {
    const unavailableTitle = canView
      ? "Forum discussion unavailable"
      : "Forum unavailable";
    const unavailableCopy = !canView
      ? "This account does not have Forum viewing access."
      : !id
        ? "Choose a discussion from Forum / Q&A."
        : feedback || "This discussion is unavailable.";

    return (
      <ScreenBoundary name="personal.forum.postDetail" showBack backFallbackHref="/forum">
        <View style={styles.unavailablePage}>
          <View style={styles.card}>
            <Text accessibilityRole="header" aria-level={1} style={styles.title}>
              {unavailableTitle}
            </Text>
            <Text style={styles.cardText}>{unavailableCopy}</Text>
            {canView ? (
              <Link href="/forum" asChild>
                <Pressable accessibilityRole="button" style={styles.secondaryBtn}>
                  <Text style={styles.secondaryText}>Browse Forum / Q&amp;A</Text>
                </Pressable>
              </Link>
            ) : null}
          </View>
        </View>
      </ScreenBoundary>
    );
  }

  return (
    <ScreenBoundary name="personal.forum.postDetail" showBack backFallbackHref="/forum">
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load({ refresh: true })}
            colors={[palette.accent]}
            tintColor={palette.accent}
            progressBackgroundColor={palette.surface}
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
            <ActivityIndicator color={palette.accent} />
          </View>
        ) : null}

        {!loading && canView ? (
          <View style={styles.card}>
            {post ? (
              <>
                <Text accessibilityRole="header" aria-level={1} style={styles.title}>
                  {titleOf(post)}
                </Text>
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
                {editingPost ? (
                  <View style={styles.editComposer}>
                    <TextInput
                      value={editTitle}
                      onChangeText={setEditTitle}
                      editable={!saving}
                      placeholder="Post title"
                      placeholderTextColor={palette.textMuted}
                      selectionColor={palette.accent}
                      style={styles.input}
                      accessibilityLabel="Edit forum post title"
                    />
                    <TextInput
                      value={editBody}
                      onChangeText={setEditBody}
                      editable={!saving}
                      multiline
                      placeholder="Post details"
                      placeholderTextColor={palette.textMuted}
                      selectionColor={palette.accent}
                      style={[styles.input, styles.editBodyInput]}
                      accessibilityLabel="Edit forum post body"
                    />
                    <Text style={styles.meta}>
                      Editing changes the post copy only. Its author, workspace, links and
                      visibility stay unchanged.
                    </Text>
                    <View style={styles.actions}>
                      <Pressable
                        disabled={!editBody.trim() || saving}
                        onPress={savePostEdit}
                        style={[
                          styles.primaryBtn,
                          (!editBody.trim() || saving) && styles.disabled
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel="Save forum post changes"
                      >
                        <Text style={styles.primaryText}>Save changes</Text>
                      </Pressable>
                      <Pressable
                        disabled={saving}
                        onPress={() => setEditingPost(false)}
                        style={[styles.secondaryBtn, saving && styles.disabled]}
                        accessibilityRole="button"
                        accessibilityLabel="Cancel forum post editing"
                      >
                        <Text style={styles.secondaryText}>Cancel</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : bodyOf(post) ? (
                  <Text style={styles.body}>{bodyOf(post)}</Text>
                ) : null}
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
                  {isPostOwner ? (
                    <>
                      <Text style={styles.meta}>Your post</Text>
                      <Pressable
                        disabled={saving || editingPost}
                        onPress={beginEditPost}
                        style={[
                          styles.secondaryBtn,
                          (saving || editingPost) && styles.disabled
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel="Edit your forum post"
                      >
                        <Text style={styles.secondaryText}>Edit</Text>
                      </Pressable>
                      <Pressable
                        disabled={saving}
                        onPress={confirmDeletePost}
                        style={[styles.dangerBtn, saving && styles.disabled]}
                        accessibilityRole="button"
                        accessibilityLabel="Delete your forum post"
                      >
                        <Text style={styles.dangerText}>Delete post</Text>
                      </Pressable>
                    </>
                  ) : (
                    <Pressable
                      disabled={!canPost || saving}
                      onPress={reportPost}
                      style={[styles.dangerBtn, (!canPost || saving) && styles.disabled]}
                      accessibilityRole="button"
                      accessibilityLabel="Report forum post"
                    >
                      <Text style={styles.dangerText}>Report</Text>
                    </Pressable>
                  )}
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

        {canView && post ? (
          <PublicShareActions
            title={titleOf(post)}
            path={`/forum/post/${encodeURIComponent(id)}`}
            heading="Share this discussion"
          />
        ) : null}

        {canView ? (
          <View style={styles.card}>
            <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
              Comments
            </Text>
            {canPost ? (
              <View style={styles.commentComposer}>
                <TextInput
                  value={commentText}
                  onChangeText={setCommentText}
                  placeholder="Add a comment..."
                  multiline
                  editable={!saving}
                  placeholderTextColor={palette.textMuted}
                  selectionColor={palette.accent}
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

            {comments.map((comment) => {
              const isCommentOwner = isOwnedBy(comment, auth.user);
              return (
                <View
                  key={String(comment._id || comment.id || bodyOf(comment))}
                  style={styles.comment}
                >
                  <Text style={styles.rowTitle}>{authorName(comment)}</Text>
                  {visibleCommentBody(comment) ? (
                    <Text style={styles.cardText}>{visibleCommentBody(comment)}</Text>
                  ) : null}
                  {isCommentOwner ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Delete your comment"
                      disabled={saving}
                      onPress={() => confirmDeleteComment(comment)}
                      style={[styles.dangerBtn, saving && styles.disabled]}
                    >
                      <Text style={styles.dangerText}>Delete</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Report forum comment"
                      onPress={() => setReportedComment(comment)}
                      style={styles.secondaryBtn}
                    >
                      <Text style={styles.secondaryText}>Report comment</Text>
                    </Pressable>
                  )}
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
              );
            })}
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
      <ReportModal
        visible={Boolean(reportedComment)}
        onClose={() => setReportedComment(null)}
        contentType="comment"
        contentId={String(reportedComment?._id || reportedComment?.id || "")}
        contentTitle="Forum comment"
        parentPostId={String(loadedId || id || "")}
        targetUrl={`/forum/post/${encodeURIComponent(String(loadedId || id || ""))}`}
        onSuccess={() => setFeedback("Comment report sent for moderation review.")}
      />
    </ScreenBoundary>
  );
}

export function createForumPostDetailStyles(palette: ThemePalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.page },
    unavailablePage: { flex: 1, padding: 20, backgroundColor: palette.page },
    content: { padding: 20, paddingBottom: 36, gap: 12 },
    title: { fontSize: 24, fontWeight: "800", color: palette.text },
    body: { color: palette.textMuted, lineHeight: 21, marginTop: 10 },
    photoGrid: { alignItems: "center", gap: 10, marginTop: 8, width: "100%" },
    postPhoto: {
      width: "100%",
      maxWidth: 720,
      aspectRatio: 4 / 3,
      alignSelf: "center",
      borderRadius: radius.card,
      backgroundColor: palette.surfaceMuted
    },
    imageFallback: { alignItems: "center", justifyContent: "center", padding: 8 },
    imageFallbackText: {
      color: palette.textMuted,
      fontSize: 12,
      fontWeight: "800",
      textAlign: "center"
    },
    tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
    tag: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: 999,
      color: palette.accent,
      fontSize: 12,
      fontWeight: "800",
      paddingHorizontal: 9,
      paddingVertical: 4
    },
    contextText: {
      color: palette.accent,
      fontSize: 13,
      fontWeight: "800",
      marginTop: 4
    },
    card: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      padding: 14,
      backgroundColor: palette.surface,
      gap: 8
    },
    cardTitle: { fontSize: 16, fontWeight: "800", color: palette.text },
    cardText: { color: palette.textMuted, lineHeight: 20 },
    rowTitle: { fontWeight: "800", color: palette.text },
    meta: { color: palette.textMuted, fontSize: 12, fontWeight: "700" },
    actions: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: 10,
      marginTop: 6
    },
    editComposer: { gap: 8, marginTop: 10 },
    editBodyInput: { minHeight: 130, textAlignVertical: "top" },
    commentComposer: { gap: 8 },
    comment: {
      borderTopWidth: 1,
      borderTopColor: palette.border,
      paddingTop: 10,
      gap: 4
    },
    input: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: palette.surfaceMuted,
      color: palette.text
    },
    commentInput: { minHeight: 90, textAlignVertical: "top" },
    commentPhoto: {
      width: "100%",
      maxWidth: 560,
      aspectRatio: 4 / 3,
      alignSelf: "center",
      borderRadius: radius.card,
      backgroundColor: palette.surfaceMuted
    },
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
      borderWidth: 1,
      borderColor: palette.accent,
      borderRadius: radius.card,
      paddingHorizontal: 10,
      paddingVertical: 7,
      backgroundColor: palette.surfaceMuted
    },
    secondaryText: { color: palette.accent, fontWeight: "800" },
    dangerBtn: {
      alignSelf: "flex-start",
      borderWidth: 1,
      borderColor: palette.danger,
      borderRadius: radius.card,
      paddingHorizontal: 10,
      paddingVertical: 7,
      backgroundColor: palette.surfaceMuted
    },
    dangerText: { color: palette.danger, fontWeight: "800" },
    disabled: { opacity: 0.5 },
    feedback: {
      color: palette.danger,
      backgroundColor: palette.surfaceMuted,
      borderRadius: radius.card,
      padding: 9,
      fontWeight: "700"
    }
  });
}
