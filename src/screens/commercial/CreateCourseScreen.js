import React, { useEffect, useMemo, useState } from "react";
import { Link, useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import {
  Alert,
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

import ScreenContainer from "../../components/ScreenContainer";
import { createCourse } from "@/api/courses";
import CalendarDateField from "@/components/forms/CalendarDateField";
import {
  beginTwitchConnection,
  getTwitchConnection,
  validateTwitchConnection
} from "@/api/twitch";
import { uploadCourseMedia } from "@/api/uploads";
import PersonalFeedPlacement from "@/components/feed/PersonalFeedPlacement";
import GrowInterestPicker from "@/components/GrowInterestPicker";
import LessonMediaSourceEditor from "@/components/learning/LessonMediaSourceEditor";
import { useEntitlements } from "@/entitlements";
import { getLearningAccess } from "@/features/learning/learningAccess";
import {
  emptyLessonMediaDraft,
  prepareLessonMediaSubmission
} from "@/features/learning/lessonMedia";
import { radius } from "@/theme/theme";
import { useAppTheme } from "@/theme/appTheme";
import { persistImageUri, persistImageUris, resolveImageUri } from "@/utils/photoUploads";
import { buildEmptyTierSelection, flattenTierSelections } from "@/utils/growInterests";

function toPriceCents(input) {
  const n = Number(input);
  if (Number.isNaN(n) || n < 0) return null;
  return Math.round(n * 100);
}

function splitPlanLines(input) {
  return String(input || "")
    .split(/\r?\n|,/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function buildLessons(input, mediaSubmissions = []) {
  return splitPlanLines(input).map((title, index) => ({
    title,
    description: "",
    body: "",
    videoUrl: mediaSubmissions[index]?.videoUrl || "",
    externalVideoUrl: mediaSubmissions[index]?.externalVideoUrl || "",
    mediaSource: mediaSubmissions[index]?.mediaSource || undefined,
    uploadedVideoId: "",
    documentIds: [],
    imageIds: [],
    estimatedDurationMinutes: null,
    order: index + 1,
    status: "draft"
  }));
}

function buildQuizzes(input) {
  return splitPlanLines(input).map((line, index) => {
    const [question, ...options] = line
      .split("|")
      .map((value) => value.trim())
      .filter(Boolean);
    return {
      title: question,
      question,
      options,
      sortOrder: index + 1,
      status: "draft"
    };
  });
}

function buildDocuments(input) {
  return splitPlanLines(input).map((title) => ({
    title,
    description: "",
    fileName: title,
    fileType: "",
    fileSizeBytes: null,
    storageUrl: "",
    status: "planned"
  }));
}

function firstDocumentAsset(result) {
  if (!result || result.canceled) return null;
  if (Array.isArray(result.assets) && result.assets[0]) return result.assets[0];
  if (result.type === "success") return result;
  return null;
}

function fileNameOf(asset, fallback) {
  return (
    asset?.name ||
    asset?.fileName ||
    String(asset?.uri || "")
      .split("/")
      .pop() ||
    fallback
  );
}

function uploadedDocumentRecord(asset, uploaded) {
  const fileName = fileNameOf(asset, "course-document");
  return {
    title: fileName.replace(/\.[^.]+$/, "") || fileName,
    description: "",
    fileName,
    fileType: asset?.mimeType || asset?.type || "",
    fileSizeBytes: asset?.size || null,
    storageUrl: uploaded?.url || "",
    status: "uploaded"
  };
}

function uploadedMediaRecord(asset, uploaded, kind) {
  const fileName = fileNameOf(asset, `course-${kind}`);
  return {
    title: fileName.replace(/\.[^.]+$/, "") || fileName,
    fileName,
    fileType: asset?.mimeType || asset?.type || "",
    fileSizeBytes: asset?.size || null,
    storageUrl: uploaded?.url || "",
    type: kind,
    status: "uploaded"
  };
}

export default function CreateCourseScreen({
  navigation = null,
  showBackToCourses = true
}) {
  const router = useRouter();
  const entitlements = useEntitlements();
  const access = getLearningAccess(entitlements);
  const { palette } = useAppTheme();
  const backTarget =
    entitlements.mode === "commercial"
      ? "/home/commercial/courses"
      : entitlements.mode === "facility"
        ? "/courses"
        : "/home/personal/courses";
  const themeStyles = useMemo(
    () => ({
      title: [styles.title, { color: palette.heroText }],
      workflowCard: [
        styles.workflowCard,
        { backgroundColor: palette.surfaceMuted, borderColor: palette.border }
      ],
      workflowTitle: [styles.workflowTitle, { color: palette.link }],
      lockedCard: [
        styles.lockedCard,
        { backgroundColor: palette.surfaceMuted, borderColor: palette.border }
      ],
      lockedTitle: [styles.lockedTitle, { color: palette.text }],
      sectionCard: [
        styles.sectionCard,
        { backgroundColor: palette.surface, borderColor: palette.border }
      ],
      sectionTitle: [styles.sectionTitle, { color: palette.text }],
      label: [styles.label, { color: palette.textMuted, opacity: 1 }],
      helpText: [styles.helpText, { color: palette.textMuted }],
      input: [
        styles.input,
        {
          backgroundColor: palette.surface,
          borderColor: palette.border,
          color: palette.text
        }
      ],
      uploadButton: [styles.uploadButton, { borderColor: palette.accent }],
      uploadButtonText: [styles.uploadButtonText, { color: palette.link }],
      secondaryButton: [styles.secondaryButton, { borderColor: palette.accent }],
      secondaryButtonText: [styles.secondaryButtonText, { color: palette.link }],
      button: [styles.button, { backgroundColor: palette.accent }],
      buttonText: [styles.buttonText, { color: palette.accentText }],
      lessonPlanner: [
        styles.lessonPlanner,
        { backgroundColor: palette.surfaceMuted, borderColor: palette.border }
      ],
      lessonPlanCard: [
        styles.lessonPlanCard,
        { backgroundColor: palette.surface, borderColor: palette.border }
      ],
      integrationCard: [
        styles.integrationCard,
        { backgroundColor: palette.surfaceMuted, borderColor: palette.border }
      ],
      integrationMessage: [styles.integrationMessage, { color: palette.info }],
      integrationHelpText: [styles.integrationHelpText, { color: palette.textMuted }],
      readyText: [styles.readyText, { color: palette.success }],
      pricingModeButton: [
        styles.pricingModeButton,
        { backgroundColor: palette.surface, borderColor: palette.border }
      ],
      pricingModeButtonActive: [
        styles.pricingModeButtonActive,
        { backgroundColor: palette.accentSoft, borderColor: palette.accent }
      ],
      pricingModeText: [styles.pricingModeText, { color: palette.link }],
      pricePreview: [styles.pricePreview, { color: palette.link }],
      lessonNumber: [styles.lessonNumber, { color: palette.textMuted }],
      uploadRowButton: styles.uploadRowButton
    }),
    [palette]
  );
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [category, setCategory] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [growInterestSelections, setGrowInterestSelections] = useState(() =>
    buildEmptyTierSelection()
  );
  const selectedCropTypes = useMemo(
    () => growInterestSelections.crops || [],
    [growInterestSelections.crops]
  );
  const [curriculumPlan, setCurriculumPlan] = useState("");
  const [lessonMediaDrafts, setLessonMediaDrafts] = useState([]);
  const [lessonVideoFiles, setLessonVideoFiles] = useState([]);
  const [activeLessonMediaIndex, setActiveLessonMediaIndex] = useState(null);
  const [quizPlan, setQuizPlan] = useState("");
  const [documentPlan, setDocumentPlan] = useState("");
  const [documentFiles, setDocumentFiles] = useState([]);
  const [mediaPlan, setMediaPlan] = useState("");
  const [mediaFiles, setMediaFiles] = useState([]);
  const [mediaImages, setMediaImages] = useState([]);
  const [liveSessions, setLiveSessions] = useState([]);
  const [liveTitle, setLiveTitle] = useState("");
  const [liveStart, setLiveStart] = useState("");
  const [liveEnd, setLiveEnd] = useState("");
  const [liveTimezone, setLiveTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
  );
  const [twitchChannel, setTwitchChannel] = useState("");
  const [twitchConnection, setTwitchConnection] = useState(null);
  const [twitchBusy, setTwitchBusy] = useState(false);
  const [twitchMessage, setTwitchMessage] = useState("");
  const [linkedProductIds, setLinkedProductIds] = useState("");
  const [linkedGrowIds, setLinkedGrowIds] = useState("");
  const [linkedForumThreadIds, setLinkedForumThreadIds] = useState("");
  const [pricingMode, setPricingMode] = useState("free");
  const [price, setPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const priceCents = useMemo(() => toPriceCents(price.trim()), [price]);
  const plannedLessonTitles = useMemo(
    () => splitPlanLines(curriculumPlan),
    [curriculumPlan]
  );
  const canSubmit = access.canCreateCourses && title.trim().length >= 3 && !submitting;

  useEffect(() => {
    let active = true;
    setTwitchBusy(true);
    getTwitchConnection()
      .then((status) => {
        if (!active) return;
        const next = status || { configured: false };
        setTwitchConnection(next);
        if (next.connection?.status === "connected") {
          setTwitchChannel(
            (current) => current || next.connection?.broadcasterLogin || ""
          );
        }
      })
      .catch((error) => {
        if (active) {
          setTwitchMessage(
            String(error?.message || error || "Unable to load Twitch connection status.")
          );
        }
      })
      .finally(() => {
        if (active) setTwitchBusy(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function backToCourses() {
    if (navigation?.goBack) {
      navigation.goBack();
    } else if (router?.replace) {
      router.replace(backTarget);
    }
  }

  function lessonMediaDraftAt(index) {
    return lessonMediaDrafts[index] || emptyLessonMediaDraft("youtube");
  }

  function updateLessonMediaDraft(index, next) {
    setLessonMediaDrafts((current) => {
      const updated = [...current];
      updated[index] = next;
      return updated;
    });
  }

  function removeLessonVideo(index) {
    setLessonMediaDrafts((current) => {
      const updated = [...current];
      updated[index] = emptyLessonMediaDraft("youtube");
      return updated;
    });
    setLessonVideoFiles((current) => {
      const updated = [...current];
      updated[index] = null;
      return updated;
    });
  }

  async function pickLessonVideo(index) {
    if (!access.canCreateCourses || submitting) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["video/*"],
        multiple: false
      });
      const asset = firstDocumentAsset(result);
      if (!asset) return;
      setLessonVideoFiles((current) => {
        const updated = [...current];
        updated[index] = asset;
        return updated;
      });
      updateLessonMediaDraft(index, {
        ...lessonMediaDraftAt(index),
        sourceType: "growpath_upload",
        originalUrl: "",
        availabilityStatus: "unchecked",
        lastCheckedAt: ""
      });
    } catch (error) {
      Alert.alert(
        "Upload failed",
        String(error?.message || error || "Unable to choose the lesson video.")
      );
    }
  }

  async function refreshTwitchConnection(validate = true) {
    setTwitchBusy(true);
    setTwitchMessage("");
    try {
      if (validate && twitchConnection?.connection?.status === "connected") {
        await validateTwitchConnection();
      }
      const status = (await getTwitchConnection()) || { configured: false };
      setTwitchConnection(status);
      if (status.connection?.status === "connected") {
        setTwitchChannel(
          (current) => current || status.connection?.broadcasterLogin || ""
        );
        if (validate) setTwitchMessage("Twitch connection refreshed.");
      }
    } catch (error) {
      setTwitchMessage(
        String(error?.message || error || "Unable to load Twitch connection status.")
      );
    } finally {
      setTwitchBusy(false);
    }
  }

  async function connectTwitch() {
    setTwitchBusy(true);
    setTwitchMessage("");
    try {
      const result = await beginTwitchConnection();
      if (!result?.configured || !result?.authorizationUrl) {
        setTwitchMessage(result?.message || "Twitch OAuth is not configured.");
        return;
      }
      await Linking.openURL(result.authorizationUrl);
      setTwitchMessage(
        "Finish authorization in Twitch, return here, then choose Refresh Twitch."
      );
    } catch (error) {
      setTwitchMessage(
        String(error?.message || error || "Unable to start Twitch authorization.")
      );
    } finally {
      setTwitchBusy(false);
    }
  }

  async function pickCoverImage() {
    if (!access.canCreateCourses || submitting) return;
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Photo access required",
          "Allow photo library access to upload a course cover image."
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.85
      });
      const uri = result.canceled ? "" : result.assets?.[0]?.uri || "";
      if (uri) setCoverImageUrl(uri);
    } catch (e) {
      Alert.alert("Upload failed", String(e?.message || e || "Unable to pick image."));
    }
  }

  async function pickCourseDocuments() {
    if (!access.canCreateCourses || submitting) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "text/plain",
          "text/csv"
        ],
        multiple: true
      });
      const assets = Array.isArray(result?.assets)
        ? result.assets
        : firstDocumentAsset(result)
          ? [firstDocumentAsset(result)]
          : [];
      if (assets.length) setDocumentFiles((current) => [...current, ...assets]);
    } catch (e) {
      Alert.alert(
        "Upload failed",
        String(e?.message || e || "Unable to pick documents.")
      );
    }
  }

  async function pickCourseMedia() {
    if (!access.canCreateCourses || submitting) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["video/*", "audio/*", "application/pdf"],
        multiple: true
      });
      const assets = Array.isArray(result?.assets)
        ? result.assets
        : firstDocumentAsset(result)
          ? [firstDocumentAsset(result)]
          : [];
      if (assets.length) setMediaFiles((current) => [...current, ...assets]);
    } catch (e) {
      Alert.alert("Upload failed", String(e?.message || e || "Unable to pick media."));
    }
  }

  async function pickCourseImages() {
    if (!access.canCreateCourses || submitting) return;
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Photo access required",
          "Allow photo library access to upload course images."
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.85
      });
      if (!result.canceled && result.assets?.length) {
        setMediaImages((current) => [...current, ...result.assets]);
      }
    } catch (e) {
      Alert.alert("Upload failed", String(e?.message || e || "Unable to pick images."));
    }
  }

  async function submitCourse() {
    if (!canSubmit) return;
    if (!access.canCreateCourses) {
      Alert.alert("Unavailable", "Course creation is unavailable for this account.");
      return;
    }
    if (pricingMode === "paid" && (!price.trim() || !priceCents)) {
      Alert.alert("Invalid price", "Enter a paid course fee greater than $0.00.");
      return;
    }
    if (pricingMode === "paid" && !access.canSellPaidCourses) {
      Alert.alert(
        "Paid courses unavailable",
        "Paid course pricing should be available on every GrowPathAI plan. Refresh your account or contact support@growpathai.com if this continues."
      );
      return;
    }

    const lessonMediaPreviews = plannedLessonTitles.map((_lessonTitle, index) => {
      if (lessonVideoFiles[index]) return null;
      return prepareLessonMediaSubmission(
        lessonMediaDraftAt(index),
        lessonMediaDraftAt(index).originalUrl
      );
    });
    const invalidLessonMediaIndex = lessonMediaPreviews.findIndex(
      (preview) => preview?.errors.length
    );
    if (invalidLessonMediaIndex >= 0) {
      setActiveLessonMediaIndex(invalidLessonMediaIndex);
      Alert.alert(
        `Video source needs attention: ${plannedLessonTitles[invalidLessonMediaIndex]}`,
        lessonMediaPreviews[invalidLessonMediaIndex].errors.join(" ")
      );
      return;
    }

    setSubmitting(true);
    try {
      const lessonMediaSubmissions = await Promise.all(
        plannedLessonTitles.map(async (_lessonTitle, index) => {
          const draft = lessonMediaDraftAt(index);
          const videoFile = lessonVideoFiles[index];
          if (!videoFile) return lessonMediaPreviews[index];
          const uploadedVideo = await uploadCourseMedia(videoFile);
          return prepareLessonMediaSubmission(
            {
              ...draft,
              sourceType: "growpath_upload",
              availabilityStatus: "available",
              lastCheckedAt: new Date().toISOString(),
              allowEmbed: false
            },
            uploadedVideo?.url
          );
        })
      );
      const lessons = buildLessons(curriculumPlan, lessonMediaSubmissions);
      const quizzes = buildQuizzes(quizPlan);
      const uploadedDocuments = await Promise.all(
        documentFiles.map(async (asset) =>
          uploadedDocumentRecord(asset, await uploadCourseMedia(asset))
        )
      );
      const uploadedMediaFiles = await Promise.all(
        mediaFiles.map(async (asset) => {
          const type = String(asset?.mimeType || asset?.type || "").toLowerCase();
          const kind = type.startsWith("audio/")
            ? "audio"
            : type.startsWith("video/")
              ? "video"
              : "document";
          return uploadedMediaRecord(asset, await uploadCourseMedia(asset), kind);
        })
      );
      const persistedCourseImageUrls = await persistImageUris(
        mediaImages.map((asset) => asset.uri)
      );
      const uploadedCourseImages = mediaImages.map((asset, index) =>
        uploadedMediaRecord(asset, { url: persistedCourseImageUrls[index] }, "image")
      );
      const documents = [...buildDocuments(documentPlan), ...uploadedDocuments];
      const mediaAssets = [...uploadedMediaFiles, ...uploadedCourseImages].filter(
        (asset) => asset.storageUrl
      );
      const persistedCoverImageUrl = await persistImageUri(coverImageUrl.trim());
      const growInterestTags = flattenTierSelections(growInterestSelections);
      const course = await createCourse({
        title: title.trim(),
        summary: summary.trim(),
        description: description.trim(),
        coverImageUrl: persistedCoverImageUrl || "",
        category: category.trim(),
        difficulty: difficulty.trim(),
        cropType: selectedCropTypes[0] || "",
        growInterests: growInterestSelections,
        interestTags: growInterestTags,
        tags: growInterestTags,
        curriculumPlan: curriculumPlan.trim(),
        documentPlan: documentPlan.trim(),
        mediaPlan: mediaPlan.trim(),
        liveSessionPlan: liveSessions
          .map(
            (session) =>
              `${session.title} | ${session.scheduledStart} | ${session.meetingUrl}`
          )
          .join("\n"),
        lessons,
        quizzes,
        documents,
        mediaAssets,
        uploadedImageUrls: mediaAssets
          .filter((asset) => asset.type === "image")
          .map((asset) => asset.storageUrl),
        liveSessions,
        linkedProductIds: splitPlanLines(linkedProductIds),
        linkedGrowIds: splitPlanLines(linkedGrowIds),
        linkedForumThreadIds: splitPlanLines(linkedForumThreadIds),
        priceCents: pricingMode === "paid" ? priceCents : 0,
        price: pricingMode === "paid" ? (priceCents || 0) / 100 : 0,
        currency: "usd",
        access: pricingMode,
        status: "draft",
        isPublished: false,
        workspace: entitlements.mode || "personal",
        authoringPlan: {
          step: "draft",
          requiredSteps: [
            "basics",
            "curriculum",
            "documents_media",
            "live_sessions",
            "links",
            "pricing_access",
            "preview_publish"
          ],
          limits: {
            paidCourseLimit: access.maxPaidCourses,
            lessonLimit: access.maxLessonsPerCourse,
            storage: "plan_limit",
            selectedDocuments: documentFiles.length,
            selectedMedia:
              mediaFiles.length +
              mediaImages.length +
              lessonVideoFiles.filter(Boolean).length,
            videoStorage:
              mediaAssets.filter((asset) => asset.type === "video").length ||
              lessonVideoFiles.some(Boolean)
                ? "selected_for_upload"
                : "plan_limit",
            liveSessionsPerMonth: "plan_limit"
          }
        }
      });

      Alert.alert("Course created", "Your course draft has been created.");
      if (navigation?.replace) {
        navigation.replace("CourseDetail", { course, id: course?._id || course?.id });
      } else if (router?.replace) {
        const courseId = course?._id || course?.id;
        router.replace(
          courseId
            ? { pathname: backTarget, params: { courseId: String(courseId) } }
            : backTarget
        );
      } else {
        navigation.goBack();
      }
    } catch (e) {
      Alert.alert("Create failed", String(e?.message || e || "Unknown error"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScreenContainer scroll>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text accessibilityRole="header" aria-level={1} style={themeStyles.title}>
            Create Course
          </Text>
          {showBackToCourses ? (
            <TouchableOpacity
              onPress={backToCourses}
              accessibilityRole="button"
              accessibilityLabel="Back to Courses"
              style={themeStyles.secondaryButton}
            >
              <Text style={themeStyles.secondaryButtonText}>Back to Courses</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <PersonalFeedPlacement placement="top" routeKey="personal_course_create" />
        <View style={themeStyles.workflowCard}>
          <Text style={themeStyles.workflowTitle}>Course builder workflow</Text>
          <Text style={themeStyles.helpText}>
            1. Course basics 2. Curriculum / lessons 3. Documents / media 4. Live sessions
            5. Links 6. Pricing / access 7. Preview / publish
          </Text>
        </View>
        {!access.canCreateCourses ? (
          <View style={themeStyles.lockedCard}>
            <Text style={themeStyles.lockedTitle}>Course creation unavailable</Text>
            <Text style={themeStyles.helpText}>
              Sign in to an account with course access to create drafts.
            </Text>
          </View>
        ) : null}
        <View style={themeStyles.sectionCard}>
          <Text
            accessibilityRole="header"
            aria-level={2}
            style={themeStyles.sectionTitle}
          >
            1. Course basics
          </Text>
          <Text style={themeStyles.label}>Course title</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Enter a course title"
            editable={access.canCreateCourses && !submitting}
            style={themeStyles.input}
            accessibilityLabel="Course title"
          />
          <Text style={themeStyles.label}>Summary</Text>
          <TextInput
            value={summary}
            onChangeText={setSummary}
            placeholder="What learners will get from this course"
            multiline
            editable={access.canCreateCourses && !submitting}
            style={[themeStyles.input, styles.multiline]}
            accessibilityLabel="Course summary"
          />
          <Text style={themeStyles.label}>Description / outline</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Longer course description, outcomes, and prerequisites"
            multiline
            editable={access.canCreateCourses && !submitting}
            style={[themeStyles.input, styles.multiline]}
            accessibilityLabel="Course description"
          />
          <Text style={themeStyles.label}>Cover image URL</Text>
          <TextInput
            value={coverImageUrl}
            onChangeText={setCoverImageUrl}
            placeholder="Paste image URL or upload from device"
            editable={access.canCreateCourses && !submitting}
            style={themeStyles.input}
            accessibilityLabel="Course cover image URL"
          />
          <TouchableOpacity
            onPress={pickCoverImage}
            disabled={!access.canCreateCourses || submitting}
            accessibilityRole="button"
            accessibilityLabel="Upload course cover image"
            style={[
              themeStyles.uploadButton,
              (!access.canCreateCourses || submitting) && styles.buttonDisabled
            ]}
          >
            <Text style={themeStyles.uploadButtonText}>
              {coverImageUrl ? "Change Cover Image" : "Upload Cover Image"}
            </Text>
          </TouchableOpacity>
          {coverImageUrl ? (
            <Image
              source={{ uri: resolveImageUri(coverImageUrl) }}
              style={styles.coverPreview}
              resizeMode="cover"
              accessibilityLabel="Course cover image preview"
            />
          ) : null}
          <Text style={themeStyles.label}>Category</Text>
          <TextInput
            value={category}
            onChangeText={setCategory}
            placeholder="Plant health, living soil, lighting, business, etc."
            editable={access.canCreateCourses && !submitting}
            style={themeStyles.input}
            accessibilityLabel="Course category"
          />
          <Text style={themeStyles.label}>Difficulty</Text>
          <TextInput
            value={difficulty}
            onChangeText={setDifficulty}
            placeholder="Beginner, intermediate, advanced, or pro"
            editable={access.canCreateCourses && !submitting}
            style={themeStyles.input}
            accessibilityLabel="Course difficulty"
          />
          <GrowInterestPicker
            title="Course grow interests"
            helperText="Select crop type under What You Grow, then choose the matching environment and methods. These selections control recommendations and learning-path visibility."
            value={growInterestSelections}
            onChange={setGrowInterestSelections}
            defaultExpanded={false}
          />
          <Text
            style={themeStyles.helpText}
            accessibilityLabel="Selected course crop types"
          >
            Crop type:{" "}
            {selectedCropTypes.length
              ? selectedCropTypes.join(", ")
              : "Select from What You Grow"}
          </Text>
        </View>

        <View style={themeStyles.sectionCard}>
          <Text
            accessibilityRole="header"
            aria-level={2}
            style={themeStyles.sectionTitle}
          >
            2. Curriculum / lessons
          </Text>
          <Text style={themeStyles.helpText}>
            Put each lesson, assignment, checklist, or section on its own line.
          </Text>
          <TextInput
            value={curriculumPlan}
            onChangeText={setCurriculumPlan}
            placeholder={"Lesson 1: Soil basics\nLesson 2: Amendment timing"}
            multiline
            editable={access.canCreateCourses && !submitting}
            style={[themeStyles.input, styles.multiline]}
            accessibilityLabel="Course curriculum lessons"
          />
          {plannedLessonTitles.length ? (
            <View style={themeStyles.lessonPlanner}>
              <View>
                <Text style={themeStyles.workflowTitle}>Lesson media plan</Text>
                <Text style={themeStyles.helpText}>
                  Add an optional provider-aware video to any planned lesson now. You can
                  also finish or replace it later from Add/Edit Lesson.
                </Text>
              </View>
              {plannedLessonTitles.map((lessonTitle, index) => {
                const draft = lessonMediaDraftAt(index);
                const prepared = prepareLessonMediaSubmission(draft);
                const providerLabel = lessonVideoFiles[index]
                  ? "GrowPath upload selected"
                  : prepared.mediaSource?.providerLabel || "No video selected";
                return (
                  <View
                    key={`${lessonTitle}-${index}`}
                    style={themeStyles.lessonPlanCard}
                  >
                    <View style={styles.lessonPlanCopy}>
                      <Text style={themeStyles.lessonNumber}>Lesson {index + 1}</Text>
                      <Text style={themeStyles.workflowTitle}>{lessonTitle}</Text>
                      <Text style={themeStyles.helpText}>{providerLabel}</Text>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Edit video source for ${lessonTitle}`}
                      disabled={!access.canCreateCourses || submitting}
                      onPress={() =>
                        setActiveLessonMediaIndex((current) =>
                          current === index ? null : index
                        )
                      }
                      style={themeStyles.secondaryButton}
                    >
                      <Text style={themeStyles.secondaryButtonText}>
                        {activeLessonMediaIndex === index
                          ? "Close Video Setup"
                          : "Add / Review Video"}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
              {activeLessonMediaIndex !== null &&
              plannedLessonTitles[activeLessonMediaIndex] ? (
                <LessonMediaSourceEditor
                  value={lessonMediaDraftAt(activeLessonMediaIndex)}
                  onChange={(next) =>
                    updateLessonMediaDraft(activeLessonMediaIndex, next)
                  }
                  disabled={!access.canCreateCourses || submitting}
                  onPickUpload={() => pickLessonVideo(activeLessonMediaIndex)}
                  pendingUploadName={
                    lessonVideoFiles[activeLessonMediaIndex]
                      ? fileNameOf(
                          lessonVideoFiles[activeLessonMediaIndex],
                          "lesson-video"
                        )
                      : ""
                  }
                  onRemove={() => removeLessonVideo(activeLessonMediaIndex)}
                />
              ) : null}
            </View>
          ) : (
            <Text style={themeStyles.helpText}>
              Add lesson titles above to configure YouTube, Rumble, Vimeo, GrowPath
              uploads, or another video URL.
            </Text>
          )}
          <Text style={themeStyles.label}>Quiz outline</Text>
          <Text style={themeStyles.helpText}>
            Put one question per line. Add answer choices after vertical bars.
          </Text>
          <TextInput
            value={quizPlan}
            onChangeText={setQuizPlan}
            placeholder={"What controls nutrient availability? | pH | Pot color"}
            multiline
            editable={access.canCreateCourses && !submitting}
            style={[themeStyles.input, styles.multiline]}
            accessibilityLabel="Course quiz outline"
          />
        </View>

        <View style={themeStyles.sectionCard}>
          <Text
            accessibilityRole="header"
            aria-level={2}
            style={themeStyles.sectionTitle}
          >
            3. Documents / media
          </Text>
          <TextInput
            value={documentPlan}
            onChangeText={setDocumentPlan}
            placeholder="PDFs, worksheets, checklists, SOPs, or handouts"
            multiline
            editable={access.canCreateCourses && !submitting}
            style={[themeStyles.input, styles.multiline]}
            accessibilityLabel="Course documents"
          />
          <TouchableOpacity
            onPress={pickCourseDocuments}
            disabled={!access.canCreateCourses || submitting}
            accessibilityRole="button"
            accessibilityLabel="Upload course documents"
            style={[
              themeStyles.uploadButton,
              (!access.canCreateCourses || submitting) && styles.buttonDisabled
            ]}
          >
            <Text style={themeStyles.uploadButtonText}>
              {documentFiles.length
                ? `${documentFiles.length} Document${documentFiles.length === 1 ? "" : "s"} Selected`
                : "Upload Documents"}
            </Text>
          </TouchableOpacity>
          <TextInput
            value={mediaPlan}
            onChangeText={setMediaPlan}
            placeholder="Video topics, replay files, image sets, estimated storage needs"
            multiline
            editable={access.canCreateCourses && !submitting}
            style={[themeStyles.input, styles.multiline]}
            accessibilityLabel="Course media plan"
          />
          <View style={styles.uploadRow}>
            <TouchableOpacity
              onPress={pickCourseMedia}
              disabled={!access.canCreateCourses || submitting}
              accessibilityRole="button"
              accessibilityLabel="Upload course media files"
              style={[
                themeStyles.uploadButton,
                styles.uploadRowButton,
                (!access.canCreateCourses || submitting) && styles.buttonDisabled
              ]}
            >
              <Text style={themeStyles.uploadButtonText}>
                {mediaFiles.length
                  ? `${mediaFiles.length} Media File${mediaFiles.length === 1 ? "" : "s"}`
                  : "Upload Video / Audio"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={pickCourseImages}
              disabled={!access.canCreateCourses || submitting}
              accessibilityRole="button"
              accessibilityLabel="Upload course image set"
              style={[
                themeStyles.uploadButton,
                styles.uploadRowButton,
                (!access.canCreateCourses || submitting) && styles.buttonDisabled
              ]}
            >
              <Text style={themeStyles.uploadButtonText}>
                {mediaImages.length
                  ? `${mediaImages.length} Image${mediaImages.length === 1 ? "" : "s"}`
                  : "Upload Images"}
              </Text>
            </TouchableOpacity>
          </View>
          {mediaImages.length ? (
            <View style={styles.imageGrid}>
              {mediaImages.map((asset, index) => (
                <Image
                  key={`${asset.uri}-${index}`}
                  source={{ uri: asset.uri }}
                  style={styles.imageThumb}
                  resizeMode="cover"
                  accessibilityLabel={`Course media image ${index + 1}`}
                />
              ))}
            </View>
          ) : null}
        </View>

        <View style={themeStyles.sectionCard}>
          <Text
            accessibilityRole="header"
            aria-level={2}
            style={themeStyles.sectionTitle}
          >
            4. Live sessions
          </Text>
          <Text style={themeStyles.helpText}>
            Schedule a real Twitch live. The course event appears in GrowPath Schedule;
            learners can RSVP, receive notification context, and create a dated task
            reminder.
          </Text>
          <View style={themeStyles.integrationCard}>
            <Text style={themeStyles.workflowTitle}>Twitch, calendar, and reminders</Text>
            <Text style={themeStyles.integrationHelpText}>
              {!twitchConnection
                ? "Checking Twitch connection..."
                : !twitchConnection.configured
                  ? "Twitch OAuth is not configured on this deployment. You can keep a draft, but do not describe the channel as connected."
                  : twitchConnection.connection?.status === "connected"
                    ? `Connected as ${
                        twitchConnection.connection.broadcasterName ||
                        twitchConnection.connection.broadcasterLogin
                      }. EventSub ${
                        twitchConnection.connection.eventSubStatus || "not connected"
                      }.`
                    : `Twitch ${
                        twitchConnection.connection?.status || "is not connected"
                      }.`}
            </Text>
            {twitchMessage ? (
              <Text style={themeStyles.integrationMessage}>{twitchMessage}</Text>
            ) : null}
            <View style={styles.linkRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Connect Twitch for course lives"
                disabled={twitchBusy || twitchConnection?.configured === false}
                onPress={connectTwitch}
                style={[
                  themeStyles.uploadButton,
                  (twitchBusy || twitchConnection?.configured === false) &&
                    styles.buttonDisabled
                ]}
              >
                <Text style={themeStyles.uploadButtonText}>
                  {twitchBusy
                    ? "Checking Twitch..."
                    : twitchConnection?.connection?.status === "connected"
                      ? "Reconnect Twitch"
                      : "Connect Twitch"}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Refresh Twitch for course lives"
                disabled={twitchBusy}
                onPress={() => refreshTwitchConnection(true)}
                style={[themeStyles.secondaryButton, twitchBusy && styles.buttonDisabled]}
              >
                <Text style={themeStyles.secondaryButtonText}>Refresh Twitch</Text>
              </Pressable>
              <Link href="/home/schedule" asChild>
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel="Open shared GrowPath Schedule"
                  style={themeStyles.secondaryButton}
                >
                  <Text style={themeStyles.secondaryButtonText}>Open Schedule</Text>
                </Pressable>
              </Link>
              <Link href="/home/notifications" asChild>
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel="Open GrowPath Notification Center"
                  style={themeStyles.secondaryButton}
                >
                  <Text style={themeStyles.secondaryButtonText}>Notifications</Text>
                </Pressable>
              </Link>
              {entitlements.mode === "commercial" ? (
                <Link href="/home/commercial/lives" asChild>
                  <Pressable
                    accessibilityRole="link"
                    accessibilityLabel="Open advanced commercial live setup"
                    style={themeStyles.secondaryButton}
                  >
                    <Text style={themeStyles.secondaryButtonText}>
                      Advanced Live Setup
                    </Text>
                  </Pressable>
                </Link>
              ) : null}
            </View>
          </View>
          <Text style={themeStyles.label}>Session title</Text>
          <TextInput
            value={liveTitle}
            onChangeText={setLiveTitle}
            placeholder="Live soil-building Q&A"
            editable={access.canCreateCourses && !submitting}
            style={themeStyles.input}
            accessibilityLabel="Live session title"
          />
          <CalendarDateField
            label="Start date and time"
            value={liveStart}
            onChange={setLiveStart}
            placeholder="Choose start date and time"
            mode="datetime"
            disabled={!access.canCreateCourses || submitting}
            accessibilityLabel="Live session start"
          />
          <CalendarDateField
            label="End date and time"
            value={liveEnd}
            onChange={setLiveEnd}
            placeholder="Choose end date and time"
            mode="datetime"
            disabled={!access.canCreateCourses || submitting}
            accessibilityLabel="Live session end"
          />
          <Text style={themeStyles.label}>Timezone</Text>
          <TextInput
            value={liveTimezone}
            onChangeText={setLiveTimezone}
            placeholder="America/New_York"
            editable={access.canCreateCourses && !submitting}
            style={themeStyles.input}
            accessibilityLabel="Live session timezone"
          />
          <Text style={themeStyles.label}>Twitch channel</Text>
          <TextInput
            value={twitchChannel}
            onChangeText={setTwitchChannel}
            placeholder="Channel name or twitch.tv/channel URL"
            autoCapitalize="none"
            editable={access.canCreateCourses && !submitting}
            style={themeStyles.input}
            accessibilityLabel="Live session Twitch channel"
          />
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Add scheduled Twitch session"
            disabled={!liveTitle.trim() || !liveStart.trim() || !twitchChannel.trim()}
            onPress={() => {
              const channel = twitchChannel
                .trim()
                .replace(/^https?:\/\/(?:www\.)?twitch\.tv\//i, "")
                .split(/[/?#]/)[0];
              if (!channel) return;
              setLiveSessions((current) => [
                ...current,
                {
                  id: `live-${Date.now()}`,
                  title: liveTitle.trim(),
                  description: `Watch live on Twitch: https://www.twitch.tv/${channel}`,
                  scheduledStart: liveStart.trim(),
                  scheduledEnd: liveEnd.trim() || null,
                  timezone: liveTimezone.trim() || "UTC",
                  platform: "twitch",
                  twitchChannel: channel,
                  twitchChannelId: twitchConnection?.connection?.broadcasterId || "",
                  twitchConnectionStatus:
                    twitchConnection?.connection?.status || "manual",
                  eventSubStatus:
                    twitchConnection?.connection?.eventSubStatus || "not_connected",
                  meetingUrl: `https://www.twitch.tv/${channel}`,
                  watchUrl: `https://www.twitch.tv/${channel}`,
                  replayVideoId: "",
                  status: "scheduled",
                  createLearnerTask: true,
                  calendarType: "course_live_session",
                  notificationPlan: [
                    "new_live_scheduled",
                    "24h_before",
                    "1h_before",
                    "15m_before",
                    "live_now",
                    "replay_available"
                  ],
                  reminderPlan: {
                    label: "1 hour before",
                    channels: ["in_app"],
                    notificationCenter: true
                  }
                }
              ]);
              setLiveTitle("");
              setLiveStart("");
              setLiveEnd("");
            }}
            style={[
              themeStyles.uploadButton,
              (!liveTitle.trim() || !liveStart.trim() || !twitchChannel.trim()) &&
                styles.buttonDisabled
            ]}
          >
            <Text style={themeStyles.uploadButtonText}>Add Scheduled Live</Text>
          </TouchableOpacity>
          {liveSessions.map((session, index) => (
            <View key={session.id} style={styles.workflowCard}>
              <Text style={themeStyles.workflowTitle}>{session.title}</Text>
              <Text style={themeStyles.helpText}>
                {session.scheduledStart} · {session.timezone}
              </Text>
              <Text style={themeStyles.helpText}>{session.meetingUrl}</Text>
              <Text style={themeStyles.readyText}>
                Shared calendar · RSVP · Notification Center · 1-hour task reminder
              </Text>
              <Text style={themeStyles.helpText}>
                Twitch {session.twitchConnectionStatus} · EventSub{" "}
                {session.eventSubStatus}
              </Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`Remove live session ${session.title}`}
                onPress={() =>
                  setLiveSessions((current) => current.filter((_, row) => row !== index))
                }
              >
                <Text style={themeStyles.secondaryButtonText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={themeStyles.sectionCard}>
          <Text
            accessibilityRole="header"
            aria-level={2}
            style={themeStyles.sectionTitle}
          >
            5. Links
          </Text>
          <TextInput
            value={linkedProductIds}
            onChangeText={setLinkedProductIds}
            placeholder="Linked product IDs, one per line"
            multiline
            editable={access.canCreateCourses && !submitting}
            style={themeStyles.input}
            accessibilityLabel="Linked product ids"
          />
          <TextInput
            value={linkedGrowIds}
            onChangeText={setLinkedGrowIds}
            placeholder="Linked grow IDs, one per line"
            multiline
            editable={access.canCreateCourses && !submitting}
            style={themeStyles.input}
            accessibilityLabel="Linked grow ids"
          />
          <TextInput
            value={linkedForumThreadIds}
            onChangeText={setLinkedForumThreadIds}
            placeholder="Linked forum thread IDs, one per line"
            multiline
            editable={access.canCreateCourses && !submitting}
            style={themeStyles.input}
            accessibilityLabel="Linked forum thread ids"
          />
        </View>

        <View style={themeStyles.sectionCard}>
          <Text
            accessibilityRole="header"
            aria-level={2}
            style={themeStyles.sectionTitle}
          >
            6. Pricing / access
          </Text>
          {!access.canSellPaidCourses ? (
            <Text style={themeStyles.helpText}>
              Paid pricing should be available on every plan. Refresh the account or
              contact support@growpathai.com if it remains unavailable.
            </Text>
          ) : null}
          <View
            style={styles.pricingModeRow}
            accessibilityRole="radiogroup"
            accessibilityLabel="Course pricing"
          >
            <TouchableOpacity
              onPress={() => {
                setPricingMode("free");
                setPrice("");
              }}
              disabled={!access.canCreateCourses || submitting}
              accessibilityRole="radio"
              aria-checked={pricingMode === "free"}
              accessibilityState={{ checked: pricingMode === "free" }}
              accessibilityLabel="Make course free"
              style={[
                themeStyles.pricingModeButton,
                pricingMode === "free" && themeStyles.pricingModeButtonActive
              ]}
            >
              <Text style={themeStyles.pricingModeText}>Free</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setPricingMode("paid")}
              disabled={
                !access.canCreateCourses || !access.canSellPaidCourses || submitting
              }
              accessibilityRole="radio"
              aria-checked={pricingMode === "paid"}
              accessibilityState={{ checked: pricingMode === "paid" }}
              accessibilityLabel="Set a paid course fee"
              style={[
                themeStyles.pricingModeButton,
                pricingMode === "paid" && themeStyles.pricingModeButtonActive,
                (!access.canSellPaidCourses || submitting) && styles.buttonDisabled
              ]}
            >
              <Text style={themeStyles.pricingModeText}>Paid</Text>
            </TouchableOpacity>
          </View>
          {pricingMode === "paid" ? (
            <>
              <Text style={themeStyles.label}>Course fee (USD)</Text>
              <TextInput
                value={price}
                onChangeText={setPrice}
                keyboardType="decimal-pad"
                placeholder="19.00"
                editable={
                  access.canCreateCourses && access.canSellPaidCourses && !submitting
                }
                style={themeStyles.input}
                accessibilityLabel="Course price USD"
              />
              <Text style={themeStyles.pricePreview}>
                Learners will see:{" "}
                {priceCents ? `$${(priceCents / 100).toFixed(2)}` : "Enter a fee"}
              </Text>
            </>
          ) : (
            <Text style={themeStyles.pricePreview}>Learners will see: Free</Text>
          )}
          <Text style={themeStyles.helpText}>
            Paid course limit:{" "}
            {access.maxPaidCourses === null ? "unlimited" : access.maxPaidCourses}
          </Text>
          <Text style={themeStyles.helpText}>Lessons: 0 / plan limit</Text>
          <Text style={themeStyles.helpText}>Storage used: 0 MB / plan limit</Text>
          <Text style={themeStyles.helpText}>
            Live sessions this month: 0 / plan limit
          </Text>
          <Text style={themeStyles.helpText}>
            Uploaded video storage: 0 GB / plan limit
          </Text>
        </View>

        <View style={themeStyles.sectionCard}>
          <Text
            accessibilityRole="header"
            aria-level={2}
            style={themeStyles.sectionTitle}
          >
            7. Preview / publish
          </Text>
          <Text style={themeStyles.helpText}>
            This saves a draft. Use course detail to review, add uploaded assets, preview,
            and publish when the course is ready.
          </Text>
        </View>
        <PersonalFeedPlacement placement="bottom" routeKey="personal_course_create" />

        <TouchableOpacity
          onPress={submitCourse}
          disabled={!canSubmit}
          accessibilityRole="button"
          accessibilityLabel="Create course draft"
          style={[themeStyles.button, !canSubmit && styles.buttonDisabled]}
        >
          <Text style={themeStyles.buttonText}>
            {submitting ? "Creating..." : "Create Draft"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 10 },
  title: { fontSize: 24, fontWeight: "800", marginBottom: 6 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  label: { fontSize: 13, opacity: 0.8 },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: radius.card,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  multiline: { minHeight: 96, textAlignVertical: "top" },
  button: {
    marginTop: 8,
    backgroundColor: "#15803d",
    borderRadius: radius.card,
    justifyContent: "center",
    minHeight: 44,
    paddingVertical: 12,
    alignItems: "center"
  },
  buttonDisabled: { opacity: 0.55 },
  buttonText: { color: "#fff", fontWeight: "800" },
  uploadButton: {
    borderWidth: 1,
    borderColor: "#15803d",
    borderRadius: radius.card,
    justifyContent: "center",
    minHeight: 44,
    paddingVertical: 10,
    alignItems: "center"
  },
  uploadButtonText: { color: "#166534", fontWeight: "800" },
  uploadRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  uploadRowButton: { flex: 1 },
  coverPreview: {
    width: "100%",
    minHeight: 160,
    borderRadius: radius.card,
    backgroundColor: "#f1f5f9"
  },
  imageGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  imageThumb: {
    width: 72,
    height: 72,
    borderRadius: radius.card,
    backgroundColor: "#f1f5f9"
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#15803d",
    borderRadius: radius.card,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  secondaryButtonText: { color: "#166534", fontWeight: "800" },
  lockedCard: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: radius.card,
    padding: 12,
    backgroundColor: "#f8fafc"
  },
  lockedTitle: { fontWeight: "800" },
  workflowCard: {
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: radius.card,
    padding: 12,
    backgroundColor: "#f0fdf4"
  },
  workflowTitle: { color: "#166534", fontWeight: "900" },
  lessonPlanner: {
    backgroundColor: "#f8fafc",
    borderColor: "#cbd5e1",
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 8,
    padding: 12
  },
  lessonPlanCard: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: radius.card,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "space-between",
    padding: 10
  },
  lessonPlanCopy: { flex: 1, minWidth: 190 },
  lessonNumber: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  integrationCard: {
    backgroundColor: "#eff6ff",
    borderColor: "#bfdbfe",
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 8,
    padding: 12
  },
  integrationMessage: {
    color: "#1e3a8a",
    fontSize: 12,
    fontWeight: "800"
  },
  integrationHelpText: { color: "#475569" },
  linkRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  readyText: { color: "#166534", fontSize: 12, fontWeight: "800" },
  pricingModeRow: { flexDirection: "row", gap: 8 },
  pricingModeButton: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: radius.card,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: "#ffffff"
  },
  pricingModeButtonActive: {
    borderColor: "#15803d",
    backgroundColor: "#dcfce7"
  },
  pricingModeText: { color: "#166534", fontWeight: "900" },
  pricePreview: { color: "#166534", fontWeight: "800" },
  sectionCard: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: radius.card,
    padding: 12,
    gap: 8,
    backgroundColor: "#ffffff"
  },
  sectionTitle: { color: "#0f172a", fontSize: 16, fontWeight: "900" },
  helpText: { color: "#64748b", fontSize: 12 }
});
