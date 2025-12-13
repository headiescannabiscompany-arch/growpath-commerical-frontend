import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  RefreshControl
} from "react-native";
import { useNavigation } from "@react-navigation/native";

import ScreenContainer from "../components/ScreenContainer";
import FollowButton from "../components/FollowButton";
import { getLatestPosts, getTrendingPosts, getFollowingPosts } from "../api/forum";

export default function ForumScreen() {
  const [mode, setMode] = useState("latest");
  const [posts, setPosts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    load();
  }, [mode]);

  async function load() {
    try {
      const fn =
        mode === "trending"
          ? getTrendingPosts
          : mode === "following"
            ? getFollowingPosts
            : getLatestPosts;

      const res = await fn();
      setPosts(res.data || res);
    } catch (err) {
      // Failed to load feed
    }
  }

  async function reload() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function renderPost({ item }) {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate("ForumPostDetail", { id: item._id })}
      >
        {/* User */}
        <View style={styles.userRow}>
          <Image
            source={{ uri: item.user?.avatar || "https://via.placeholder.com/100" }}
            style={styles.avatar}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.username}>{item.user?.name || "Anonymous"}</Text>
            <Text style={styles.timestamp}>
              {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          </View>
          <FollowButton userId={item.user?._id} />
        </View>

        {/* Text */}
        {item.content ? <Text style={styles.content}>{item.content}</Text> : null}

        {/* Title (legacy) */}
        {item.title && !item.content ? (
          <Text style={styles.title}>{item.title}</Text>
        ) : null}

        {/* First photo thumbnail */}
        {item.photos && item.photos.length > 0 && (
          <Image
            source={{ uri: item.photos[0] }}
            style={styles.postImage}
            resizeMode="cover"
          />
        )}

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {item.tags.map((tag, idx) => (
              <View key={idx} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            ❤️ {Array.isArray(item.likes) ? item.likes.length : item.likes || 0}
          </Text>
          <Text style={styles.footerText}>
            💬 {item.commentCount || item.comments?.length || 0}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <ScreenContainer>
      <View
        style={{
          backgroundColor: "#F0FDF4",
          borderRadius: 8,
          padding: 12,
          marginBottom: 12
        }}
      >
        <Text
          style={{ color: "#10B981", fontWeight: "600", fontSize: 15, marginBottom: 2 }}
        >
          🌱 Community & Shared Wisdom
        </Text>
        <Text style={{ color: "#222", fontSize: 13 }}>
          The Growers Guild is a space for learning, sharing, and supporting each other.
          There are no experts—only fellow growers on their own journeys. Ask questions,
          offer insights, and remember: every experience helps the community grow
          stronger.
        </Text>
      </View>
      {/* Guild Header */}
      <View style={styles.guildHeader}>
        <View style={styles.guildTitleRow}>
          <View style={styles.guildTitleContainer}>
            <Text style={styles.guildTitle}>🌱 The Growers Guild</Text>
            <Text style={styles.guildSubtitle}>Experience. Observation. Learning.</Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate("GuildCode")}
            style={styles.codeButton}
          >
            <Text style={styles.codeButtonText}>📜 Guild Code</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Top tabs + Create Button */}
      <View style={styles.header}>
        <View style={styles.tabRow}>
          <TouchableOpacity
            onPress={() => setMode("latest")}
            style={[styles.tab, mode === "latest" && styles.tabActive]}
          >
            <Text style={[styles.tabText, mode === "latest" && styles.tabTextActive]}>
              Latest
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setMode("trending")}
            style={[styles.tab, mode === "trending" && styles.tabActive]}
          >
            <Text style={[styles.tabText, mode === "trending" && styles.tabTextActive]}>
              Trending
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setMode("following")}
            style={[styles.tab, mode === "following" && styles.tabActive]}
          >
            <Text style={[styles.tabText, mode === "following" && styles.tabTextActive]}>
              Following
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => navigation.navigate("ForumNewPost")}
          style={styles.createBtn}
        >
          <Text style={styles.createBtnText}>+ Create Post</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item._id}
        renderItem={renderPost}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={reload}
            tintColor="#2ecc71"
          />
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  guildHeader: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: "#f8f9fa",
    borderBottomWidth: 2,
    borderBottomColor: "#27ae60",
    marginBottom: 12
  },
  guildTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  guildTitleContainer: {
    flex: 1
  },
  guildTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2c3e50",
    marginBottom: 4
  },
  guildSubtitle: {
    fontSize: 14,
    color: "#7f8c8d",
    fontStyle: "italic"
  },
  codeButton: {
    backgroundColor: "#27ae60",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6
  },
  codeButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600"
  },
  header: {
    marginBottom: 12
  },
  tabRow: {
    flexDirection: "row",
    marginBottom: 10,
    backgroundColor: "#eee",
    borderRadius: 8,
    padding: 4
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 6,
    backgroundColor: "transparent"
  },
  tabActive: {
    backgroundColor: "#2ecc71"
  },
  tabText: {
    color: "#666",
    fontWeight: "600",
    fontSize: 13
  },
  tabTextActive: {
    color: "white"
  },
  createBtn: {
    backgroundColor: "#2ecc71",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center"
  },
  createBtnText: {
    color: "white",
    fontWeight: "700",
    fontSize: 14
  },
  card: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    boxShadow: "0px 1px 2px rgba(0,0,0,0.05)",
    elevation: 1
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10
  },
  username: {
    fontWeight: "700",
    fontSize: 14
  },
  timestamp: {
    fontSize: 12,
    color: "#999",
    marginTop: 2
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
    color: "#333"
  },
  content: {
    marginBottom: 8,
    color: "#333",
    lineHeight: 20
  },
  postImage: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginBottom: 8
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 8
  },
  tag: {
    backgroundColor: "#e8f5e9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 6,
    marginBottom: 4
  },
  tagText: {
    fontSize: 11,
    color: "#2ecc71",
    fontWeight: "500"
  },
  footer: {
    flexDirection: "row",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#eee"
  },
  footerText: {
    marginRight: 20,
    color: "#777",
    fontSize: 12,
    fontWeight: "600"
  }
});
