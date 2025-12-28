import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert
} from "react-native";

import ScreenContainer from "../components/ScreenContainer";
import FollowButton from "../components/FollowButton";
import {
  getPost,
  likePost,
  unlikePost,
  getComments,
  addComment,
  deleteComment,
  savePost,
  unsavePost,
  reportPost,
  savePostToGrowLog
} from "../api/forum";
import { applyLikeMetadata, userHasLiked } from "../utils/posts.js";
import { useAuth } from "../context/AuthContext.js";

export default function ForumPostDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const { user: authUser } = useAuth();
  const currentUserId = authUser?._id ?? authUser?.id ?? null;

  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [myComment, setMyComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);

  const normalizePost = (payload) => {
    const likesArray = Array.isArray(payload.likes) ? payload.likes : [];
    const likeCount =
      typeof payload.likeCount === "number" ? payload.likeCount : likesArray.length;
    return { ...payload, likes: likesArray, likeCount };
  };

  async function load() {
    try {
      const p = await getPost(id);
      const c = await getComments(id);

      setPost(normalizePost(p));
      setComments(c);
    } catch (err) {
      Alert.alert("Error", "Failed to load post");
    }
  }

  useEffect(() => {
    load();
  }, []);
  // Like/unlike
  async function toggleLike() {
    if (!post || !currentUserId) return;

    try {
      const liked = userHasLiked(post, currentUserId);
      const apiFn = liked ? unlikePost : likePost;
      const result = await apiFn(post._id);
      setPost((prev) =>
        applyLikeMetadata(
          prev,
          currentUserId,
          typeof result?.likeCount === "number"
            ? result.likeCount
            : typeof result?.likes === "number"
              ? result.likes
              : undefined,
          !liked
        )
      );
    } catch (err) {
      Alert.alert("Error", "Failed to update like");
    }
  }

  async function submitComment() {
    if (!myComment.trim()) return;

    try {
      setLoading(true);
      const c = await addComment(post._id, myComment.trim());
      setComments([...comments, c]);
      setMyComment("");
      setLoading(false);
    } catch (err) {
      setLoading(false);
      Alert.alert("Error", "Failed to add comment");
    }
  }

  async function handleDelete(commentId) {
    try {
      await deleteComment(commentId);
      setComments(comments.filter((c) => c._id !== commentId));
    } catch (err) {
      Alert.alert("Error", "Failed to delete comment");
    }
  }

  async function handleSave() {
    try {
      await savePost(post._id);
      Alert.alert("Saved", "This post was saved.");
    } catch (err) {
      Alert.alert("Error", "Failed to save post");
    }
  }

  async function handleUnsave() {
    try {
      await unsavePost(post._id);
      Alert.alert("Removed", "Unsaved.");
    } catch (err) {
      Alert.alert("Error", "Failed to unsave post");
    }
  }

  async function handleGrowLogImport() {
    try {
      await savePostToGrowLog(post._id);
      Alert.alert("Added!", "This post was added to your Grow Log.");
    } catch (err) {
      Alert.alert("Error", "Failed to import to Grow Log");
    }
  }

  async function handleReport() {
    Alert.alert(
      "Report Post",
      "Please select a reason for reporting this post:",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Spam",
          onPress: () => submitReport("Spam")
        },
        {
          text: "Illegal Content",
          onPress: () => submitReport("Illegal content or activity")
        },
        {
          text: "Harassment",
          onPress: () => submitReport("Harassment or hate speech")
        },
        {
          text: "Other",
          onPress: () => submitReport("Other violation")
        }
      ],
      { cancelable: true }
    );
  }

  async function submitReport(reason) {
    try {
      await reportPost(post._id, reason);
      Alert.alert(
        "Report Submitted",
        "Thank you. Our team will review this post shortly."
      );
    } catch (err) {
      Alert.alert("Error", "Failed to submit report. Please try again.");
    }
  }

  if (!post) {
    return (
      <ScreenContainer>
        <Text style={styles.loading}>Loading...</Text>
      </ScreenContainer>
    );
  }

  const author = post.user || post.author || null;

  return (
    <ScreenContainer scroll>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.username}>
            {author?.username ||
              author?.displayName ||
              author?.name ||
              "Unknown User"}
          </Text>
          <Text style={styles.timestamp}>
            {new Date(post.createdAt).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <FollowButton userId={author?._id} />
        </View>
      </View>
      <Text style={styles.content}>{post.content}</Text>
      {post.photos &&
        post.photos.map((p, i) => (
          <Image key={i} source={{ uri: p }} style={styles.photo} />
        ))}
      {post.tags && post.tags.length > 0 && (
        <View style={styles.tagsRow}>
          {post.tags.map((tag) => (
            <Text key={tag} style={styles.tag}>
              {tag}
            </Text>
          ))}
        </View>
      )}
      {post.strain ? <Text style={styles.strain}>Strain: {post.strain}</Text> : null}

      <View style={styles.actions}>
        <TouchableOpacity onPress={toggleLike} style={styles.likeButton}>
          <Text style={[styles.actionBtn, styles.likeLabel]}>
            {userHasLiked(post, currentUserId) ? "❤️ Liked" : "🤍 Like"}
          </Text>
          <Text style={styles.likeCount}>{`· ${post.likeCount || post.likes?.length || 0}`}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSave}>
          <Text style={styles.actionBtn}>🔖 Save</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleGrowLogImport}>
          <Text style={styles.actionBtn}>📌 To Grow Log</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleReport}>
          <Text style={styles.actionBtn}>🚩 Report</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Comments ({comments.length})</Text>

      <FlatList
        data={comments}
        keyExtractor={(item) => item._id}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <View style={styles.commentRow}>
            <View style={styles.commentContent}>
              <Text style={styles.commentUser}>
                {item.user?.username ||
                  item.user?.displayName ||
                  item.user?.name ||
                  item.author?.username ||
                  item.author?.displayName ||
                  item.author?.name ||
                  "Unknown"}
                :
              </Text>
              <Text style={styles.commentText}>{item.text}</Text>
            </View>

            {(item.user?._id || item.author?._id) === currentUserId && (
              <TouchableOpacity onPress={() => handleDelete(item._id)}>
                <Text style={styles.deleteBtn}>Delete</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />

      <View style={styles.commentBox}>
        <TextInput
          style={styles.commentInput}
          value={myComment}
          onChangeText={setMyComment}
          placeholder="Add a comment..."
          multiline
          editable={!loading}
        />
        <TouchableOpacity onPress={submitComment} disabled={loading}>
          <Text style={styles.send}>{loading ? "..." : "Send"}</Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 16,
    color: "#666"
  },
  username: { fontWeight: "700", fontSize: 18, marginBottom: 4 },
  timestamp: { color: "#666", fontSize: 12, marginBottom: 10 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12
  },
  headerActions: {
    alignSelf: "flex-start"
  },
  content: { marginBottom: 12, fontSize: 15, lineHeight: 22 },
  photo: {
    width: "100%",
    height: 260,
    borderRadius: 10,
    marginBottom: 10
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 10
  },
  tag: {
    backgroundColor: "#e8f5e9",
    color: "#2e7d32",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    marginRight: 6,
    marginBottom: 4,
    fontWeight: "600"
  },
  strain: {
    color: "#666",
    fontSize: 13,
    fontStyle: "italic",
    marginBottom: 10
  },
  actions: {
    flexDirection: "row",
    marginBottom: 20,
    flexWrap: "wrap",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    pointerEvents: "auto"
  },
  likeButton: {
    marginRight: 12,
    marginBottom: 4,
    flexDirection: "row",
    alignItems: "center"
  },
  actionBtn: {
    marginRight: 12,
    fontWeight: "600",
    color: "#3498db",
    marginBottom: 4,
    fontSize: 13
  },
  likeLabel: {
    marginRight: 0
  },
  likeCount: {
    marginLeft: 4,
    color: "#111827",
    fontWeight: "600",
    fontSize: 13
  },
  sectionTitle: {
    fontWeight: "700",
    fontSize: 18,
    marginBottom: 8,
    marginTop: 10
  },
  commentRow: {
    flexDirection: "row",
    marginBottom: 10,
    alignItems: "flex-start",
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0"
  },
  commentContent: {
    flex: 1
  },
  commentUser: { fontWeight: "700", marginBottom: 2 },
  commentText: { color: "#333", lineHeight: 18 },
  deleteBtn: {
    color: "#e74c3c",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 8
  },
  commentBox: {
    flexDirection: "row",
    marginTop: 12,
    paddingVertical: 8,
    alignItems: "flex-end"
  },
  commentInput: {
    flex: 1,
    backgroundColor: "#eee",
    borderRadius: 6,
    padding: 10,
    maxHeight: 80
  },
  send: {
    marginLeft: 10,
    color: "#27ae60",
    fontWeight: "700",
    fontSize: 14
  }
});
