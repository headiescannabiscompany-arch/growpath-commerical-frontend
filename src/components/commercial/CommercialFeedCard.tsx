import React, { useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { useAuth } from "../../auth/AuthContext";
import { api } from "../../api/client"; // your universal API client

type Author = {
  id: string;
  displayName: string;
  email: string;
  role: string;
  plan: string | null;
  subscriptionStatus: string | null;
};

type CommercialPost = {
  id: string;
  author: Author | null;
  type: string;
  title?: string;
  body: string;
  tags?: string[];
  location?: string;
  likeCount: number;
  commentCount: number;
  createdAt: string;
};

type Props = {
  post: CommercialPost;
};

export default function CommercialFeedCard({ post }: Props) {
  const { user } = useAuth();

  const [likeCount, setLikeCount] = useState(post.likeCount || 0);
  const [liked, setLiked] = useState(false); // backend doesn't return "liked yet"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOwnPost = user?.id === post.author?.id;

  async function handleLikeToggle() {
    if (loading) return;

    setLoading(true);
    setError(null);

    // optimistic update
    const prevLiked = liked;
    const prevCount = likeCount;

    if (liked) {
      setLiked(false);
      setLikeCount((c) => Math.max(c - 1, 0));
    } else {
      setLiked(true);
      setLikeCount((c) => c + 1);
    }

    try {
      if (prevLiked) {
        await api.post(`/api/commercial/unlike/${post.id}`);
      } else {
        await api.post(`/api/commercial/like/${post.id}`);
      }
    } catch (err) {
      // rollback on error
      setLiked(prevLiked);
      setLikeCount(prevCount);
      setError("Could not update like");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View
      style={{
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        marginHorizontal: 12,
        marginVertical: 6
      }}
    >
      {/* Header */}
      <View style={{ marginBottom: 6 }}>
        <Text style={{ fontWeight: "600" }}>{post.author?.displayName || "Unknown"}</Text>
        <Text style={{ fontSize: 12, opacity: 0.6 }}>
          {new Date(post.createdAt).toLocaleString()}
        </Text>
      </View>

      {/* Body */}
      {post.title ? (
        <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 4 }}>
          {post.title}
        </Text>
      ) : null}

      <Text style={{ fontSize: 15, marginBottom: 8 }}>{post.body}</Text>

      {/* Meta */}
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Pressable
          onPress={handleLikeToggle}
          style={{
            paddingVertical: 6,
            paddingHorizontal: 10,
            borderRadius: 8,
            borderWidth: 1,
            marginRight: 12,
            opacity: loading ? 0.6 : 1
          }}
        >
          {loading ? (
            <ActivityIndicator size="small" />
          ) : (
            <Text>{liked ? "♥ Liked" : "♡ Like"}</Text>
          )}
        </Pressable>

        <Text style={{ opacity: 0.7 }}>
          {likeCount} likes · {post.commentCount || 0} comments
        </Text>
      </View>

      {error ? (
        <Text style={{ marginTop: 6, color: "red", fontSize: 12 }}>{error}</Text>
      ) : null}

      {isOwnPost ? (
        <Text style={{ marginTop: 6, fontSize: 11, opacity: 0.5 }}>Your post</Text>
      ) : null}
    </View>
  );
}
