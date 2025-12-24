import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert
} from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import Card from "../components/Card";
import PrimaryButton from "../components/PrimaryButton";
import { colors, spacing, radius } from "../theme/theme";
import { likePost, commentOnPost } from "../api/forum";
import { useAuth } from "../context/AuthContext";

export default function PostDetailScreen({ route, navigation }) {
  const { isEntitled } = useAuth();
  const { post, refreshFeed } = route.params;
  const [likes, setLikes] = useState(post.likes || 0);
  const [comments, setComments] = useState(post.comments || []);
  const [commentText, setCommentText] = useState("");

  // VIP Lock
  if (post.vipOnly && !isPro) {
    return (
      <ScreenContainer>
        <Card>
          <Text style={styles.lockTitle}>EXCLUSIVE CONTENT</Text>
          <Text style={styles.lockText}>
            This post is only available to Pro members and Guild participants.
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
      setLikes(res.likes);

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
      const updated = await commentOnPost(post._id, commentText);
      setComments(updated.comments);
      setCommentText("");

      if (typeof refreshFeed === "function") {
        refreshFeed();
      }
    } catch (err) {
      Alert.alert("Error", err.message);
    }
  }

  return (
    <ScreenContainer scroll>
      <Text style={styles.title}>{post.title}</Text>

      <Card style={{ marginBottom: spacing(4) }}>
        {/* Author */}
        <Text style={styles.author}>
          Posted by {post.author?.displayName || "Unknown"}
        </Text>

        {/* Body */}
        {post.body ? <Text style={styles.body}>{post.body}</Text> : null}

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
              {c.author?.displayName || "User"}:
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

const styles = StyleSheet.create({
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
});
