import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useNavigation, useRoute } from "@react-navigation/native";

import ScreenContainer from "../components/ScreenContainer";
import GrowInterestPicker from "../components/GrowInterestPicker";
import { buildEmptyTierSelection, flattenTierSelections } from "../utils/growInterests";

import { useAuth } from "@/auth/AuthContext";
import { handleApiError } from "@/ui/handleApiError";
import { useCreatePost } from "@/hooks/useCreatePost";

export default function CreatePostScreen() {
  const [text, setText] = useState("");
  const [photos, setPhotos] = useState([]);
  const navigation = useNavigation();
  const route = useRoute();
  const onPostCreated = route.params?.onPostCreated;

  const { user, mode } = useAuth();
  const [growInterestSelections, setGrowInterestSelections] = useState(
    buildEmptyTierSelection()
  );

  const workspaceContext = route.params?.workspace || mode || "personal";
  const isCommercial = workspaceContext === "commercial";

  const allowedPostTypes = ["education", "offer", "discussion", "course"];
  const safeInitialType = useMemo(
    () =>
      allowedPostTypes.includes(route.params?.postType)
        ? route.params.postType
        : "education",
    [route.params?.postType]
  );

  const [postType, setPostType] = useState(isCommercial ? safeInitialType : "discussion");

  const { createPost, isCreating } = useCreatePost();

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: ImagePicker.MediaTypeOptions.Images
    });
    if (!result.canceled) {
      setPhotos((prev) => [...prev, ...result.assets.map((a) => a.uri)]);
    }
  }

  async function submit() {
    if (isCreating) return;

    if (!text.trim() && photos.length === 0) {
      Alert.alert("Add a post", "Share some text or add a photo before posting.");
      return;
    }

    if (isCommercial && !allowedPostTypes.includes(postType)) {
      Alert.alert("Choose a post type", "Pick education, offer, discussion, or course.");
      return;
    }

    if (isCommercial && postType === "offer") {
      const lower = text.toLowerCase();
      if (text.includes("$") || lower.includes("http")) {
        Alert.alert(
          "Remove prices/links",
          "Commercial offers cannot include prices or checkout links."
        );
        return;
      }
    }

    const selectedTags = flattenTierSelections(growInterestSelections);

    const authorId = isCommercial
      ? user?.business?.id || user?.business?._id || user?._id || ""
      : user?._id || "";

    try {
      await createPost({
        text,
        workspaceContext,
        authorType: isCommercial ? "business" : "user",
        authorId,
        postType: isCommercial ? postType : "discussion",
        growTags: selectedTags,
        photos
      });

      if (typeof onPostCreated === "function") onPostCreated();
      navigation.goBack();
    } catch (err) {
      handleApiError(err);
      Alert.alert("Unable to post", "Please try again in a moment.");
    }
  }

  return (
    <ScreenContainer scroll>
      <Text style={{ fontSize: 22, fontWeight: "700" }}>Create Post</Text>

      <View
        style={{
          marginTop: 8,
          padding: 10,
          borderRadius: 10,
          backgroundColor: "#F3F4F6"
        }}
      >
        <Text style={{ fontWeight: "700", color: "#111827" }}>
          Posting as {isCommercial ? "Business" : "User"}
        </Text>
        <Text style={{ color: "#4B5563", fontSize: 12 }}>
          Workspace: {workspaceContext}
        </Text>
      </View>

      <TextInput
        placeholder="Say something about your grow..."
        multiline
        value={text}
        onChangeText={setText}
        style={{
          marginTop: 12,
          padding: 10,
          backgroundColor: "#eee",
          borderRadius: 8,
          height: 120
        }}
      />

      {isCommercial && (
        <View style={{ marginTop: 12 }}>
          <Text style={{ fontWeight: "600", marginBottom: 6 }}>
            Post type (commercial)
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 8 }}
          >
            {allowedPostTypes.map((type) => {
              const active = postType === type;
              return (
                <TouchableOpacity
                  key={type}
                  onPress={() => setPostType(type)}
                  style={{
                    backgroundColor: active ? "#1C8F4A" : "#F3F4F6",
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderRadius: 12,
                    marginRight: 10,
                    borderWidth: 2,
                    borderColor: active ? "#1C8F4A" : "#E5E7EB"
                  }}
                >
                  <Text
                    style={{
                      color: active ? "#FFFFFF" : "#1F2937",
                      fontWeight: "700"
                    }}
                  >
                    {type}
                  </Text>
                  <Text
                    style={{
                      color: active ? "#E5E7EB" : "#6B7280",
                      fontSize: 12,
                      marginTop: 2
                    }}
                  >
                    {type === "education"
                      ? "Teach before pitching"
                      : type === "offer"
                        ? "No prices or checkout links"
                        : type === "course"
                          ? "Announce or link to a course"
                          : "Start a discussion"}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      <TouchableOpacity
        style={{
          marginTop: 12,
          backgroundColor: "#3498db",
          padding: 12,
          borderRadius: 8
        }}
        onPress={pickImage}
      >
        <Text style={{ color: "white", textAlign: "center" }}>Add Photos</Text>
      </TouchableOpacity>

      {photos.map((uri) => (
        <Image
          key={uri}
          source={{ uri }}
          style={{ width: "100%", height: 180, marginTop: 10 }}
        />
      ))}

      <GrowInterestPicker
        title="Grow Interests relevant to this post"
        helperText="Tag your update so growers with similar interests can discover it."
        value={growInterestSelections}
        onChange={setGrowInterestSelections}
        defaultExpanded={false}
      />

      <TouchableOpacity
        style={{
          marginTop: 20,
          backgroundColor: "#2ecc71",
          padding: 14,
          borderRadius: 8,
          opacity: isCreating ? 0.7 : 1
        }}
        onPress={submit}
        disabled={isCreating}
        accessibilityRole="button"
        testID="create-post-submit"
      >
        {isCreating ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ color: "white", fontSize: 18, textAlign: "center" }}>Post</Text>
        )}
      </TouchableOpacity>
    </ScreenContainer>
  );
}
