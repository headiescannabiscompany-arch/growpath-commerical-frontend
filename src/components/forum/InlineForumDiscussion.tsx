import { Link } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import { addForumComment, listForumComments } from "@/api/communitySocial";
import { useAppTheme } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

type InlineForumDiscussionProps = {
  canReply: boolean;
  replyCount?: number;
  threadId: string;
  title: string;
};

function authorName(row: any) {
  const author = row?.author || row?.user || {};
  return String(
    author.displayName ||
      author.name ||
      author.username ||
      author.email ||
      row?.authorName ||
      "Forum member"
  );
}

function visibleBody(row: any) {
  const value = String(row?.body || row?.content || row?.text || "");
  const text = value
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      return !/^https?:\/\//i.test(trimmed) && !trimmed.startsWith("/uploads/");
    })
    .join("\n")
    .trim();
  return text || "Photo reply — open the full discussion to view attached media.";
}

function replyLabel(count: number) {
  return `${count} ${count === 1 ? "reply" : "replies"}`;
}

export default function InlineForumDiscussion({
  canReply,
  replyCount = 0,
  threadId,
  title
}: InlineForumDiscussionProps) {
  const { palette } = useAppTheme();
  const [expanded, setExpanded] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [count, setCount] = useState(Math.max(0, replyCount));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reply, setReply] = useState("");
  const [feedback, setFeedback] = useState("");

  const loadComments = useCallback(async () => {
    if (!threadId) return;
    setLoading(true);
    setFeedback("");
    try {
      const rows = await listForumComments(threadId);
      setComments(rows);
      setCount(rows.length);
      setLoaded(true);
    } catch (error: any) {
      setFeedback(error?.message || "Unable to load replies.");
    } finally {
      setLoading(false);
    }
  }, [threadId]);

  function toggleExpanded() {
    const nextExpanded = !expanded;
    setExpanded(nextExpanded);
    if (nextExpanded && !loaded && !loading) {
      void loadComments();
    }
  }

  async function submitReply() {
    const text = reply.trim();
    if (!threadId || !text || !canReply || saving) return;
    setSaving(true);
    setFeedback("");
    try {
      const created: any = await addForumComment(threadId, text);
      if (created?.isHidden || created?.moderationStatus === "held") {
        setFeedback(
          created?.moderationNotice ||
            "This reply is hidden while a human moderator reviews it."
        );
        return;
      }
      setReply("");
      await loadComments();
    } catch (error: any) {
      setFeedback(error?.message || "Unable to add reply.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={[styles.container, { borderTopColor: palette.border }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${expanded ? "Hide" : "Show"} ${replyLabel(count)} for ${title}`}
        accessibilityState={{ expanded }}
        disabled={!threadId}
        onPress={toggleExpanded}
        style={[styles.toggle, !threadId && styles.disabled]}
      >
        <Text aria-hidden style={[styles.arrow, { color: palette.accent }]}>
          {expanded ? "▴" : "▾"}
        </Text>
        <Text style={[styles.toggleText, { color: palette.accent }]}>
          {expanded ? "Hide replies" : `Show ${replyLabel(count)}`}
        </Text>
      </Pressable>

      {expanded ? (
        <View
          style={[
            styles.panel,
            { backgroundColor: palette.surface, borderColor: palette.border }
          ]}
        >
          <Text
            accessibilityRole="header"
            aria-level={3}
            style={[styles.heading, { color: palette.text }]}
          >
            Discussion replies
          </Text>
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={palette.accent} />
              <Text style={[styles.muted, { color: palette.textMuted }]}>
                Loading replies...
              </Text>
            </View>
          ) : null}
          {feedback ? (
            <Text style={[styles.feedback, { color: palette.danger }]}>{feedback}</Text>
          ) : null}
          {!loading && loaded && comments.length ? (
            <View style={styles.commentList}>
              {comments.map((comment, index) => (
                <View
                  key={String(comment?.id || comment?._id || `comment-${index}`)}
                  style={[
                    styles.comment,
                    { backgroundColor: palette.surfaceMuted, borderColor: palette.border }
                  ]}
                >
                  <Text style={[styles.author, { color: palette.text }]}>
                    {authorName(comment)}
                  </Text>
                  <Text style={[styles.commentBody, { color: palette.textMuted }]}>
                    {visibleBody(comment)}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
          {!loading && loaded && !comments.length ? (
            <Text style={[styles.muted, { color: palette.textMuted }]}>
              No replies yet. Start the discussion below.
            </Text>
          ) : null}
          {!loaded && !loading && feedback ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Retry replies for ${title}`}
              onPress={() => void loadComments()}
              style={[styles.secondaryAction, { borderColor: palette.accent }]}
            >
              <Text style={[styles.secondaryText, { color: palette.accent }]}>
                Retry replies
              </Text>
            </Pressable>
          ) : null}

          {canReply ? (
            <View style={styles.composer}>
              <TextInput
                accessibilityLabel={`Reply to ${title}`}
                editable={!saving}
                multiline
                onChangeText={setReply}
                placeholder="Write a reply..."
                placeholderTextColor={palette.textMuted}
                selectionColor={palette.accent}
                style={[
                  styles.input,
                  {
                    backgroundColor: palette.surfaceMuted,
                    borderColor: palette.border,
                    color: palette.text
                  }
                ]}
                value={reply}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Post reply to ${title}`}
                disabled={!reply.trim() || saving}
                onPress={submitReply}
                style={[
                  styles.primaryAction,
                  { backgroundColor: palette.accent },
                  (!reply.trim() || saving) && styles.disabled
                ]}
              >
                <Text style={[styles.primaryText, { color: palette.accentText }]}>
                  {saving ? "Posting..." : "Post reply"}
                </Text>
              </Pressable>
            </View>
          ) : (
            <Text style={[styles.muted, { color: palette.textMuted }]}>
              Replying is not available on this account.
            </Text>
          )}

          <Link href={{ pathname: "/forum/post", params: { id: threadId } }} asChild>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={`Open full discussion page for ${title}`}
              style={styles.fullPageLink}
            >
              <Text style={[styles.fullPageText, { color: palette.accent }]}>
                Open full discussion page
              </Text>
            </Pressable>
          </Link>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    marginTop: 4,
    paddingTop: 8
  },
  toggle: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 4,
    paddingVertical: 6
  },
  arrow: {
    fontSize: 18,
    fontWeight: "900"
  },
  toggleText: {
    fontSize: 13,
    fontWeight: "900"
  },
  panel: {
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 10,
    marginTop: 6,
    padding: 12
  },
  heading: {
    fontSize: 15,
    fontWeight: "900"
  },
  loadingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8
  },
  commentList: { gap: 8 },
  comment: {
    borderRadius: radius.card,
    borderWidth: 1,
    padding: 10
  },
  author: {
    fontSize: 12,
    fontWeight: "900"
  },
  commentBody: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 3
  },
  composer: { gap: 8 },
  input: {
    borderRadius: radius.card,
    borderWidth: 1,
    minHeight: 72,
    paddingHorizontal: 10,
    paddingVertical: 9,
    textAlignVertical: "top"
  },
  primaryAction: {
    alignSelf: "flex-start",
    borderRadius: radius.card,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  primaryText: { fontSize: 13, fontWeight: "900" },
  secondaryAction: {
    alignSelf: "flex-start",
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  secondaryText: { fontSize: 13, fontWeight: "900" },
  fullPageLink: {
    alignSelf: "flex-start",
    paddingHorizontal: 2,
    paddingVertical: 4
  },
  fullPageText: {
    fontSize: 13,
    fontWeight: "800",
    textDecorationLine: "underline"
  },
  muted: { fontSize: 13, lineHeight: 18 },
  feedback: { fontSize: 13, lineHeight: 18 },
  disabled: { opacity: 0.5 }
});
