import React, { useCallback, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  Pressable,
  View
} from "react-native";
import { useRouter } from "expo-router";

import { createForumPost } from "@/api/communitySocial";
import { useAuth } from "@/auth/AuthContext";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import PersonalFeedPlacement from "@/components/feed/PersonalFeedPlacement";
import { radius } from "@/theme/theme";
import { resolveImageUri } from "@/utils/photoUploads";

type SelectedPhoto = {
  uri: string;
  width?: number | null;
  height?: number | null;
  mimeType?: string | null;
};

export default function ForumNewPostRoute() {
  const router = useRouter();
  const auth = useAuth();
  const entitlements = useEntitlements();
  const canPost = entitlements.can(CAPABILITY_KEYS.FORUM_POST);
  const workspaceContext = entitlements.mode || "personal";
  const authorType =
    workspaceContext === "commercial"
      ? "commercial"
      : workspaceContext === "facility"
        ? "facility"
        : "user";
  const identityLabel =
    authorType === "commercial"
      ? "Brand"
      : authorType === "facility"
        ? "Facility"
        : "User";

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [photos, setPhotos] = useState<SelectedPhoto[]>([]);

  const pickPhotos = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setFeedback("Photo-library permission is required to attach pictures.");
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      allowsEditing: false,
      quality: 0.85
    });
    if (picked.canceled) return;
    setPhotos((current) => [
      ...current,
      ...picked.assets
        .filter((asset) => asset.uri)
        .map((asset) => ({
          uri: asset.uri,
          width: asset.width ?? null,
          height: asset.height ?? null,
          mimeType: asset.mimeType ?? null
        }))
    ]);
    setFeedback("");
  }, []);

  const submit = useCallback(async () => {
    if (!canPost) return;
    const nextTitle = title.trim();
    const nextBody = body.trim();
    if (!nextTitle || !nextBody) return;

    setSubmitting(true);
    setFeedback("");
    try {
      await createForumPost({
        title: nextTitle,
        body: nextBody,
        authorType,
        authorId: auth.user?._id || auth.user?.id || null,
        workspaceContext,
        photos: photos.map((photo) => photo.uri)
      });
      router.replace("/home/personal/forum");
    } catch (error: any) {
      setFeedback(error?.message || "Unable to create discussion.");
    } finally {
      setSubmitting(false);
    }
  }, [
    auth.user?._id,
    auth.user?.id,
    authorType,
    body,
    canPost,
    photos,
    router,
    title,
    workspaceContext
  ]);

  const disabled = !title.trim() || !body.trim() || submitting || !canPost;

  return (
    <ScreenBoundary
      name="personal.forum.newPost"
      showBack
      backFallbackHref="/home/personal/forum"
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View>
          <Text style={styles.title}>New Discussion</Text>
          <Text style={styles.subtitle}>
            Create a forum discussion or Q&A post. Product, course, live, and storefront
            promotions belong in Feed / Campaigns.
          </Text>
          <PersonalFeedPlacement
            placement="top"
            routeKey="personal_forum_new_post"
            longContent
          />
        </View>

        {!canPost ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Posting unavailable</Text>
            <Text style={styles.cardText}>This account does not have `FORUM_POST`.</Text>
          </View>
        ) : null}

        <View style={styles.identityCard}>
          <Text style={styles.identityTitle}>Posting as {identityLabel}</Text>
          <Text style={styles.identityText}>Workspace: {workspaceContext}</Text>
          <Text style={styles.identityText}>
            Forum is discussion and Q&A. Feed / Campaigns is commercial and facility
            outreach.
          </Text>
        </View>

        {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}

        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Title"
          editable={!submitting && canPost}
          style={styles.input}
          accessibilityLabel="Forum post title"
        />
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="Write your question or discussion..."
          multiline
          editable={!submitting && canPost}
          style={[styles.input, styles.bodyInput]}
          accessibilityLabel="Forum post body"
        />

        <View style={styles.photoTools}>
          <Pressable
            onPress={pickPhotos}
            disabled={submitting || !canPost}
            style={[
              styles.secondaryBtn,
              styles.attachBtn,
              (submitting || !canPost) && styles.disabled
            ]}
            accessibilityRole="button"
            accessibilityLabel="Attach forum post photos"
          >
            <Text style={styles.secondaryText}>
              {photos.length ? "Add More Photos" : "Attach Photos"}
            </Text>
          </Pressable>
          {photos.length ? (
            <Text style={styles.photoCount}>{photos.length} attached</Text>
          ) : null}
        </View>

        {photos.length ? (
          <View style={styles.photoGrid}>
            {photos.map((photo, index) => (
              <View key={`${photo.uri}-${index}`} style={styles.photoTile}>
                <Image
                  source={{ uri: resolveImageUri(photo.uri) }}
                  style={styles.photoPreview}
                  resizeMode="cover"
                  accessibilityLabel={`Forum post photo ${index + 1}`}
                />
                <Pressable
                  onPress={() =>
                    setPhotos((current) =>
                      current.filter((_, itemIndex) => itemIndex !== index)
                    )
                  }
                  disabled={submitting}
                  style={styles.removePhoto}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove forum post photo ${index + 1}`}
                >
                  <Text style={styles.removePhotoText}>Remove</Text>
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}

        <PersonalFeedPlacement
          placement="middle"
          routeKey="personal_forum_new_post"
          longContent
        />

        <Pressable
          onPress={submit}
          disabled={disabled}
          style={[styles.primaryBtn, disabled && styles.disabled]}
          accessibilityRole="button"
          accessibilityLabel="Publish forum post"
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryText}>Post</Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => router.back()}
          style={styles.secondaryBtn}
          accessibilityRole="button"
          accessibilityLabel="Cancel forum post"
        >
          <Text style={styles.secondaryText}>Cancel</Text>
        </Pressable>

        <PersonalFeedPlacement
          placement="bottom"
          routeKey="personal_forum_new_post"
          longContent
        />
      </ScrollView>
    </ScreenBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  content: { padding: 20, paddingBottom: 36, gap: 12 },
  title: { fontSize: 24, fontWeight: "800", color: "#0F172A" },
  subtitle: { color: "#64748B", marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF"
  },
  bodyInput: { minHeight: 150, textAlignVertical: "top" },
  card: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: radius.card,
    padding: 14,
    backgroundColor: "#F8FAFC",
    gap: 6
  },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#0F172A" },
  cardText: { color: "#475569", lineHeight: 20 },
  identityCard: {
    backgroundColor: "#F8FAFC",
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    borderWidth: 1,
    padding: 12
  },
  identityTitle: { color: "#0F172A", fontSize: 15, fontWeight: "900" },
  identityText: { color: "#475569", fontSize: 13, fontWeight: "700", marginTop: 4 },
  primaryBtn: {
    alignItems: "center",
    backgroundColor: "#166534",
    borderRadius: radius.card,
    paddingHorizontal: 12,
    paddingVertical: 11
  },
  primaryText: { color: "#FFFFFF", fontWeight: "800" },
  secondaryBtn: {
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    paddingHorizontal: 12,
    paddingVertical: 11
  },
  attachBtn: { alignSelf: "flex-start" },
  secondaryText: { color: "#0F172A", fontWeight: "800" },
  photoTools: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 10 },
  photoCount: { color: "#64748B", fontSize: 12, fontWeight: "700" },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  photoTile: { width: 118, gap: 6 },
  photoPreview: {
    width: 118,
    height: 88,
    borderRadius: radius.card,
    backgroundColor: "#E2E8F0"
  },
  removePhoto: {
    alignItems: "center",
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    borderWidth: 1,
    paddingVertical: 6
  },
  removePhotoText: { color: "#334155", fontSize: 12, fontWeight: "800" },
  disabled: { opacity: 0.5 },
  feedback: {
    color: "#334155",
    backgroundColor: "#F1F5F9",
    borderRadius: radius.card,
    padding: 9,
    fontWeight: "700"
  }
});
