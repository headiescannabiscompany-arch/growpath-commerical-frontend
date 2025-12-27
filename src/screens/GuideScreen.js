import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Alert
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import ScreenContainer from "../components/ScreenContainer";
import Card from "../components/Card";
import PrimaryButton from "../components/PrimaryButton";
import { colors, spacing, radius } from "../theme/theme";
import { listPosts, createPost, likePost, commentOnPost } from "../api/forum";
import { useAuth } from "../context/AuthContext";

export default function GuideScreen({ route, navigation }) {
  const { isEntitled } = useAuth();
  const photosFromLog = route.params?.photos || [];
  const contentFromLog = route.params?.content || "";
  const strainFromLog = route.params?.strain || "";
  const tagsFromLog = route.params?.tags || [];
  const fromGrowLogId = route.params?.fromGrowLogId || null;

  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [photos, setPhotos] = useState([]);
  const [vipOnly, setVipOnly] = useState(false);

  // ... existing methods ...

  function openPost(item) {
    if (item.vipOnly && !isPro) {
      return Alert.alert(
        "Pro Only",
        "This post is exclusive to Pro members.",
        [
          { text: "Cancel" },
          { text: "Go Pro", onPress: () => navigation.navigate("Subscribe") }
        ]
      );
    }

    // navigation.navigate("PostDetail", { post: item });
  }
  if (loading) {
    return (
      <ScreenContainer>
        <ActivityIndicator size="large" color={colors.accent} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll>
      <Text style={styles.header}>Show Your Grow</Text>

      {/* CREATE POST BUTTON */}
      {!showCreateForm && (
        <PrimaryButton
          title="Create Post"
          onPress={() => setShowCreateForm(true)}
          style={{ marginBottom: spacing(5) }}
        />
      )}

      {/* CREATE POST FORM */}
      {showCreateForm && (
        <Card style={{ marginBottom: spacing(6) }}>
          <Text style={styles.label}>New Post</Text>

          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Title"
            placeholderTextColor={colors.textSoft}
            style={styles.input}
          />

          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="What's happening in your grow?"
            placeholderTextColor={colors.textSoft}
            style={[styles.input, { height: 80 }]}
            multiline
          />

          <TouchableOpacity onPress={pickImages} style={styles.uploadBtn}>
            <Text style={styles.uploadText}>
              {photos.length > 0
                ? `Selected ${photos.length} photo(s)`
                : "Upload Photos"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setVipOnly(!vipOnly)}
            style={styles.vipToggle}
          >
            <Text style={styles.vipToggleText}>
              {vipOnly ? "VIP Only (Pro Members)" : "Make VIP Only"}
            </Text>
          </TouchableOpacity>

          <PrimaryButton title="Post" onPress={handleCreatePost} />
        </Card>
      )}

      {/* FEED LIST */}
      <FlatList
        data={posts}
        contentContainerStyle={{ paddingBottom: 100 }}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => navigation.navigate("PostDetail", { post: item, refreshFeed: debouncedLoadPosts })}>
            <Card style={{ marginBottom: spacing(5) }}>
              <Text style={styles.postTitle}>{item.title}</Text>

              {item.vipOnly && (
                <Text style={styles.vipBadge}>PRO EXCLUSIVE</Text>
              )}

              {item.body ? (
                <Text style={styles.postBody}>{item.body}</Text>
              ) : null}

              {/* Photos */}
              {item.photos?.map((url, idx) => (
                <Image
                  key={idx}
                  source={{ uri: url }}
                  style={styles.postImage}
                />
              ))}

              {/* Likes */}
              <TouchableOpacity
                onPress={() => handleLike(item._id)}
                style={styles.likeBtn}
              >
                <Text style={styles.likeText}>❤️ {item.likes || 0}</Text>
              </TouchableOpacity>

              {/* Comments */}
              <Text style={styles.commentLabel}>Comments:</Text>
              {item.comments?.map((c, idx) => (
                <Text key={idx} style={styles.commentText}>
                  {c.text}
                </Text>
              ))}
            </Card>
          </TouchableOpacity>
        )}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    fontSize: 26,
    fontWeight: "700",
    marginBottom: spacing(6),
    color: colors.text
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: spacing(2),
    color: colors.text
  },
  input: {
    backgroundColor: "#fff",
    padding: spacing(4),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing(3),
    color: colors.text
  },
  uploadBtn: {
    backgroundColor: colors.accentSoft,
    padding: spacing(3),
    borderRadius: radius.card,
    marginBottom: spacing(4),
    alignItems: "center"
  },
  uploadText: {
    fontWeight: "600",
    color: colors.accent
  },
  postTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing(2)
  },
  postBody: {
    color: colors.text,
    marginBottom: spacing(2)
  },
  postImage: {
    width: "100%",
    height: 240,
    borderRadius: radius.card,
    marginBottom: spacing(2)
  },
  likeBtn: {
    marginTop: spacing(2)
  },
  likeText: {
    color: colors.accent,
    fontWeight: "600"
  },
  commentLabel: {
    marginTop: spacing(2),
    fontWeight: "600"
  },
  commentText: {
    marginTop: spacing(1),
    color: colors.textSoft
  },
  vipToggle: {
    marginBottom: spacing(4),
    padding: spacing(2),
    backgroundColor: colors.accentSoft,
    borderRadius: radius.card,
    alignItems: "center"
  },
  vipToggleText: {
    color: colors.accent,
    fontWeight: "600"
  },
  vipBadge: {
    backgroundColor: colors.accent,
    color: "#fff",
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1),
    borderRadius: radius.pill,
    marginBottom: spacing(2),
    alignSelf: "flex-start",
    fontWeight: "700",
    fontSize: 12
  }
});
