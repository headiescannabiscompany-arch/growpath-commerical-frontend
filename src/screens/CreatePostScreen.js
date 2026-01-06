import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Platform,
  Alert,
  ActivityIndicator
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import ScreenContainer from "../components/ScreenContainer";
import { createPost } from "../api/posts";
import { useAuth } from "../context/AuthContext.js";
import { useNavigation, useRoute } from "@react-navigation/native";
import GrowInterestPicker from "../components/GrowInterestPicker";
import { buildEmptyTierSelection, flattenTierSelections } from "../utils/growInterests";

export default function CreatePostScreen() {
  const [text, setText] = useState("");
  const [photos, setPhotos] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const navigation = useNavigation();
  const route = useRoute();
  const onPostCreated = route.params?.onPostCreated;
  const { user } = useAuth();
  const [growInterestSelections, setGrowInterestSelections] = useState(
    buildEmptyTierSelection()
  );

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
    if (submitting) return;
    if (!text.trim() && photos.length === 0) {
      Alert.alert("Add a post", "Share some text or add a photo before posting.");
      return;
    }

    setSubmitting(true);
    const form = new FormData();
    form.append("text", text);
    const selectedTags = flattenTierSelections(growInterestSelections);
    if (selectedTags.length) {
      form.append("growTags", JSON.stringify(selectedTags));
    }

    for (const photo of photos) {
      // For web/TypeScript compatibility, use Blob and filename
      if (Platform.OS === "web") {
        const response = await fetch(photo);
        const blob = await response.blob();
        form.append("photos", blob, "photo.jpg");
      } else {
        form.append("photos", {
          uri: photo,
          name: `photo_${photos.indexOf(photo)}.jpg`,
          type: "image/jpeg"
        });
      }
    }

    try {
      await createPost(form);
      if (typeof onPostCreated === "function") {
        onPostCreated();
      }
      navigation.goBack();
    } catch (err) {
      Alert.alert("Unable to post", err.message || "Please try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScreenContainer scroll>
      <Text style={{ fontSize: 22, fontWeight: "700" }}>Create Post</Text>

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

      <TouchableOpacity
        style={{
          marginTop: 12,
          backgroundColor: "#3498db",
          padding: 12,
          borderRadius: 8
        }}
        onPress={pickImage}
      >
        <Text style={{ color: "white", textAlign: "center" }}>
          Add Photos
        </Text>
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
          borderRadius: 8
        }}
        onPress={submit}
        disabled={submitting}
        accessibilityRole="button"
        testID="create-post-submit"
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text
            style={{ color: "white", fontSize: 18, textAlign: "center" }}
          >
            Post
          </Text>
        )}
      </TouchableOpacity>
    </ScreenContainer>
  );
}
