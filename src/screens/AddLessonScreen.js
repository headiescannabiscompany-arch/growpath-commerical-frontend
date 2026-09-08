import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import ScreenContainer from "../components/ScreenContainer";
import GrowInterestPicker from "../components/GrowInterestPicker";
import LessonMediaSourceEditor from "@/components/learning/LessonMediaSourceEditor";
import VideoLibraryPicker from "@/components/videos/VideoLibraryPicker";
import { addLesson } from "../api/courses";
import { deleteCourseMediaAsset, uploadCourseMedia } from "@/api/uploads";
import PersonalFeedPlacement from "@/components/feed/PersonalFeedPlacement";
import { useEntitlements } from "@/entitlements";
import { getLearningAccess } from "@/features/learning/learningAccess";
import { persistImageUris } from "@/utils/photoUploads";
import { radius } from "../theme/theme";
import { useAppTheme } from "../theme/appTheme";
import { buildEmptyTierSelection, flattenTierSelections } from "../utils/growInterests";
import {
  emptyLessonMediaDraft,
  lessonMediaDraftFromLesson,
  prepareLessonMediaSubmission
} from "@/features/learning/lessonMedia";

function firstDocumentAsset(result) {
  if (!result || result.canceled) return null;
  if (Array.isArray(result.assets) && result.assets[0]) return result.assets[0];
  if (result.type === "success") return result;
  return null;
}

async function waitForFacilityUploadBatch(promises, facilityMode) {
  if (!facilityMode) return Promise.all(promises);
  const settled = await Promise.allSettled(promises);
  const failure = settled.find((result) => result.status === "rejected");
  if (failure) throw failure.reason;
  return settled.map((result) => result.value);
}

export default function AddLessonScreen({ route, navigation, facilityWorkspace = null }) {
  const entitlements = useEntitlements();
  const baseAccess = getLearningAccess(entitlements);
  const facilityMode = Boolean(facilityWorkspace);
  const missingFacilityAdapter = entitlements.mode === "facility" && !facilityMode;
  const access = {
    ...baseAccess,
    ...(facilityMode
      ? { canCreateCourses: facilityWorkspace?.permissions?.canEditLessons === true }
      : missingFacilityAdapter
        ? { canCreateCourses: false }
        : {})
  };
  const { palette } = useAppTheme();
  const styles = createStyles(palette);
  const { courseId } = route.params;

  const [title, setTitle] = useState("");
  const [order, setOrder] = useState("");
  const [content, setContent] = useState(""); // text lesson
  const [mediaDraft, setMediaDraft] = useState(() => emptyLessonMediaDraft());
  const [videoFile, setVideoFile] = useState(null);
  const [videoAssetId, setVideoAssetId] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [pdfFile, setPdfFile] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [images, setImages] = useState([]);
  const [growInterestSelections, setGrowInterestSelections] = useState(() =>
    buildEmptyTierSelection()
  );

  async function pickVideo() {
    if (facilityMode) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        quality: 1
      });
      if (!result.canceled && result.assets[0]) {
        setVideoFile(result.assets[0]);
        setVideoAssetId("");
        setMediaDraft((current) => ({
          ...current,
          sourceType: "growpath_upload",
          originalUrl: "",
          availabilityStatus: "unchecked",
          lastCheckedAt: "",
          allowEmbed: false
        }));
        Alert.alert("Video selected", "Video will upload when you save the lesson.");
      }
    } catch (_err) {
      Alert.alert("Error", "Failed to pick video");
    }
  }

  async function pickPDF() {
    if (facilityMode) {
      Alert.alert(
        "Facility documents unavailable",
        "Document uploads will be available after secure file scanning is enabled. Use protected images or audio for now."
      );
      return;
    }
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf"
      });

      const asset = firstDocumentAsset(result);
      if (asset) {
        setPdfFile(asset);
        Alert.alert("PDF selected", "PDF will upload when you save the lesson.");
      }
    } catch (_err) {
      Alert.alert("Error", "Failed to pick PDF");
    }
  }

  async function pickAudio() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "audio/*"
      });

      const asset = firstDocumentAsset(result);
      if (asset) {
        setAudioFile(asset);
        Alert.alert("Audio selected", "Audio will upload when you save the lesson.");
      }
    } catch (_err) {
      Alert.alert("Error", "Failed to pick audio");
    }
  }

  async function pickImages() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8
      });

      if (!result.canceled) {
        setImages([...images, ...result.assets]);
      }
    } catch (_err) {
      Alert.alert("Error", "Failed to pick images");
    }
  }

  async function submit() {
    if (!access.canCreateCourses) {
      return Alert.alert("Unavailable", "Adding lessons requires COURSES_CREATE.");
    }
    if (!title.trim()) {
      return Alert.alert("Missing title", "Please add a lesson title.");
    }

    const previewMedia = videoFile
      ? null
      : prepareLessonMediaSubmission(mediaDraft, mediaDraft.originalUrl);
    if (previewMedia?.errors.length) {
      return Alert.alert("Video source needs attention", previewMedia.errors.join(" "));
    }

    const saveLesson = facilityMode ? facilityWorkspace?.api?.addLesson : addLesson;
    if (typeof saveLesson !== "function") {
      return Alert.alert(
        "Unavailable",
        "Lesson authoring is unavailable for this Facility course."
      );
    }

    const uploadOptions = facilityMode
      ? {
          workspaceType: "facility",
          workspaceId: facilityWorkspace?.facilityId
        }
      : {};
    const uploadedFacilityAssetIds = [];
    let lessonSaved = false;
    const uploadTracked = async (asset) => {
      const uploaded = await uploadCourseMedia(asset, uploadOptions);
      if (facilityMode && uploaded?.assetId) {
        uploadedFacilityAssetIds.push(String(uploaded.assetId));
      }
      return uploaded;
    };
    try {
      const [imageUrls, uploadedVideo, uploadedPdf, uploadedAudio] =
        await waitForFacilityUploadBatch(
          [
            facilityMode
              ? waitForFacilityUploadBatch(
                  images.map(async (image) => {
                    const uploaded = await uploadTracked(image);
                    if (!uploaded?.url) {
                      throw new Error("Image upload did not return a URL.");
                    }
                    return uploaded.url;
                  }),
                  true
                )
              : persistImageUris(images.map((image) => image.uri)),
            videoFile && !facilityMode
              ? uploadCourseMedia(videoFile, { purpose: "video" })
              : Promise.resolve(null),
            pdfFile && !facilityMode ? uploadTracked(pdfFile) : Promise.resolve(null),
            audioFile ? uploadTracked(audioFile) : Promise.resolve(null)
          ],
          facilityMode
        );
      const preparedMedia = uploadedVideo
        ? prepareLessonMediaSubmission(
            {
              ...mediaDraft,
              sourceType: "growpath_upload",
              availabilityStatus: "available",
              lastCheckedAt: new Date().toISOString(),
              allowEmbed: false
            },
            uploadedVideo.url
          )
        : previewMedia;

      await saveLesson(courseId, {
        title,
        order: order ? Number(order) : 1,
        content,
        videoUrl: preparedMedia?.videoUrl || "",
        externalVideoUrl: preparedMedia?.externalVideoUrl || "",
        mediaSource: preparedMedia?.mediaSource || undefined,
        videoAssetId,
        pdfUrl: facilityMode ? "" : uploadedPdf?.url || pdfUrl,
        audioUrl: uploadedAudio?.url || "",
        imageUrls,
        growTags: flattenTierSelections(growInterestSelections)
      });
      lessonSaved = true;
      navigation.goBack();
    } catch (error) {
      if (facilityMode && !lessonSaved && uploadedFacilityAssetIds.length) {
        await Promise.allSettled(
          [...new Set(uploadedFacilityAssetIds)].map((assetId) =>
            deleteCourseMediaAsset(assetId)
          )
        );
      }
      Alert.alert("Save failed", String(error?.message || error || "Unknown error"));
    }
  }

  return (
    <ScreenContainer scroll>
      <Text accessibilityRole="header" aria-level={1} style={styles.header}>
        Add Lesson
      </Text>
      {!facilityMode ? (
        <PersonalFeedPlacement
          placement="top"
          routeKey="personal_lesson_add"
          longContent
        />
      ) : null}
      {!access.canCreateCourses ? (
        <View style={styles.lockedCard}>
          <Text style={styles.lockedTitle}>Lesson authoring unavailable</Text>
          <Text style={styles.helpText}>
            {missingFacilityAdapter
              ? "Open this lesson from the selected Facility course workspace."
              : "This account does not have COURSES_CREATE."}
          </Text>
        </View>
      ) : null}
      <Text style={styles.helpText}>
        Add external video links here, or choose protected uploads from the current
        workspace Video Library.
      </Text>

      <TextInput
        accessibilityLabel="Lesson title"
        style={styles.input}
        placeholderTextColor={palette.textMuted}
        placeholder="Title"
        value={title}
        onChangeText={setTitle}
        editable={access.canCreateCourses}
      />

      <TextInput
        accessibilityLabel="Lesson order"
        style={styles.input}
        placeholderTextColor={palette.textMuted}
        placeholder="Order (1, 2, 3...)"
        value={order}
        onChangeText={setOrder}
        keyboardType="numeric"
        editable={access.canCreateCourses}
      />

      <Text style={styles.label}>Text Content (optional)</Text>
      <TextInput
        accessibilityLabel="Lesson text content"
        style={[styles.input, styles.textBox]}
        placeholderTextColor={palette.textMuted}
        placeholder="Write the lesson notes here..."
        value={content}
        onChangeText={setContent}
        multiline
        editable={access.canCreateCourses}
      />

      <LessonMediaSourceEditor
        value={mediaDraft}
        onChange={setMediaDraft}
        disabled={!access.canCreateCourses}
        onPickUpload={facilityMode ? undefined : pickVideo}
        pendingUploadName={videoFile?.fileName || videoFile?.name || ""}
        onRemove={() => {
          setVideoFile(null);
          setVideoAssetId("");
          setMediaDraft(emptyLessonMediaDraft());
        }}
      />
      <VideoLibraryPicker
        selectedId={videoAssetId}
        disabled={!access.canCreateCourses}
        onSelect={(video) => {
          setVideoFile(null);
          setVideoAssetId(video?.id || "");
          setMediaDraft(
            video ? lessonMediaDraftFromLesson(video) : emptyLessonMediaDraft()
          );
        }}
      />

      {facilityMode ? (
        <Text style={styles.helpText} accessibilityRole="text">
          Facility document uploads are temporarily unavailable until secure file scanning
          is enabled. You can add protected images, audio, or a Video Library video now.
        </Text>
      ) : (
        <>
          <Text style={styles.label}>PDF Document</Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Upload lesson PDF"
            style={[styles.uploadBtn, !access.canCreateCourses && styles.disabled]}
            onPress={pickPDF}
            disabled={!access.canCreateCourses}
          >
            <Text style={styles.uploadBtnText}>
              {pdfFile ? `${pdfFile.name || "PDF Selected"}` : "Upload PDF"}
            </Text>
          </TouchableOpacity>
          <TextInput
            accessibilityLabel="Lesson PDF URL"
            style={styles.input}
            placeholderTextColor={palette.textMuted}
            placeholder="Or paste PDF URL"
            value={pdfUrl}
            onChangeText={setPdfUrl}
            editable={access.canCreateCourses}
          />
        </>
      )}

      <Text style={styles.label}>Audio (Optional)</Text>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Upload lesson audio"
        style={[styles.uploadBtn, !access.canCreateCourses && styles.disabled]}
        onPress={pickAudio}
        disabled={!access.canCreateCourses}
      >
        <Text style={styles.uploadBtnText}>
          {audioFile ? `${audioFile.name || "Audio Selected"}` : "Upload Audio"}
        </Text>
      </TouchableOpacity>

      <Text style={styles.label}>Images (Optional)</Text>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Add lesson images"
        style={[styles.uploadBtn, !access.canCreateCourses && styles.disabled]}
        onPress={pickImages}
        disabled={!access.canCreateCourses}
      >
        <Text style={styles.uploadBtnText}>Add Images</Text>
      </TouchableOpacity>
      {images.length > 0 && (
        <View style={styles.imageGrid}>
          {images.map((img, idx) => (
            <Image key={idx} source={{ uri: img.uri }} style={styles.imageThumb} />
          ))}
        </View>
      )}

      <GrowInterestPicker
        title="Lesson Grow Tags"
        helperText="Mark which growers will find this lesson relevant. Leave any tier empty."
        value={growInterestSelections}
        onChange={setGrowInterestSelections}
        defaultExpanded={false}
      />

      {!facilityMode ? (
        <PersonalFeedPlacement
          placement="middle"
          routeKey="personal_lesson_add"
          longContent
        />
      ) : null}

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Save lesson"
        style={[styles.btn, !access.canCreateCourses && styles.disabled]}
        onPress={submit}
        disabled={!access.canCreateCourses}
      >
        <Text style={styles.btnText}>Save Lesson</Text>
      </TouchableOpacity>

      <Text style={styles.helpText}>
        Selected files upload when you save. Video page links are normalized to their
        provider and retain an external fallback; pasted embed code is rejected.
      </Text>
      {!facilityMode ? (
        <PersonalFeedPlacement
          placement="bottom"
          routeKey="personal_lesson_add"
          longContent
        />
      ) : null}
    </ScreenContainer>
  );
}

export function createStyles(palette) {
  return StyleSheet.create({
    header: { color: palette.text, fontSize: 22, fontWeight: "700", marginBottom: 10 },
    label: { color: palette.text, marginTop: 10, marginBottom: 4, fontWeight: "600" },
    input: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderWidth: 1,
      color: palette.text,
      padding: 10,
      borderRadius: radius.card,
      marginBottom: 8
    },
    textBox: {
      height: 120,
      textAlignVertical: "top"
    },
    uploadBtn: {
      backgroundColor: palette.accent,
      padding: 12,
      borderRadius: radius.card,
      marginBottom: 8,
      alignItems: "center"
    },
    uploadBtnText: {
      color: palette.accentText,
      fontWeight: "600",
      fontSize: 15
    },
    btn: {
      marginTop: 16,
      backgroundColor: palette.accent,
      paddingVertical: 12,
      borderRadius: radius.card
    },
    btnText: {
      textAlign: "center",
      color: palette.accentText,
      fontWeight: "700",
      fontSize: 16
    },
    imageGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 12
    },
    imageThumb: {
      width: 80,
      height: 80,
      borderRadius: radius.card
    },
    helpText: {
      fontSize: 13,
      color: palette.textMuted,
      marginTop: 16,
      textAlign: "center",
      paddingHorizontal: 20
    },
    lockedCard: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      padding: 12,
      marginBottom: 10,
      backgroundColor: palette.surfaceMuted
    },
    lockedTitle: { color: palette.text, fontWeight: "700" },
    disabled: { opacity: 0.5 }
  });
}
