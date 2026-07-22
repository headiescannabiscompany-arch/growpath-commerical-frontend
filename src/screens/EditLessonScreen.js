import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity } from "react-native";
import * as ImagePicker from "expo-image-picker";
import ScreenContainer from "../components/ScreenContainer";
import GrowInterestPicker from "../components/GrowInterestPicker";
import LessonMediaSourceEditor from "@/components/learning/LessonMediaSourceEditor";
import { updateLesson } from "../api/courses";
import { uploadCourseMedia } from "@/api/uploads";
import PersonalFeedPlacement from "@/components/feed/PersonalFeedPlacement";
import { useEntitlements } from "@/entitlements";
import { getLearningAccess } from "@/features/learning/learningAccess";
import { radius } from "../theme/theme";
import {
  emptyLessonMediaDraft,
  lessonMediaDraftFromLesson,
  prepareLessonMediaSubmission
} from "@/features/learning/lessonMedia";
import {
  buildEmptyTierSelection,
  flattenTierSelections,
  groupTagsByTier
} from "../utils/growInterests";

export default function EditLessonScreen({ route, navigation }) {
  const entitlements = useEntitlements();
  const access = getLearningAccess(entitlements);
  const { lessonId } = route.params;

  const [lesson, setLesson] = useState(null);
  const [title, setTitle] = useState("");
  const [order, setOrder] = useState("");
  const [content, setContent] = useState("");
  const [mediaDraft, setMediaDraft] = useState(() => emptyLessonMediaDraft());
  const [videoFile, setVideoFile] = useState(null);
  const [pdfUrl, setPdfUrl] = useState("");
  const [growInterestSelections, setGrowInterestSelections] = useState(() =>
    buildEmptyTierSelection()
  );

  useEffect(() => {
    if (route.params?.lesson) {
      const l = route.params.lesson;
      setLesson(l);
      setTitle(l.title);
      setOrder(String(l.order || 1));
      setContent(l.content || "");
      setMediaDraft(lessonMediaDraftFromLesson(l));
      setPdfUrl(l.pdfUrl || "");
      setGrowInterestSelections(groupTagsByTier(l.growTags || []));
    } else {
      Alert.alert("Missing lesson data");
      navigation.goBack();
    }
  }, []);

  async function pickVideo() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        quality: 1
      });
      if (!result.canceled && result.assets[0]) {
        setVideoFile(result.assets[0]);
        setMediaDraft((current) => ({
          ...current,
          sourceType: "growpath_upload",
          originalUrl: "",
          availabilityStatus: "unchecked",
          lastCheckedAt: "",
          allowEmbed: false
        }));
      }
    } catch (_err) {
      Alert.alert("Error", "Failed to pick video");
    }
  }

  async function submit() {
    if (!access.canCreateCourses) {
      return Alert.alert("Unavailable", "Editing lessons requires COURSES_CREATE.");
    }
    const previewMedia = videoFile
      ? null
      : prepareLessonMediaSubmission(mediaDraft, mediaDraft.originalUrl);
    if (previewMedia?.errors.length) {
      return Alert.alert("Video source needs attention", previewMedia.errors.join(" "));
    }
    const uploadedVideo = videoFile ? await uploadCourseMedia(videoFile) : null;
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
    await updateLesson(lessonId, {
      title,
      order: order ? Number(order) : 1,
      content,
      videoUrl: preparedMedia?.videoUrl || "",
      externalVideoUrl: preparedMedia?.externalVideoUrl || "",
      mediaSource: preparedMedia?.mediaSource || null,
      pdfUrl,
      growTags: flattenTierSelections(growInterestSelections)
    });

    navigation.goBack();
  }

  if (!lesson) {
    return (
      <ScreenContainer scroll>
        <PersonalFeedPlacement placement="top" routeKey="personal_lesson_edit" />
        <Text>Loading...</Text>
        <PersonalFeedPlacement placement="bottom" routeKey="personal_lesson_edit" />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll>
      <Text style={styles.header}>Edit Lesson</Text>
      <PersonalFeedPlacement
        placement="top"
        routeKey="personal_lesson_edit"
        longContent
      />
      {!access.canCreateCourses ? (
        <Text style={styles.helpText}>This account does not have COURSES_CREATE.</Text>
      ) : null}
      <Text style={styles.helpText}>Course storage: 0 MB / plan limit</Text>
      <Text style={styles.helpText}>Uploaded video storage: 0 GB / plan limit</Text>
      <Text style={styles.helpText}>Live sessions this month: 0 / plan limit</Text>

      <TextInput
        style={styles.input}
        placeholder="Title"
        value={title}
        onChangeText={setTitle}
        editable={access.canCreateCourses}
      />

      <TextInput
        style={styles.input}
        placeholder="Order"
        value={order}
        onChangeText={setOrder}
        keyboardType="numeric"
        editable={access.canCreateCourses}
      />

      <Text style={styles.label}>Text Content</Text>
      <TextInput
        style={[styles.input, styles.textBox]}
        value={content}
        onChangeText={setContent}
        multiline
        editable={access.canCreateCourses}
      />

      <LessonMediaSourceEditor
        value={mediaDraft}
        onChange={setMediaDraft}
        disabled={!access.canCreateCourses}
        onPickUpload={pickVideo}
        pendingUploadName={videoFile?.fileName || videoFile?.name || ""}
        onRemove={() => {
          setVideoFile(null);
          setMediaDraft(emptyLessonMediaDraft());
        }}
      />

      <Text style={styles.label}>PDF URL</Text>
      <TextInput
        style={styles.input}
        value={pdfUrl}
        onChangeText={setPdfUrl}
        editable={access.canCreateCourses}
      />

      <GrowInterestPicker
        title="Lesson Grow Tags"
        helperText="Describe who this lesson applies to. Leave any tier empty."
        value={growInterestSelections}
        onChange={setGrowInterestSelections}
        defaultExpanded
      />

      <PersonalFeedPlacement
        placement="middle"
        routeKey="personal_lesson_edit"
        longContent
      />

      <TouchableOpacity
        style={[styles.btn, !access.canCreateCourses && styles.disabled]}
        onPress={submit}
        disabled={!access.canCreateCourses}
      >
        <Text style={styles.btnText}>Save Changes</Text>
      </TouchableOpacity>
      <PersonalFeedPlacement
        placement="bottom"
        routeKey="personal_lesson_edit"
        longContent
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { fontSize: 22, fontWeight: "700", marginBottom: 10 },
  label: { marginTop: 10, marginBottom: 4, fontWeight: "600" },
  input: {
    backgroundColor: "#eee",
    padding: 10,
    borderRadius: radius.card,
    marginBottom: 8
  },
  textBox: {
    height: 120,
    textAlignVertical: "top"
  },
  btn: {
    marginTop: 16,
    backgroundColor: "#2ecc71",
    paddingVertical: 12,
    borderRadius: radius.card
  },
  btnText: {
    textAlign: "center",
    color: "white",
    fontWeight: "700",
    fontSize: 16
  },
  helpText: { color: "#64748b", fontSize: 12, marginBottom: 8 },
  disabled: { opacity: 0.5 }
});
