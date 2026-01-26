import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert
} from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import Card from "../components/Card";
import PrimaryButton from "../components/PrimaryButton";
import { colors, spacing, radius } from "../theme/theme";
import { likePost, addComment, getComments } from "../api/posts";
import { useAuth } from "@/auth/AuthContext";

export default function PostDetailScreen({ route, navigation }) {
  const { isEntitled, isPro, user } = useAuth();
  const { post, refreshFeed } = route.params;

  const initialLikeCount = typeof post.likeCount === "number"
    ? post.likeCount
    : Array.isArray(post.likes)
      ? post.likes.length
      : (typeof post.likes === "number" ? post.likes : 0);

  const [likes, setLikes] = useState(initialLikeCount);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");

  // Load comments
  useEffect(() => {
    async function loadComments() {
      try {
        const res = await getComments(post._id);
        const list = Array.isArray(res) ? res : res?.data || [];
        setComments(list);
      } catch (err) {
        console.error("Failed to load comments", err);
      }
    }
    loadComments();
  }, [post._id]);

  // VIP Lock
  if (post.vipOnly && !isPro) {
    return (
      <ScreenContainer>
        <Card>
          <Text style={styles.lockTitle}>EXCLUSIVE CONTENT</Text>
          <Text style={styles.lockText}>
            This post is only available to Pro members and forum participants.
          </Text>
          <PrimaryButton
            title="View Plans"
            onPress={() => navigation.navigate("Subscription")}
          />
        </Card>
      </ScreenContainer>
    );
  }

  async function handleLike() {
    try {
      const res = await likePost(post._id);
      // api/posts likePost returns { likeCount: number }
      // api/forum likePost returns { likes: number, likeCount: number }
      setLikes(res.likeCount);

      if (typeof refreshFeed === "function") {
        refreshFeed();
      }
    } catch (err) {
      Alert.alert("Error", err.message);
    }
  }

  async function handleComment() {
    if (!commentText.trim()) return;

    try {
      // api/posts addComment returns the comment object
      // But we need to update the local comments list.
      // Does it return the full list? No, usually just the new comment.
      // But we might need to re-fetch comments or append.
      // Let's check api/posts addComment response.
      const newComment = await addComment(post._id, commentText);
      
      // Manually populate user for display since backend returns ID only
      const populatedComment = {
        ...newComment,
        user: user || { username: "You" }
      };
      
      // So I should append.
      setComments([...comments, populatedComment]);
      setCommentText("");

      if (typeof refreshFeed === "function") {
        refreshFeed();
      }
    } catch (err) {
      Alert.alert("Error", err.message);
    }
  }

  const authorName =
    post.author?.displayName ||
    post.author?.username ||
    post.user?.displayName ||
    post.user?.username ||
    "Grower";

  const postBody = post.body || post.text || post.content || "";

  return (
    <ScreenContainer scroll>
      {post.title ? <Text style={styles.title}>{post.title}</Text> : null}

      <Card style={{ marginBottom: spacing(4) }}>
        {/* Author */}
        <Text style={styles.author}>Posted by {authorName}</Text>

        {/* Body */}
        {postBody ? <Text style={styles.body}>{postBody}</Text> : null}

        {/* Photos */}
        {post.photos?.length > 0 && (
          <ScrollView
            horizontal
            style={{ marginVertical: spacing(3) }}
            showsHorizontalScrollIndicator={false}
          >
            {post.photos.map((url, idx) => (
              <Image
                key={idx}
                source={{ uri: url }}
                style={styles.photo}
                resizeMode="cover"
              />
            ))}
          </ScrollView>
        )}

        {/* Like Button */}
        <TouchableOpacity onPress={handleLike} style={styles.likeBtn}>
          <Text style={styles.likeText}>❤️ {likes}</Text>
        </TouchableOpacity>
      </Card>

      {/* Comments Section */}
      <Card>
        <Text style={styles.commentHeader}>Comments</Text>

        {comments.length === 0 && (
          <Text style={styles.noComments}>No comments yet</Text>
        )}

        {comments.map((c, idx) => (
          <View key={idx} style={styles.commentItem}>
            <Text style={styles.commentAuthor}>
              {c.author?.displayName || c.user?.username || c.user?.name || "User"}:
            </Text>
            <Text style={styles.commentText}>{c.text}</Text>
          </View>
        ))}

        {/* Add Comment */}
        <View style={styles.commentBox}>
          <TextInput
            value={commentText}
            onChangeText={setCommentText}
            placeholder="Add a comment..."
            placeholderTextColor={colors.textSoft}
            style={styles.input}
          />

          <PrimaryButton title="Post" onPress={handleComment} />
        </View>
      </Card>
    </ScreenContainer>
  );
}

const styles = {
  title: {
    fontSize: 26,
    fontWeight: "700",
    marginBottom: spacing(5),
    color: colors.text
  },
  author: {
    color: colors.textSoft,
    marginBottom: spacing(2)
  },
  body: {
    color: colors.text,
    marginBottom: spacing(2),
    fontSize: 16,
    lineHeight: 22
  },
  photo: {
    width: 260,
    height: 260,
    borderRadius: radius.card,
    marginRight: spacing(3)
  },
  likeBtn: {
    marginTop: spacing(2)
  },
  likeText: {
    color: colors.accent,
    fontWeight: "700",
    fontSize: 18
  },
  commentHeader: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: spacing(3)
  },
  noComments: {
    color: colors.textSoft,
    marginBottom: spacing(3)
  },
  commentItem: {
    marginBottom: spacing(2)
  },
  commentAuthor: {
    fontWeight: "700",
    color: colors.text
  },
  commentText: {
    color: colors.textSoft,
    marginLeft: spacing(2)
  },
  commentBox: {
    marginTop: spacing(4)
  },
  input: {
    backgroundColor: "#fff",
    padding: spacing(3),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing(3),
    color: colors.text
  },

  /* VIP Lock Styles */
  lockTitle: {
    fontSize: 24,
    textAlign: "center",
    fontWeight: "700",
    marginBottom: spacing(3),
    color: colors.accent
  },
  lockText: {
    textAlign: "center",
    marginBottom: spacing(4),
    color: colors.text,
    fontSize: 16
  }
};