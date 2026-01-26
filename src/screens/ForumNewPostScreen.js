import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  Alert
} from "react-native";
import { useQueryClient } from "@tanstack/react-query";

import * as ImagePicker from "expo-image-picker";
import ScreenContainer from "../components/ScreenContainer";
import PrimaryButton from "../components/PrimaryButton";
import { createPost } from "../api/forum";
import { uploadImage } from "../api/uploads";
import GrowInterestPicker from "../components/GrowInterestPicker";
import {
  buildEmptyTierSelection,
  flattenTierSelections,
  groupTagsByTier
} from "../utils/growInterests";
import { useAuth } from "@/auth/AuthContext";

const categoryOptions = [
  { key: "general", label: "General", desc: "Updates, questions, daily logs" },
  { key: "diagnostics", label: "Diagnostics", desc: "Ask for help identifying issues" },
  { key: "training", label: "Training", desc: "Techniques, LST/HST, shaping" },
  { key: "harvest", label: "Harvest", desc: "Drying, curing, post-harvest" },
  { key: "gear", label: "Gear & Setup", desc: "Lights, tents, hardware" }
];

export default function ForumNewPostScreen({ route, navigation }) {
  const queryClient = useQueryClient();
  const { user, mode } = useAuth();
  const photosFromLog = route.params?.photos || [];
  const notesFromLog = route.params?.content || "";
  const strainFromLog = route.params?.strain || "";
  const initialGrowTags = route.params?.initialGrowInterests || route.params?.tags || [];
  const initialPostType = route.params?.postType || "education";
  const workspaceContext = route.params?.workspace || mode || "personal";
  const isCommercial = workspaceContext === "commercial";
  const growLogId = route.params?.growLogId || route.params?.fromGrowLogId || null;
  const defaultPickerExpansion = Boolean(route.params?.expandInterestPicker);

  const [content, setContent] = useState(notesFromLog);
  const [photos, setPhotos] = useState(photosFromLog);
  const [strain, setStrain] = useState(strainFromLog);
  const [growInterestSelections, setGrowInterestSelections] = useState(
    initialGrowTags.length ? groupTagsByTier(initialGrowTags) : buildEmptyTierSelection()
  );

  const allowedPostTypes = ["education", "offer", "discussion", "course"];
  const safeInitialType = useMemo(
    () => (allowedPostTypes.includes(initialPostType) ? initialPostType : "education"),
    [initialPostType]
  );
  const [postType, setPostType] = useState(safeInitialType);

  const [category, setCategory] = useState("general");
  const [loading, setLoading] = useState(false);

  // ... rest of state

  // ---------------------------------------
  // PICK PHOTOS
  // ---------------------------------------
  async function addPhotos() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7
    });

    if (!result.canceled) {
      const uris = result.assets.map((a) => a.uri);
      setPhotos([...photos, ...uris]);
    }
  }

  // ---------------------------------------
  // SUBMIT POST
  // ---------------------------------------
  async function handleSubmit() {
    const finalTags = flattenTierSelections(growInterestSelections);

    if (isCommercial && !allowedPostTypes.includes(postType)) {
      Alert.alert("Choose a post type", "Pick education, offer, discussion, or course.");
      return;
    }

    if (isCommercial && postType === "offer") {
      const lower = content.toLowerCase();
      if (content.includes("$") || lower.includes("http")) {
        Alert.alert(
          "Remove prices/links",
          "Commercial offers cannot include prices or checkout links."
        );
        return;
      }
    }

    if (!content.trim() && photos.length === 0) {
      return Alert.alert("Empty Post", "Add text or at least one photo.");
    }

    try {
      setLoading(true);

      const uploadedPhotos = [];
      for (const uri of photos) {
        // If it looks like a remote URL, keep it
        if (uri.startsWith("http") || uri.startsWith("/")) {
          uploadedPhotos.push(uri);
        } else {
          // Upload local file
          const res = await uploadImage(uri);
          if (res?.url) {
            uploadedPhotos.push(res.url);
          }
        }
      }

      const payload = {
        content,
        photos: uploadedPhotos,
        tags: finalTags,
        strain,
        category,
        growLogId,
        postType: isCommercial ? postType : "discussion",
        authorType: isCommercial ? "business" : "user",
        authorId: isCommercial
          ? user?.business?.id || user?.business?._id || user?._id || null
          : user?._id || null,
        workspaceContext: workspaceContext
      };

      await createPost(payload);

      // Invalidate feed cache
      queryClient.invalidateQueries({ queryKey: ["forum-feed"] });

      setLoading(false);
      // Return to feed
      navigation.goBack();
    } catch (err) {
      setLoading(false);
      Alert.alert("Error", err.message);
    }
  }

  return (
    <ScreenContainer scroll>
      <Text style={styles.header}>New Forum Post</Text>

      <View style={styles.identityBox}>
        <Text style={styles.identityTitle}>
          Posting as {isCommercial ? "Business" : "User"}
        </Text>
        <Text style={styles.identitySub}>Workspace: {workspaceContext}</Text>
      </View>

      {/* TEXT INPUT */}
      <TextInput
        style={[styles.input, styles.textBox]}
        placeholder="Share an update..."
        multiline
        value={content}
        onChangeText={setContent}
      />

      {/* CATEGORY */}
      <Text style={styles.label}>Category</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: 16 }}
      >
        {categoryOptions.map((cat) => (
          <TouchableOpacity
            key={cat.key}
            onPress={() => setCategory(cat.key)}
            style={[
              styles.categoryButton,
              category === cat.key && styles.categoryButtonActive
            ]}
          >
            <Text
              style={
                category === cat.key ? styles.categoryTextActive : styles.categoryText
              }
            >
              {cat.label}
            </Text>
            <Text style={styles.categoryDesc}>{cat.desc}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isCommercial && (
        <View style={{ marginBottom: 12 }}>
          <Text style={styles.label}>Post type (commercial)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {allowedPostTypes.map((type) => (
              <TouchableOpacity
                key={type}
                onPress={() => setPostType(type)}
                style={[
                  styles.categoryButton,
                  postType === type && styles.categoryButtonActive
                ]}
              >
                <Text
                  style={
                    postType === type ? styles.categoryTextActive : styles.categoryText
                  }
                >
                  {type}
                </Text>
                <Text style={styles.categoryDesc}>
                  {type === "education"
                    ? "Teach something before you pitch"
                    : type === "offer"
                      ? "No price/checkout links allowed"
                      : type === "course"
                        ? "Announce or link to a course"
                        : "Start a discussion"}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* STRAIN INPUT */}
      <Text style={styles.label}>Strain (optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="Blueberry Muffin, Gelato #33, etc."
        value={strain}
        onChangeText={setStrain}
      />

      <GrowInterestPicker
        title="Grow Interests relevant to this forum post"
        helperText="Select the tiers that best describe your update. Leave any tier empty."
        value={growInterestSelections}
        onChange={setGrowInterestSelections}
        defaultExpanded={defaultPickerExpansion}
      />

      {/* PHOTO GRID */}
      <Text style={[styles.label, { marginTop: 16 }]}>Photos</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: 16 }}
      >
        {photos.map((uri, i) => (
          <Image key={i} source={{ uri }} style={styles.photo} />
        ))}

        <TouchableOpacity style={styles.addPhotoBox} onPress={addPhotos}>
          <Text style={styles.plus}>+</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* SUBMIT BUTTON */}
      <PrimaryButton
        title={loading ? "Posting..." : "Post"}
        onPress={handleSubmit}
        disabled={loading}
        style={{ marginTop: 20 }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 10
  },
  input: {
    backgroundColor: "#f3f3f3",
    borderRadius: 10,
    padding: 10,
    marginBottom: 15
  },
  textBox: {
    height: 140,
    textAlignVertical: "top"
  },
  label: {
    fontWeight: "600",
    marginBottom: 5
  },
  categoryButton: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginRight: 12,
    minWidth: 140,
    borderWidth: 2,
    borderColor: "#E5E7EB"
  },
  categoryButtonActive: {
    backgroundColor: "#10B981",
    borderColor: "#10B981"
  },
  identityBox: {
    backgroundColor: "#F3F4F6",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10
  },
  identityTitle: {
    fontWeight: "700",
    color: "#111827"
  },
  identitySub: {
    color: "#4B5563",
    fontSize: 12
  },
  categoryText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 2
  },
  categoryTextActive: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 2
  },
  categoryDesc: {
    fontSize: 11,
    color: "#9CA3AF"
  },
  photo: {
    width: 90,
    height: 90,
    borderRadius: 10,
    marginRight: 10
  },
  addPhotoBox: {
    width: 90,
    height: 90,
    backgroundColor: "#eaeaea",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center"
  },
  plus: {
    fontSize: 30,
    color: "#777"
  }
});
