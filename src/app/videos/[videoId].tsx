import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import {
  createVideoComment,
  deleteVideoComment,
  getVideo,
  GrowPathVideo,
  listVideoComments,
  updateVideoComment,
  type VideoComment
} from "@/api/videos";
import { useAuth } from "@/auth/AuthContext";
import FollowButton from "@/components/FollowButton";
import { InlineError } from "@/components/InlineError";
import ReportModal from "@/components/ReportModal";
import LessonMediaCard from "@/components/learning/LessonMediaCard";
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
import PublicShareActions from "@/components/sharing/PublicShareActions";
import { formatDuration } from "@/features/videos/videoPresentation";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

export default function VideoDetailRoute() {
  const params = useLocalSearchParams<{ videoId?: string }>();
  const router = useRouter();
  const auth = useAuth();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const videoId = String(
    Array.isArray(params.videoId) ? params.videoId[0] : params.videoId || ""
  );
  const [video, setVideo] = useState<GrowPathVideo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [reportVisible, setReportVisible] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [comments, setComments] = useState<VideoComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo] = useState<VideoComment | null>(null);
  const [editingComment, setEditingComment] = useState<VideoComment | null>(null);
  const [reportedComment, setReportedComment] = useState<VideoComment | null>(null);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentSaving, setCommentSaving] = useState(false);
  const [commentError, setCommentError] = useState("");
  const ownerId = String(video?.owner?.id || "");
  const signedInUserId = String(auth.user?.id || auth.user?._id || "");
  const canReport =
    auth.isAuthed &&
    Boolean(ownerId) &&
    ownerId !== String(auth.user?.id || "") &&
    ownerId !== String(auth.user?._id || "");

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

  useEffect(() => {
    let active = true;
    setCommentsLoading(true);
    setCommentError("");
    listVideoComments(videoId)
      .then((rows) => {
        if (active) setComments(rows);
      })
      .catch((err) => {
        if (active)
          setCommentError(String(err?.message || err || "Comments could not be loaded."));
      })
      .finally(() => {
        if (active) setCommentsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [videoId]);

  async function submitComment() {
    const body = commentText.trim();
    if (!body || commentSaving) return;
    setCommentSaving(true);
    setCommentError("");
    try {
      if (editingComment) {
        const updated = await updateVideoComment(videoId, editingComment.id, body);
        setComments((current) =>
          current.map((comment) => (comment.id === updated.id ? updated : comment))
        );
      } else {
        const comment = await createVideoComment(videoId, body, replyTo?.id);
        setComments((current) => [...current, comment]);
      }
      setCommentText("");
      setReplyTo(null);
      setEditingComment(null);
    } catch (err: any) {
      setCommentError(String(err?.message || err || "Comment not saved."));
    } finally {
      setCommentSaving(false);
    }
  }

  async function removeComment(comment: VideoComment) {
    setCommentError("");
    try {
      await deleteVideoComment(
        videoId,
        comment.id,
        ownerId === signedInUserId ? "Video owner moderation" : ""
      );
      setComments((current) => current.filter((row) => row.id !== comment.id));
    } catch (err: any) {
      setCommentError(String(err?.message || err || "Comment not removed."));
    }
  }

  return (
    <AppPage
      routeKey="video-detail"
      backFallbackHref="/videos"
      header={
        <View>
          <Text accessibilityRole="header" aria-level={1} style={styles.title}>
            {video?.title || "Video"}
          </Text>
        </View>
      }
    >
      {loading ? (
        <ActivityIndicator accessibilityLabel="Loading video" color={palette.accent} />
      ) : null}
      <InlineError error={error} />
      {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
      {video ? (
        <>
          <AppCard>
            <View style={styles.ownerRow}>
              <View style={styles.ownerCopy}>
                <Pressable
                  accessibilityLabel={`Open ${video.owner?.displayName || "GrowPath member"} profile`}
                  accessibilityRole="link"
                  onPress={() =>
                    router.push(
                      `/creators/${encodeURIComponent(video.owner?.id || "")}` as any
                    )
                  }
                >
                  <Text style={styles.owner}>
                    {video.owner?.displayName || "GrowPath member"}
                  </Text>
                </Pressable>
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
            {canReport ? (
              <Pressable
                accessibilityLabel={`Report ${video.title || "video"}`}
                accessibilityRole="button"
                onPress={() => setReportVisible(true)}
                style={styles.reportButton}
              >
                <Text style={styles.reportButtonText}>Report Video</Text>
              </Pressable>
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
          <PublicShareActions
            title={video.title || "GrowPath video"}
            path={`/videos/${encodeURIComponent(videoId)}`}
            heading="Share this video"
          />
          {video.tags?.length || video.growInterests?.length ? (
            <AppCard>
              <Text accessibilityRole="header" aria-level={2} style={styles.sectionTitle}>
                Topics
              </Text>
              <View style={styles.tags}>
                {[...(video.tags || []), ...(video.growInterests || [])].map((tag) => (
                  <Text key={tag} style={styles.tag}>
                    {tag}
                  </Text>
                ))}
              </View>
            </AppCard>
          ) : null}
          <AppCard>
            <Text accessibilityRole="header" aria-level={2} style={styles.sectionTitle}>
              Discussion
            </Text>
            <Text style={styles.discussionHint}>
              Ask questions, add context, or reply to other viewers without leaving the
              video.
            </Text>
            {commentsLoading ? (
              <ActivityIndicator
                accessibilityLabel="Loading video comments"
                color={palette.accent}
              />
            ) : null}
            {commentError ? (
              <Text style={styles.commentError}>{commentError}</Text>
            ) : null}
            {comments.length === 0 && !commentsLoading ? (
              <Text style={styles.emptyComments}>
                No comments yet. Start the discussion.
              </Text>
            ) : null}
            <View style={styles.commentList}>
              {comments.map((comment) => {
                const canRemove =
                  signedInUserId === String(comment.author.id) ||
                  signedInUserId === ownerId;
                return (
                  <View
                    key={comment.id}
                    style={[
                      styles.commentCard,
                      comment.parentCommentId ? styles.replyCard : null
                    ]}
                  >
                    <View style={styles.commentHeader}>
                      {comment.author.avatarUrl ? (
                        <Image
                          accessibilityLabel={`${comment.author.displayName} avatar`}
                          source={{ uri: comment.author.avatarUrl }}
                          style={styles.avatar}
                        />
                      ) : (
                        <View style={styles.avatarFallback}>
                          <Text style={styles.avatarFallbackText}>
                            {comment.author.displayName.slice(0, 1).toUpperCase() || "G"}
                          </Text>
                        </View>
                      )}
                      <View style={styles.commentCopy}>
                        <Text style={styles.commentAuthor}>
                          {comment.author.displayName}
                        </Text>
                        <Text style={styles.commentDate}>
                          {comment.createdAt
                            ? new Date(comment.createdAt).toLocaleString()
                            : ""}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.commentBody}>{comment.body}</Text>
                    <View style={styles.commentActions}>
                      {auth.isAuthed ? (
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => setReplyTo(comment)}
                          style={styles.commentAction}
                        >
                          <Text style={styles.commentActionText}>Reply</Text>
                        </Pressable>
                      ) : null}
                      {signedInUserId === String(comment.author.id) ? (
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => {
                            setReplyTo(null);
                            setEditingComment(comment);
                            setCommentText(comment.body);
                          }}
                          style={styles.commentAction}
                        >
                          <Text style={styles.commentActionText}>Edit</Text>
                        </Pressable>
                      ) : null}
                      {auth.isAuthed && signedInUserId !== String(comment.author.id) ? (
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => setReportedComment(comment)}
                          style={styles.commentAction}
                        >
                          <Text style={styles.commentActionText}>Report</Text>
                        </Pressable>
                      ) : null}
                      {canRemove ? (
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => void removeComment(comment)}
                          style={styles.commentAction}
                        >
                          <Text style={styles.removeCommentText}>Remove</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
            {auth.isAuthed ? (
              <View style={styles.composer}>
                {replyTo || editingComment ? (
                  <View style={styles.replyingRow}>
                    <Text style={styles.replyingText}>
                      {editingComment
                        ? "Editing your comment"
                        : `Replying to ${replyTo?.author.displayName || "viewer"}`}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        setReplyTo(null);
                        setEditingComment(null);
                        setCommentText("");
                      }}
                    >
                      <Text style={styles.commentActionText}>Cancel</Text>
                    </Pressable>
                  </View>
                ) : null}
                <TextInput
                  accessibilityLabel={
                    editingComment
                      ? "Edit video comment"
                      : replyTo
                        ? "Write a video reply"
                        : "Write a video comment"
                  }
                  multiline
                  onChangeText={setCommentText}
                  placeholder={
                    editingComment
                      ? "Update your comment"
                      : replyTo
                        ? "Write a reply"
                        : "Join the discussion"
                  }
                  placeholderTextColor={palette.textMuted}
                  style={styles.commentInput}
                  value={commentText}
                />
                <Pressable
                  accessibilityRole="button"
                  disabled={!commentText.trim() || commentSaving}
                  onPress={() => void submitComment()}
                  style={[
                    styles.submitComment,
                    (!commentText.trim() || commentSaving) && styles.disabled
                  ]}
                >
                  <Text style={styles.submitCommentText}>
                    {commentSaving
                      ? "Posting..."
                      : editingComment
                        ? "Save Changes"
                        : replyTo
                          ? "Post Reply"
                          : "Post Comment"}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <Text style={styles.emptyComments}>Sign in to join the discussion.</Text>
            )}
          </AppCard>
        </>
      ) : null}
      <ReportModal
        visible={reportVisible}
        onClose={() => setReportVisible(false)}
        contentType="video"
        contentId={videoId}
        contentTitle={video?.title || "Video"}
        targetUrl={`/videos/${encodeURIComponent(videoId)}`}
        onSuccess={() => setFeedback("Video report submitted for administrator review.")}
      />
      <ReportModal
        visible={Boolean(reportedComment)}
        onClose={() => setReportedComment(null)}
        contentType="videoComment"
        contentId={reportedComment?.id || ""}
        contentTitle={`Comment on ${video?.title || "video"}`}
        targetUrl={`/videos/${encodeURIComponent(videoId)}?commentId=${encodeURIComponent(reportedComment?.id || "")}`}
        parentPostId={videoId}
        onSuccess={() =>
          setFeedback("Comment report submitted for administrator review.")
        }
      />
    </AppPage>
  );
}

export const createStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    title: { color: palette.heroText, fontSize: 28, fontWeight: "900" },
    ownerRow: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: 12,
      justifyContent: "space-between"
    },
    ownerCopy: { flex: 1 },
    owner: {
      color: palette.text,
      fontSize: 17,
      fontWeight: "800",
      textDecorationLine: "underline"
    },
    meta: {
      color: palette.textMuted,
      fontSize: 12,
      marginTop: 3,
      textTransform: "capitalize"
    },
    feedback: {
      backgroundColor: palette.accentSoft,
      borderRadius: radius.card,
      color: palette.success,
      fontWeight: "700",
      marginBottom: 10,
      padding: 10
    },
    reportButton: {
      alignSelf: "flex-start",
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      marginTop: 12,
      paddingHorizontal: 12,
      paddingVertical: 9
    },
    reportButtonText: { color: palette.link, fontWeight: "800" },
    description: { color: palette.text, lineHeight: 21, marginTop: 12 },
    context: {
      backgroundColor: palette.accentSoft,
      borderRadius: radius.card,
      color: palette.success,
      fontSize: 12,
      fontWeight: "700",
      marginTop: 12,
      padding: 10
    },
    sectionTitle: { color: palette.text, fontSize: 18, fontWeight: "800" },
    tags: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 9 },
    tag: {
      backgroundColor: palette.surfaceMuted,
      borderRadius: 999,
      color: palette.textMuted,
      fontSize: 12,
      fontWeight: "700",
      overflow: "hidden",
      paddingHorizontal: 10,
      paddingVertical: 6
    },
    discussionHint: { color: palette.textMuted, lineHeight: 20, marginTop: 6 },
    commentError: { color: palette.danger, fontWeight: "700", marginTop: 10 },
    emptyComments: { color: palette.textMuted, marginTop: 14 },
    commentList: { gap: 10, marginTop: 14 },
    commentCard: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      padding: 12
    },
    replyCard: { marginLeft: 24 },
    commentHeader: { alignItems: "center", flexDirection: "row", gap: 9 },
    avatar: { borderRadius: 18, height: 36, width: 36 },
    avatarFallback: {
      alignItems: "center",
      backgroundColor: palette.accentSoft,
      borderRadius: 18,
      height: 36,
      justifyContent: "center",
      width: 36
    },
    avatarFallbackText: { color: palette.link, fontWeight: "900" },
    commentCopy: { flex: 1 },
    commentAuthor: { color: palette.text, fontWeight: "800" },
    commentDate: { color: palette.textMuted, fontSize: 11, marginTop: 2 },
    commentBody: { color: palette.text, lineHeight: 20, marginTop: 9 },
    commentActions: { flexDirection: "row", gap: 14, marginTop: 9 },
    commentAction: { paddingVertical: 4 },
    commentActionText: { color: palette.link, fontWeight: "800" },
    removeCommentText: { color: palette.danger, fontWeight: "800" },
    composer: { gap: 9, marginTop: 16 },
    replyingRow: { flexDirection: "row", justifyContent: "space-between" },
    replyingText: { color: palette.textMuted, fontWeight: "700" },
    commentInput: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      color: palette.text,
      minHeight: 86,
      padding: 12,
      textAlignVertical: "top"
    },
    submitComment: {
      alignItems: "center",
      alignSelf: "flex-start",
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      paddingHorizontal: 16,
      paddingVertical: 11
    },
    submitCommentText: { color: palette.accentText, fontWeight: "900" },
    disabled: { opacity: 0.55 }
  });
