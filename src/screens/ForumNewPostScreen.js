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
import { assistForumDraft, createPost } from "../api/forum";
import GrowInterestPicker from "../components/GrowInterestPicker";
import {
  buildEmptyTierSelection,
  flattenTierSelections,
  groupTagsByTier
} from "../utils/growInterests";
import { useAuth } from "@/auth/AuthContext";
import { maybePromptAttachPhotosToGrow } from "@/utils/growPhotoAttachment";
import { persistImageUris } from "@/utils/photoUploads";
import { radius } from "../theme/theme";

const categoryOptions = [
  { key: "general", label: "General", desc: "Updates, questions, daily logs" },
  { key: "diagnostics", label: "Diagnostics", desc: "Ask for help identifying issues" },
  { key: "training", label: "Training", desc: "Techniques, LST/HST, shaping" },
  { key: "harvest", label: "Harvest", desc: "Drying, curing, post-harvest" },
  { key: "gear", label: "Gear & Setup", desc: "Lights, tents, hardware" },
  { key: "product_qna", label: "Product Q&A", desc: "Product support discussion" },
  { key: "course", label: "Course", desc: "Course and lesson discussion" },
  { key: "live_qna", label: "Live Q&A", desc: "Live event questions" },
  { key: "facility", label: "Facility Internal", desc: "Facility member discussion" }
];

export default function ForumNewPostScreen({ route, navigation }) {
  const queryClient = useQueryClient();
  const auth = useAuth();
  const { user, ctx } = auth;
  const mode = ctx?.mode || auth.mode || "personal";
  const photosFromLog = route.params?.photos || [];
  const notesFromLog = route.params?.content || "";
  const strainFromLog = route.params?.strain || "";
  const initialGrowTags = route.params?.initialGrowInterests || route.params?.tags || [];
  const initialPostType = route.params?.postType || "education";
  const workspaceContext = route.params?.workspace || mode || "personal";
  const isCommercial = workspaceContext === "commercial";
  const isFacility = workspaceContext === "facility";
  const growLogId = route.params?.growLogId || route.params?.fromGrowLogId || null;
  const growId = route.params?.growId || null;
  const context = {
    linkedGrowId: growId,
    linkedPlantId: route.params?.plantId || route.params?.linkedPlantId || null,
    linkedToolRunId: route.params?.toolRunId || route.params?.linkedToolRunId || null,
    linkedRecipeId: route.params?.recipeId || route.params?.linkedRecipeId || null,
    linkedProductId: route.params?.productId || route.params?.linkedProductId || null,
    linkedCourseId: route.params?.courseId || route.params?.linkedCourseId || null,
    linkedLessonId: route.params?.lessonId || route.params?.linkedLessonId || null,
    linkedLiveId: route.params?.liveId || route.params?.linkedLiveId || null,
    linkedStorefrontSlug:
      route.params?.storefrontSlug || route.params?.linkedStorefrontSlug || null,
    linkedFacilityId:
      route.params?.facilityId ||
      route.params?.linkedFacilityId ||
      ctx?.facilityId ||
      null,
    linkedRoomId: route.params?.roomId || route.params?.linkedRoomId || null,
    linkedTaskId: route.params?.taskId || route.params?.linkedTaskId || null,
    linkedAlertId: route.params?.alertId || route.params?.linkedAlertId || null
  };
  const defaultPickerExpansion = Boolean(route.params?.expandInterestPicker);

  const [content, setContent] = useState(notesFromLog);
  const [title, setTitle] = useState(route.params?.title || "");
  const [photos, setPhotos] = useState(photosFromLog);
  const [strain, setStrain] = useState(strainFromLog);
  const [growInterestSelections, setGrowInterestSelections] = useState(
    initialGrowTags.length ? groupTagsByTier(initialGrowTags) : buildEmptyTierSelection()
  );

  const allowedPostTypes = [
    "education",
    "discussion",
    "course",
    "product_qna",
    "live_qna"
  ];
  const safeInitialType = useMemo(
    () => (allowedPostTypes.includes(initialPostType) ? initialPostType : "education"),
    [initialPostType]
  );
  const [postType, setPostType] = useState(safeInitialType);

  const [category, setCategory] = useState(route.params?.category || "general");
  const [loading, setLoading] = useState(false);
  const [assisting, setAssisting] = useState(false);
  const [assistantFeedback, setAssistantFeedback] = useState("");

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

    if ((isCommercial || isFacility) && !allowedPostTypes.includes(postType)) {
      Alert.alert(
        "Choose a forum type",
        "Pick education, discussion, course, product Q&A, or live Q&A."
      );
      return;
    }

    if (!content.trim() && photos.length === 0) {
      return Alert.alert("Empty Post", "Add text or at least one photo.");
    }

    try {
      setLoading(true);

      const uploadedPhotos = await persistImageUris(photos);

      const payload = {
        title: title.trim() || undefined,
        content,
        photos: uploadedPhotos,
        tags: finalTags,
        growInterests: finalTags,
        strain,
        category,
        growLogId,
        postType,
        authorType: isCommercial ? "commercial" : isFacility ? "facility" : "user",
        authorId: isCommercial
          ? user?.business?.id || user?.business?._id || user?._id || null
          : isFacility
            ? user?.facility?.id || user?.facility?._id || user?._id || null
            : user?._id || null,
        workspaceContext: workspaceContext,
        documents: Array.isArray(route.params?.documents) ? route.params.documents : [],
        visibility:
          route.params?.visibility === "facilityOnly" ? "facilityOnly" : "public",
        ...context
      };

      await createPost(payload);
      await maybePromptAttachPhotosToGrow(uploadedPhotos, {
        skip: Boolean(growId || growLogId)
      });

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

  async function handleAssist() {
    if (!content.trim() || assisting) return;
    try {
      setAssisting(true);
      const response = await assistForumDraft(content.trim());
      const suggestions = response?.suggestions || {};
      if (suggestions.title) setTitle(String(suggestions.title));
      if (suggestions.category) setCategory(String(suggestions.category));
      if (Array.isArray(suggestions.tags) && suggestions.tags.length) {
        setGrowInterestSelections(groupTagsByTier(suggestions.tags));
      }
      setAssistantFeedback(
        `${suggestions.providerLabel || "Forum assistant"}. Review every suggestion before posting.${suggestions.summary ? ` Summary: ${suggestions.summary}` : ""}`
      );
    } catch (error) {
      setAssistantFeedback(error?.message || "Forum assistant is unavailable.");
    } finally {
      setAssisting(false);
    }
  }

  return (
    <ScreenContainer scroll>
      <Text style={styles.header}>New Forum Post</Text>

      <View style={styles.identityBox}>
        <Text style={styles.identityTitle}>
          Posting as {isCommercial ? "Brand" : isFacility ? "Facility" : "User"}
        </Text>
        <Text style={styles.identitySub}>Workspace: {workspaceContext}</Text>
        <Text style={styles.identitySub}>
          Forum is discussion and Q&A. Promotions, offers, storefront outreach, and ads
          belong in Feed / Campaigns.
        </Text>
      </View>

      {/* TEXT INPUT */}
      <TextInput
        style={styles.input}
        placeholder="Discussion title"
        value={title}
        onChangeText={setTitle}
        accessibilityLabel="Forum discussion title"
      />
      <TextInput
        style={[styles.input, styles.textBox]}
        placeholder="Share an update..."
        multiline
        value={content}
        onChangeText={setContent}
      />
      <TouchableOpacity
        onPress={handleAssist}
        disabled={assisting || !content.trim()}
        style={styles.assistButton}
        accessibilityLabel="Suggest Forum title category tags summary and tasks"
      >
        <Text style={styles.assistButtonText}>
          {assisting ? "Reviewing..." : "Ask AI for structure"}
        </Text>
      </TouchableOpacity>
      {assistantFeedback ? (
        <Text style={styles.assistantFeedback}>{assistantFeedback}</Text>
      ) : null}

      {/* CATEGORY */}
      <Text style={styles.label}>Category</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: 16 }}
      >
        {categoryOptions
          .filter((cat) => cat.key !== "facility" || isFacility)
          .map((cat) => (
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

      {(isCommercial || isFacility) && (
        <View style={{ marginBottom: 12 }}>
          <Text style={styles.label}>Forum type</Text>
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
                  {type.replace(/_/g, " ")}
                </Text>
                <Text style={styles.categoryDesc}>
                  {type === "education"
                    ? "Teach or explain"
                    : type === "product_qna"
                      ? "Product support question"
                      : type === "live_qna"
                        ? "Live event question"
                        : type === "course"
                          ? "Course discussion"
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
    borderRadius: radius.card,
    padding: 10,
    marginBottom: 15
  },
  textBox: {
    height: 140,
    textAlignVertical: "top"
  },
  assistButton: {
    alignItems: "center",
    borderColor: "#0F766E",
    borderRadius: radius.card,
    borderWidth: 1,
    marginBottom: 8,
    padding: 10
  },
  assistButtonText: { color: "#0F766E", fontWeight: "800" },
  assistantFeedback: {
    backgroundColor: "#F0FDFA",
    color: "#115E59",
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
    padding: 10
  },
  label: {
    fontWeight: "600",
    marginBottom: 5
  },
  categoryButton: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radius.card,
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
    borderRadius: radius.card,
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
    borderRadius: radius.card,
    marginRight: 10
  },
  addPhotoBox: {
    width: 90,
    height: 90,
    backgroundColor: "#eaeaea",
    borderRadius: radius.card,
    alignItems: "center",
    justifyContent: "center"
  },
  plus: {
    fontSize: 30,
    color: "#777"
  }
});
