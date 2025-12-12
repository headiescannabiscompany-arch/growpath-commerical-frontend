import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import { getFeed, likePost, unlikePost } from "../api/posts";

export default function FeedScreen({ navigation }) {
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);

  async function load() {
    const res = await getFeed(page);
    setPosts((prev) => [...prev, ...(res?.data || [])]);
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
        <TouchableOpacity onPress={() => toggleLike(item)}>
          <Text style={styles.like}>❤️ {item.likeCount || 0}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate("Comments", { postId: item._id })}
        >
          <Text style={styles.comment}>💬 Comments</Text>
        </TouchableOpacity>
      </View>
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
