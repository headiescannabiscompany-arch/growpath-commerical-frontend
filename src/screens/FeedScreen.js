import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet } from "react-native";
import ScreenContainer from "../components/ScreenContainer.js";
import { getFeed, likePost, unlikePost } from "../api/posts.js";
import { useAuth } from "../context/AuthContext.js";
import { useNavigation } from "@react-navigation/native";

export default function FeedScreen() {
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const { isPro } = useAuth();
  const navigation = useNavigation();

  async function load() {
    const res = await getFeed(page);
    const payload = res?.data ?? res ?? [];
    setPosts((prev) => [...prev, ...(Array.isArray(payload) ? payload : [])]);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const loadMore = () => setPage((p) => p + 1);

  const toggleLike = async (post) => {
    try {
      if (post.liked) {
        await unlikePost(post._id);
        post.likeCount = Math.max(0, (post.likeCount || 1) - 1);
        post.liked = false;
      } else {
        await likePost(post._id);
        post.likeCount = (post.likeCount || 0) + 1;
        post.liked = true;
      }
      setPosts([...posts]);
    } catch (e) {
      // Silently revert on error - user can retry
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.header}>
        {item.user?.avatar ? (
          <Image source={{ uri: item.user.avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: "#ddd" }]} />
        )}
        <Text style={styles.username}>{item.user?.username || "User"}</Text>
      </View>

      {item.text ? <Text style={styles.text}>{item.text}</Text> : null}

      {item.photos?.length > 0 && (
        <Image source={{ uri: item.photos[0] }} style={styles.mainImage} />
      )}

      <View style={styles.actions}>
        <TouchableOpacity
          onPress={isPro ? () => toggleLike(item) : undefined}
          disabled={!isPro}
        >
          <Text style={[styles.like, !isPro && { color: "#bbb" }]}>
            ❤️ {item.likeCount || 0}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={
            isPro
              ? () => navigation.navigate("Comments", { postId: item._id })
              : undefined
          }
          disabled={!isPro}
        >
          <Text style={[styles.comment, !isPro && { color: "#bbb" }]}>💬 Comments</Text>
        </TouchableOpacity>
      </View>

      {!isPro && (
        <View
          style={{
            marginTop: 10,
            backgroundColor: "#FEF3C7",
            borderRadius: 8,
            padding: 10
          }}
        >
          <Text style={{ color: "#92400E", textAlign: "center", fontSize: 15 }}>
            Liking and commenting are Pro features. Upgrade to Pro to join the
            conversation.
          </Text>
          <TouchableOpacity
            style={{
              marginTop: 8,
              backgroundColor: "#10B981",
              padding: 8,
              borderRadius: 8
            }}
            onPress={() => navigation.navigate("Subscription")}
          >
            <Text style={{ color: "white", textAlign: "center", fontWeight: "700" }}>
              Upgrade to Pro
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <ScreenContainer scroll={false}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item._id}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 12 }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "white", padding: 14, borderRadius: 10, marginBottom: 14 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 8 },
  username: { fontWeight: "700" },
  text: { marginBottom: 8 },
  mainImage: { width: "100%", height: 240, borderRadius: 8 },
  actions: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  like: { fontSize: 16 },
  comment: { fontSize: 16 }
});
