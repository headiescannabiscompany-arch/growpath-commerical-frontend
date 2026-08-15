import { Link, useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import {
  addCommercialCourseLesson,
  archiveCommercialCourse,
  CommercialCourse,
  deleteCommercialCourseLesson,
  fetchCommercialCourse,
  fetchProductLines,
  publishCommercialCourse,
  ProductLine,
  unpublishCommercialCourse,
  updateCommercialCourse,
  updateCommercialCourseLesson
} from "@/api/commercialWorkflows";
import { uploadCourseMedia } from "@/api/uploads";
import { InlineError } from "@/components/InlineError";
import LessonMediaCard from "@/components/learning/LessonMediaCard";
import LessonMediaSourceEditor from "@/components/learning/LessonMediaSourceEditor";
import VideoLibraryPicker from "@/components/videos/VideoLibraryPicker";
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
import {
  emptyLessonMediaDraft,
  lessonMediaDraftFromLesson,
  lessonMediaPublishIssues,
  prepareLessonMediaSubmission
} from "@/features/learning/lessonMedia";
import { type ThemePalette, useAppTheme } from "@/theme/appTheme";
import { radius } from "@/theme/theme";
import { persistImageUri, resolveImageUri } from "@/utils/photoUploads";
import { flattenTierSelections } from "@/utils/growInterests";

function cleanId(value: unknown) {
  return String(Array.isArray(value) ? value[0] : value || "").trim();
}

function splitIds(value: string) {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function courseGrowInterests(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }
  if (value && typeof value === "object") {
    return flattenTierSelections(value as Record<string, string[]>);
  }
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function productLineId(line: ProductLine) {
  return String(line.id || line._id || line.name || "").trim();
}

function appendIdList(value: string, id: string) {
  if (!id) return value;
  const ids = splitIds(value);
  return ids.includes(id) ? ids.join(", ") : [...ids, id].join(", ");
}

const COURSE_ACCESS_OPTIONS = [
  { value: "free", label: "Free" },
  { value: "paid", label: "Paid" },
  { value: "followers", label: "Followers only" },
  { value: "customers", label: "Customers only" },
  { value: "private", label: "Private" }
] as const;

const COURSE_CATEGORY_OPTIONS = [
  { value: "Product education", label: "Product education" },
  { value: "Grow methods", label: "Grow methods" },
  { value: "Plant care", label: "Plant care" },
  { value: "Live workshop", label: "Live workshop" },
  { value: "Facility training", label: "Facility training" }
] as const;

const LESSON_TYPE_OPTIONS = [
  { value: "video", label: "Video" },
  { value: "article", label: "Article" },
  { value: "tool", label: "Tool" },
  { value: "recipe", label: "Recipe" },
  { value: "live_replay", label: "Live replay" },
  { value: "assignment", label: "Assignment" }
] as const;

function courseTitle(course: CommercialCourse | null) {
  return course?.title || "Commercial Course";
}

function courseSetupWarnings(course: Partial<CommercialCourse>) {
  const warnings: string[] = [];
  if (!course.category?.trim()) warnings.push("add category");
  if (!course.description?.trim()) warnings.push("add description");
  if (!courseGrowInterests(course.growInterests).length) {
    warnings.push("add grow interests");
  }
  if (!COURSE_ACCESS_OPTIONS.some(({ value }) => value === course.access)) {
    warnings.push("choose access");
  }
  if (!course.lessons?.length) warnings.push("add lesson");
  course.lessons?.forEach((lesson, index) => {
    if (!lesson.title?.trim()) warnings.push(`lesson ${index + 1}: add title`);
    if (
      !LESSON_TYPE_OPTIONS.some(({ value }) => value === (lesson.lessonType || "video"))
    ) {
      warnings.push(`lesson ${index + 1}: choose lesson type`);
    }
    lessonMediaPublishIssues(lesson).forEach((issue) =>
      warnings.push(`lesson ${index + 1}: ${issue}`)
    );
  });
  if (course.access === "paid") {
    if (!Number(course.price)) warnings.push("add paid price");
    if (!course.stripeProductId?.trim()) warnings.push("connect Stripe product");
    if (!course.stripePriceId?.trim()) warnings.push("connect Stripe price");
  }
  return warnings;
}

export function commercialCourseDetailImageUrl(course: Partial<CommercialCourse>) {
  return resolveImageUri(course.bannerUrl || course.thumbnailUrl || "");
}

function blocksCoursePublish(warning: string) {
  if (warning.startsWith("lesson ")) return true;
  return [
    "add thumbnail",
    "add banner",
    "add category",
    "add description",
    "add grow interests",
    "choose access",
    "add lesson",
    "add paid price",
    "connect Stripe product",
    "connect Stripe price"
  ].includes(warning);
}

function DetailRow({ label, value }: { label: string; value?: unknown }) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createCommercialCourseDetailStyles(palette), [palette]);
  const display = Array.isArray(value)
    ? value.filter(Boolean).join(", ")
    : String(value || "").trim();
  if (!display) return null;
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{display}</Text>
    </View>
  );
}

function ActionLink({ href, label }: { href: string; label: string }) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createCommercialCourseDetailStyles(palette), [palette]);

  return (
    <Link href={href as any} asChild>
      <Pressable accessibilityRole="button" style={styles.action}>
        <Text style={styles.actionText}>{label}</Text>
      </Pressable>
    </Link>
  );
}

export default function CommercialCourseDetailRoute({ route }: { route?: any } = {}) {
  const router = useRouter();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createCommercialCourseDetailStyles(palette), [palette]);
  const params = useLocalSearchParams<{ courseId?: string; preview?: string }>();
  const learnerPreview = cleanId(params.preview || route?.params?.preview) === "1";
  const courseId = useMemo(
    () => cleanId(params.courseId || route?.params?.courseId || route?.params?.id),
    [params.courseId, route?.params?.courseId, route?.params?.id]
  );
  const [course, setCourse] = useState<CommercialCourse | null>(null);
  const [productLines, setProductLines] = useState<ProductLine[]>([]);
  const [access, setAccess] = useState("");
  const [price, setPrice] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [category, setCategory] = useState("");
  const [growInterests, setGrowInterests] = useState("");
  const [description, setDescription] = useState("");
  const [stripeProductId, setStripeProductId] = useState("");
  const [stripePriceId, setStripePriceId] = useState("");
  const [linkedProductIds, setLinkedProductIds] = useState("");
  const [linkedProductLineIds, setLinkedProductLineIds] = useState("");
  const [linkedGrowIds, setLinkedGrowIds] = useState("");
  const [linkedLiveIds, setLinkedLiveIds] = useState("");
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonBody, setLessonBody] = useState("");
  const [lessonType, setLessonType] = useState("video");
  const [lessonMediaDraft, setLessonMediaDraft] = useState(() => emptyLessonMediaDraft());
  const [lessonVideoFile, setLessonVideoFile] = useState<any>(null);
  const [lessonVideoAssetId, setLessonVideoAssetId] = useState("");
  const [editingLessonId, setEditingLessonId] = useState("");
  const [deleteLessonId, setDeleteLessonId] = useState("");
  const [lessonDocumentUrls, setLessonDocumentUrls] = useState("");
  const [lessonRelatedProductIds, setLessonRelatedProductIds] = useState("");
  const [lessonRelatedLiveIds, setLessonRelatedLiveIds] = useState("");
  const [lessonForumThreadId, setLessonForumThreadId] = useState("");
  const [lessonTaskTitle, setLessonTaskTitle] = useState("");
  const [lessonTaskDueOffsetDays, setLessonTaskDueOffsetDays] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addingLesson, setAddingLesson] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [archiveConfirming, setArchiveConfirming] = useState(false);
  const [error, setError] = useState<any>(null);
  const [message, setMessage] = useState("");

  const hydrate = useCallback((next: CommercialCourse | null) => {
    setCourse(next);
    setAccess(next?.access || "free");
    setPrice(next?.price ? String(next.price) : "");
    setThumbnailUrl(next?.thumbnailUrl || "");
    setBannerUrl(next?.bannerUrl || "");
    setCategory(next?.category || "");
    setGrowInterests(courseGrowInterests(next?.growInterests).join(", "));
    setDescription(next?.description || "");
    setStripeProductId(next?.stripeProductId || "");
    setStripePriceId(next?.stripePriceId || "");
    setLinkedProductIds((next?.linkedProductIds || []).join(", "));
    setLinkedProductLineIds((next?.linkedProductLineIds || []).join(", "));
    setLinkedGrowIds((next?.linkedTrialIds || next?.linkedGrowIds || []).join(", "));
    setLinkedLiveIds((next?.linkedLiveIds || []).join(", "));
  }, []);

  const load = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    setError(null);
    try {
      const [nextCourse, nextLines] = await Promise.all([
        fetchCommercialCourse(courseId),
        fetchProductLines()
      ]);
      hydrate(nextCourse);
      setProductLines(nextLines);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [courseId, hydrate]);

  useEffect(() => {
    load();
  }, [load]);

  function paidCoursePrice() {
    if (access !== "paid") return 0;
    const amount = Number(price);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Enter a positive paid-course price before saving.");
    }
    return Math.round(amount * 100) / 100;
  }

  async function persistCourseDraft() {
    const [persistedThumbnailUrl, persistedBannerUrl] = await Promise.all([
      persistImageUri(thumbnailUrl.trim()),
      persistImageUri(bannerUrl.trim())
    ]);
    const updated = await updateCommercialCourse(courseId, {
      access: (access.trim() || "free") as CommercialCourse["access"],
      price: paidCoursePrice(),
      // Empty strings are intentional deletion values. Omitting these fields leaves
      // previously saved media in place on PATCH and makes Clear appear successful
      // until the next reload.
      thumbnailUrl: persistedThumbnailUrl || "",
      bannerUrl: persistedBannerUrl || "",
      category: category.trim() || undefined,
      growInterests: splitIds(growInterests),
      description: description.trim(),
      stripeProductId: stripeProductId.trim() || undefined,
      stripePriceId: stripePriceId.trim() || undefined,
      linkedProductIds: splitIds(linkedProductIds),
      linkedProductLineIds: splitIds(linkedProductLineIds),
      linkedTrialIds: splitIds(linkedGrowIds),
      linkedGrowIds: splitIds(linkedGrowIds),
      linkedLiveIds: splitIds(linkedLiveIds)
    });
    hydrate(updated);
    return updated;
  }

  async function saveChanges() {
    if (!courseId) return;
    setSaving(true);
    setMessage("");
    setError(null);
    try {
      await persistCourseDraft();
      setMessage("Commercial course updated.");
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  }

  async function pickCourseImage(kind: "thumbnailUrl" | "bannerUrl") {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError(
        new Error("Photo-library permission is required to upload a course image.")
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9
    });
    const uri = result.canceled ? "" : result.assets?.[0]?.uri || "";
    if (!uri) return;
    if (kind === "thumbnailUrl") setThumbnailUrl(uri);
    else setBannerUrl(uri);
  }

  async function addLesson() {
    if (!courseId || !lessonTitle.trim()) return;
    setAddingLesson(true);
    setMessage("");
    setError(null);
    try {
      const previewMedia = lessonVideoFile
        ? null
        : prepareLessonMediaSubmission(lessonMediaDraft, lessonMediaDraft.originalUrl);
      if (previewMedia?.errors.length) {
        throw new Error(previewMedia.errors.join(" "));
      }
      const uploadedVideo = lessonVideoFile
        ? await uploadCourseMedia(lessonVideoFile)
        : null;
      const preparedMedia = uploadedVideo
        ? prepareLessonMediaSubmission(
            {
              ...lessonMediaDraft,
              sourceType: "growpath_upload",
              availabilityStatus: "available",
              lastCheckedAt: new Date().toISOString(),
              allowEmbed: false
            },
            uploadedVideo.url
          )
        : previewMedia;
      const taskDueOffsetDays = lessonTaskTitle.trim()
        ? Number(lessonTaskDueOffsetDays || 0)
        : 0;
      if (
        lessonTaskTitle.trim() &&
        (!Number.isInteger(taskDueOffsetDays) || taskDueOffsetDays < 0)
      ) {
        throw new Error("Task due offset must be a whole number of zero days or more.");
      }
      const lessonPayload = {
        title: lessonTitle.trim(),
        body: lessonBody.trim(),
        lessonType: lessonType.trim() || "video",
        videoUrl: preparedMedia?.videoUrl || (editingLessonId ? "" : undefined),
        externalVideoUrl:
          preparedMedia?.externalVideoUrl || (editingLessonId ? "" : undefined),
        mediaSource: preparedMedia?.mediaSource || (editingLessonId ? null : undefined),
        videoAssetId: editingLessonId
          ? lessonVideoAssetId
          : lessonVideoAssetId || undefined,
        documentUrls: splitIds(lessonDocumentUrls),
        relatedProductIds: splitIds(lessonRelatedProductIds),
        relatedLiveIds: splitIds(lessonRelatedLiveIds),
        forumThreadId: lessonForumThreadId.trim() || undefined,
        taskTemplate: lessonTaskTitle.trim()
          ? {
              title: lessonTaskTitle.trim(),
              workspaceType: "commercial",
              sourceType: "lesson",
              priority: "normal",
              status: "open",
              allDay: true,
              calendarType: "course_lesson_task",
              sourceStage: `${lessonType.trim() || "video"}_lesson_action`,
              linkedCourseId: courseId,
              linkedProductIds: splitIds(lessonRelatedProductIds),
              linkedLiveIds: splitIds(lessonRelatedLiveIds),
              linkedForumThreadId: lessonForumThreadId.trim() || undefined,
              dueOffsetDays: taskDueOffsetDays,
              reminderPlan: { label: "24 hours before", channels: ["in_app"] },
              requiresProof: false,
              requiresApproval: false,
              completionCriteria: "lesson_action"
            }
          : undefined,
        status: "draft"
      };
      const updated = editingLessonId
        ? await updateCommercialCourseLesson(courseId, editingLessonId, lessonPayload)
        : await addCommercialCourseLesson(courseId, lessonPayload);
      hydrate(updated);
      setLessonTitle("");
      setLessonBody("");
      setLessonType("video");
      setLessonMediaDraft(emptyLessonMediaDraft());
      setLessonVideoFile(null);
      setLessonVideoAssetId("");
      setEditingLessonId("");
      setLessonDocumentUrls("");
      setLessonRelatedProductIds("");
      setLessonRelatedLiveIds("");
      setLessonForumThreadId("");
      setLessonTaskTitle("");
      setLessonTaskDueOffsetDays("");
      setMessage(editingLessonId ? "Lesson updated." : "Lesson added.");
    } catch (err) {
      setError(err);
    } finally {
      setAddingLesson(false);
    }
  }

  async function pickLessonVideo() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        throw new Error("Photo-library permission is required to upload a lesson video.");
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        quality: 1
      });
      if (!result.canceled && result.assets?.[0]) {
        setLessonVideoFile(result.assets[0]);
        setLessonVideoAssetId("");
        setLessonMediaDraft((current) => ({
          ...current,
          sourceType: "growpath_upload",
          originalUrl: "",
          availabilityStatus: "unchecked",
          lastCheckedAt: "",
          allowEmbed: false
        }));
      }
    } catch (err) {
      setError(err);
    }
  }

  function editLesson(lesson: any) {
    setEditingLessonId(cleanId(lesson.id || lesson._id));
    setDeleteLessonId("");
    setLessonTitle(lesson.title || "");
    setLessonBody(lesson.body || lesson.content || "");
    setLessonType(lesson.lessonType || "video");
    setLessonMediaDraft(lessonMediaDraftFromLesson(lesson));
    setLessonVideoFile(null);
    setLessonVideoAssetId(lesson.videoAssetId || "");
    setLessonDocumentUrls((lesson.documentUrls || []).join(", "));
    setLessonRelatedProductIds((lesson.relatedProductIds || []).join(", "));
    setLessonRelatedLiveIds((lesson.relatedLiveIds || []).join(", "));
    setLessonForumThreadId(lesson.forumThreadId || "");
    setLessonTaskTitle(lesson.taskTemplate?.title || "");
    setLessonTaskDueOffsetDays(
      lesson.taskTemplate?.dueOffsetDays === undefined
        ? ""
        : String(lesson.taskTemplate.dueOffsetDays)
    );
    setMessage(`Editing ${lesson.title || "lesson"}.`);
  }

  function cancelLessonEdit() {
    setEditingLessonId("");
    setDeleteLessonId("");
    setLessonTitle("");
    setLessonBody("");
    setLessonType("video");
    setLessonMediaDraft(emptyLessonMediaDraft());
    setLessonVideoFile(null);
    setLessonVideoAssetId("");
    setLessonDocumentUrls("");
    setLessonRelatedProductIds("");
    setLessonRelatedLiveIds("");
    setLessonForumThreadId("");
    setLessonTaskTitle("");
    setLessonTaskDueOffsetDays("");
  }

  async function removeLesson(lessonId: string) {
    if (!courseId || !lessonId) return;
    setAddingLesson(true);
    setMessage("");
    setError(null);
    try {
      const updated = await deleteCommercialCourseLesson(courseId, lessonId);
      hydrate(updated);
      if (editingLessonId === lessonId) cancelLessonEdit();
      setDeleteLessonId("");
      setMessage("Lesson removed. A linked Video Library item was not deleted.");
    } catch (err) {
      setError(err);
    } finally {
      setAddingLesson(false);
    }
  }

  async function publishCourse() {
    if (!courseId) return;
    setPublishing(true);
    setMessage("");
    setError(null);
    try {
      await persistCourseDraft();
      hydrate(await publishCommercialCourse(courseId));
      setMessage("Course published.");
    } catch (err) {
      setError(err);
    } finally {
      setPublishing(false);
    }
  }

  async function unpublishCourse() {
    if (!courseId) return;
    setPublishing(true);
    setMessage("");
    setError(null);
    try {
      hydrate(await unpublishCommercialCourse(courseId));
      cancelLessonEdit();
      setMessage("Course returned to draft. Editing is available again.");
    } catch (err) {
      setError(err);
    } finally {
      setPublishing(false);
    }
  }

  async function archiveCourse() {
    if (!courseId) return;
    setArchiving(true);
    setMessage("");
    setError(null);
    try {
      await archiveCommercialCourse(courseId);
      setArchiveConfirming(false);
      setCourse(null);
      setMessage("Course archived. Returning to active courses.");
      router.replace?.("/home/commercial/courses");
    } catch (err) {
      setError(err);
      setMessage(err instanceof Error ? err.message : "Unable to archive course.");
    } finally {
      setArchiving(false);
    }
  }

  const lessons = Array.isArray(course?.lessons) ? course.lessons : [];
  const parsedPrice = Number(price);
  const setupWarnings = courseSetupWarnings({
    ...course,
    access: (access.trim() || course?.access || "free") as CommercialCourse["access"],
    price: Number.isFinite(parsedPrice) && parsedPrice > 0 ? parsedPrice : 0,
    thumbnailUrl,
    bannerUrl,
    category,
    growInterests: splitIds(growInterests),
    description,
    stripeProductId,
    stripePriceId,
    linkedProductIds: splitIds(linkedProductIds),
    linkedProductLineIds: splitIds(linkedProductLineIds),
    linkedTrialIds: splitIds(linkedGrowIds),
    linkedGrowIds: splitIds(linkedGrowIds),
    linkedLiveIds: splitIds(linkedLiveIds),
    lessons
  });
  const publishBlocked = setupWarnings.some(blocksCoursePublish);
  const coursePublished = course?.status === "published";
  const courseBusy = saving || addingLesson || publishing || archiving;

  if (learnerPreview) {
    return (
      <AppPage
        routeKey="commercial-course-learner-preview"
        backFallbackHref="/home/commercial/courses"
        longContent
        header={
          <View style={styles.header}>
            <Text style={styles.kicker}>Learner preview</Text>
            <Text style={styles.title}>{courseTitle(course)}</Text>
            <Text style={styles.subtitle}>
              Review the course as a learner will see it. Authoring controls are hidden in
              preview mode.
            </Text>
            <View style={styles.actions}>
              <ActionLink
                href={`/home/commercial/courses/${encodeURIComponent(courseId)}`}
                label="Return to Course Editor"
              />
              <ActionLink href="/home/commercial/courses" label="All Courses" />
            </View>
          </View>
        }
      >
        {loading ? <Text style={styles.muted}>Loading learner preview...</Text> : null}
        {error ? <InlineError error={error} /> : null}
        {course ? (
          <>
            <AppCard>
              <Text style={styles.kicker}>Course overview</Text>
              <Text style={styles.title}>{course.title || "Untitled course"}</Text>
              {commercialCourseDetailImageUrl(course) ? (
                <Image
                  accessibilityLabel="Course learner preview banner"
                  source={{ uri: commercialCourseDetailImageUrl(course) }}
                  style={styles.bannerPreview}
                  resizeMode="cover"
                />
              ) : null}
              <Text style={styles.body}>
                {course.description || "No description yet."}
              </Text>
              <View style={styles.detailGrid}>
                <DetailRow label="Category" value={course.category} />
                <DetailRow
                  label="Grow interests"
                  value={courseGrowInterests(course.growInterests).join(", ")}
                />
                <DetailRow label="Access" value={course.access} />
                <DetailRow label="Status" value={course.status} />
                <DetailRow label="Lessons" value={lessons.length} />
              </View>
            </AppCard>

            <AppCard>
              <Text style={styles.cardTitle}>Course lessons</Text>
              {lessons.length ? (
                <View style={styles.list}>
                  {lessons.map((lesson, index) => (
                    <View
                      key={String(lesson.id || lesson._id || index)}
                      style={styles.row}
                    >
                      <Text style={styles.rowTitle}>
                        {lesson.title || `Lesson ${index + 1}`}
                      </Text>
                      {lesson.body ? (
                        <Text style={styles.body}>{lesson.body}</Text>
                      ) : null}
                      <LessonMediaCard lesson={lesson} compact />
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.muted}>No learner lessons are available yet.</Text>
              )}
            </AppCard>
          </>
        ) : null}
      </AppPage>
    );
  }

  return (
    <AppPage
      routeKey="commercial-course-detail"
      backFallbackHref="/home/commercial/courses"
      longContent
      header={
        <View style={styles.header}>
          <Text style={styles.kicker}>Commercial education workspace</Text>
          <Text style={styles.title}>{courseTitle(course)}</Text>
          <Text style={styles.subtitle}>
            Build product education, lessons, storefront links, and feed/course launch
            context from the commercial account without losing universal course support.
          </Text>
          <View style={styles.actions}>
            <ActionLink href="/home/commercial/courses" label="All Courses" />
            <ActionLink href="/courses" label="Public Catalog" />
            <ActionLink href="/home/commercial/feed" label="Announce in Feed" />
          </View>
        </View>
      }
    >
      {loading ? <Text style={styles.muted}>Loading commercial course...</Text> : null}
      {error ? <InlineError error={error} /> : null}
      {message ? <Text style={styles.success}>{message}</Text> : null}

      {learnerPreview && course ? (
        <AppCard>
          <Text style={styles.kicker}>Learner preview</Text>
          <Text style={styles.title}>{course.title || "Untitled course"}</Text>
          {commercialCourseDetailImageUrl(course) ? (
            <Image
              accessibilityLabel="Course learner preview banner"
              source={{ uri: commercialCourseDetailImageUrl(course) }}
              style={styles.bannerPreview}
              resizeMode="cover"
            />
          ) : null}
          <Text style={styles.body}>{course.description || "No description yet."}</Text>
          <Text style={styles.muted}>
            {lessons.length
              ? `${lessons.length} lessons available in this course outline.`
              : "No learner lessons are available yet."}
          </Text>
        </AppCard>
      ) : null}

      <AppCard>
        <Text style={styles.cardTitle}>Course Record</Text>
        <Text style={styles.body}>
          Commercial courses can be free or paid, and should connect to products, product
          lines, product trial evidence runs, feed campaigns, storefronts, and forum
          support.
        </Text>
        <View style={styles.detailGrid}>
          <DetailRow label="Category" value={course?.category} />
          <DetailRow
            label="Grow interests"
            value={courseGrowInterests(course?.growInterests).join(", ")}
          />
          <DetailRow label="Thumbnail" value={course?.thumbnailUrl} />
          <DetailRow label="Banner" value={course?.bannerUrl} />
          <DetailRow label="Access" value={course?.access} />
          <DetailRow label="Status" value={course?.status} />
          <DetailRow label="Price" value={course?.price ? `$${course.price}` : ""} />
          <DetailRow label="Stripe product" value={course?.stripeProductId} />
          <DetailRow label="Stripe price" value={course?.stripePriceId} />
          <DetailRow label="Lessons" value={lessons.length} />
          <DetailRow label="Linked products" value={course?.linkedProductIds} />
          <DetailRow label="Linked product lines" value={course?.linkedProductLineIds} />
          <DetailRow
            label="Evidence runs"
            value={course?.linkedTrialIds || course?.linkedGrowIds}
          />
          <DetailRow label="Linked lives" value={course?.linkedLiveIds} />
        </View>
        {setupWarnings.length ? (
          <View style={styles.warningBox}>
            <Text style={styles.warningTitle}>Course setup checklist</Text>
            <Text style={styles.warningText}>{setupWarnings.join(" | ")}</Text>
          </View>
        ) : null}
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>
          {coursePublished ? "Published Commercial Course" : "Update Commercial Course"}
        </Text>
        {coursePublished ? (
          <View style={styles.warningBox}>
            <Text style={styles.warningTitle}>Published content is locked</Text>
            <Text style={styles.warningText}>
              Learners keep a stable course while it is published. Return it to draft
              before changing course details or lessons; purchases and lesson history are
              preserved.
            </Text>
            <Pressable
              accessibilityLabel="Unpublish commercial course"
              accessibilityRole="button"
              disabled={courseBusy || !courseId}
              onPress={unpublishCourse}
              style={[
                styles.secondaryAction,
                courseBusy || !courseId ? styles.disabled : null
              ]}
            >
              <Text style={styles.secondaryActionText}>
                {publishing ? "Returning to draft..." : "Unpublish Course"}
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Text style={styles.selectorLabel}>Course access</Text>
            <View
              style={styles.actions}
              accessibilityRole="radiogroup"
              accessibilityLabel="Commercial course detail access"
            >
              {COURSE_ACCESS_OPTIONS.map(({ value, label }) => (
                <Pressable
                  key={value}
                  accessibilityRole="radio"
                  accessibilityLabel={`Set commercial course detail access to ${label}`}
                  aria-checked={access === value}
                  accessibilityState={{ checked: access === value, disabled: courseBusy }}
                  disabled={courseBusy}
                  onPress={() => setAccess(value)}
                  style={[styles.action, access === value ? styles.actionSelected : null]}
                >
                  <Text
                    style={[
                      styles.actionText,
                      access === value ? styles.actionTextSelected : null
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.selectorLabel}>Course category</Text>
            <View
              style={styles.actions}
              accessibilityRole="radiogroup"
              accessibilityLabel="Commercial course detail category"
            >
              {COURSE_CATEGORY_OPTIONS.map(({ value, label }) => (
                <Pressable
                  key={value}
                  accessibilityRole="radio"
                  accessibilityLabel={`Set commercial course detail category to ${label}`}
                  aria-checked={category === value}
                  accessibilityState={{
                    checked: category === value,
                    disabled: courseBusy
                  }}
                  disabled={courseBusy}
                  onPress={() => setCategory(value)}
                  style={[
                    styles.action,
                    category === value ? styles.actionSelected : null
                  ]}
                >
                  <Text
                    style={[
                      styles.actionText,
                      category === value ? styles.actionTextSelected : null
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.formGrid}>
              <TextInput
                accessibilityLabel="Commercial course detail grow interests"
                onChangeText={setGrowInterests}
                placeholder="Grow interests for discovery and campaigns"
                placeholderTextColor={palette.textMuted}
                style={styles.input}
                value={growInterests}
              />
            </View>
            <View style={styles.formGrid}>
              <TextInput
                accessibilityLabel="Commercial course detail thumbnail URL"
                autoCapitalize="none"
                onChangeText={setThumbnailUrl}
                placeholder="Thumbnail URL for storefront cards"
                placeholderTextColor={palette.textMuted}
                style={styles.input}
                value={thumbnailUrl}
              />
              <TextInput
                accessibilityLabel="Commercial course detail banner URL"
                autoCapitalize="none"
                onChangeText={setBannerUrl}
                placeholder="Banner URL for public course page"
                placeholderTextColor={palette.textMuted}
                style={styles.input}
                value={bannerUrl}
              />
            </View>
            <View style={styles.mediaTools}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Upload commercial course detail thumbnail"
                disabled={courseBusy}
                onPress={() => pickCourseImage("thumbnailUrl")}
                style={[styles.mediaButton, courseBusy && styles.disabled]}
              >
                <Text style={styles.mediaButtonText}>Upload thumbnail</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Upload commercial course detail banner"
                disabled={courseBusy}
                onPress={() => pickCourseImage("bannerUrl")}
                style={[styles.mediaButton, courseBusy && styles.disabled]}
              >
                <Text style={styles.mediaButtonText}>Upload banner</Text>
              </Pressable>
              {thumbnailUrl ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Clear commercial course detail thumbnail"
                  disabled={courseBusy}
                  onPress={() => setThumbnailUrl("")}
                  style={styles.clearButton}
                >
                  <Text style={styles.clearButtonText}>Clear thumbnail</Text>
                </Pressable>
              ) : null}
              {bannerUrl ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Clear commercial course detail banner"
                  disabled={courseBusy}
                  onPress={() => setBannerUrl("")}
                  style={styles.clearButton}
                >
                  <Text style={styles.clearButtonText}>Clear banner</Text>
                </Pressable>
              ) : null}
            </View>
            {thumbnailUrl || bannerUrl ? (
              <View style={styles.previewGrid}>
                {thumbnailUrl ? (
                  <Image
                    accessibilityLabel="Commercial course detail thumbnail preview"
                    resizeMode="cover"
                    source={{ uri: resolveImageUri(thumbnailUrl) }}
                    style={styles.thumbnailPreview}
                  />
                ) : null}
                {bannerUrl ? (
                  <Image
                    accessibilityLabel="Commercial course detail banner preview"
                    resizeMode="cover"
                    source={{ uri: resolveImageUri(bannerUrl) }}
                    style={styles.bannerPreview}
                  />
                ) : null}
              </View>
            ) : null}
            <TextInput
              accessibilityLabel="Commercial course detail description"
              multiline
              onChangeText={setDescription}
              placeholder="Course description and use case"
              placeholderTextColor={palette.textMuted}
              style={[styles.input, styles.textArea]}
              value={description}
            />
            <View style={styles.formGrid}>
              <TextInput
                accessibilityLabel="Commercial course detail price"
                keyboardType="decimal-pad"
                onChangeText={setPrice}
                placeholder="Paid course price"
                placeholderTextColor={palette.textMuted}
                style={styles.input}
                value={price}
              />
              <TextInput
                accessibilityLabel="Commercial course detail Stripe product ID"
                autoCapitalize="none"
                onChangeText={setStripeProductId}
                placeholder="Stripe product ID for paid course"
                placeholderTextColor={palette.textMuted}
                style={styles.input}
                value={stripeProductId}
              />
              <TextInput
                accessibilityLabel="Commercial course detail Stripe price ID"
                autoCapitalize="none"
                onChangeText={setStripePriceId}
                placeholder="Stripe price ID for paid course"
                placeholderTextColor={palette.textMuted}
                style={styles.input}
                value={stripePriceId}
              />
            </View>
            <TextInput
              accessibilityLabel="Commercial course detail linked products"
              onChangeText={setLinkedProductIds}
              placeholder="Linked product IDs"
              placeholderTextColor={palette.textMuted}
              style={styles.input}
              value={linkedProductIds}
            />
            <TextInput
              accessibilityLabel="Commercial course detail linked product lines"
              onChangeText={setLinkedProductLineIds}
              placeholder="Linked product line IDs, or choose below"
              placeholderTextColor={palette.textMuted}
              style={styles.input}
              value={linkedProductLineIds}
            />
            {productLines.length ? (
              <View style={styles.lineSelector}>
                <Text style={styles.selectorLabel}>Choose Product Line</Text>
                <View style={styles.selectorActions}>
                  {productLines.slice(0, 4).map((line) => {
                    const id = productLineId(line);
                    const name = line.name || "Product line";
                    const selected = splitIds(linkedProductLineIds).includes(id);
                    return (
                      <Pressable
                        key={`course-detail-line-${id || name}`}
                        accessibilityRole="button"
                        accessibilityLabel={`Use course detail product line ${name}`}
                        accessibilityState={{ disabled: courseBusy, selected }}
                        disabled={courseBusy}
                        onPress={() =>
                          setLinkedProductLineIds((current) => appendIdList(current, id))
                        }
                        style={[
                          styles.action,
                          selected && styles.actionSelected,
                          courseBusy && styles.disabled
                        ]}
                      >
                        <Text
                          style={[
                            styles.actionText,
                            selected ? styles.actionTextSelected : null
                          ]}
                        >
                          {name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}
            <TextInput
              accessibilityLabel="Commercial course detail linked evidence runs"
              onChangeText={setLinkedGrowIds}
              placeholder="Linked evidence run IDs"
              placeholderTextColor={palette.textMuted}
              style={styles.input}
              value={linkedGrowIds}
            />
            <TextInput
              accessibilityLabel="Commercial course detail linked lives"
              onChangeText={setLinkedLiveIds}
              placeholder="Linked live IDs"
              placeholderTextColor={palette.textMuted}
              style={styles.input}
              value={linkedLiveIds}
            />
            <View style={styles.actions}>
              <Pressable
                accessibilityLabel="Save commercial course detail"
                accessibilityRole="button"
                disabled={courseBusy || !courseId}
                onPress={saveChanges}
                style={[
                  styles.primaryAction,
                  courseBusy || !courseId ? styles.disabled : null
                ]}
              >
                <Text style={styles.primaryActionText}>
                  {saving ? "Saving..." : "Save Course"}
                </Text>
              </Pressable>
              <Pressable
                accessibilityLabel="Publish commercial course"
                accessibilityRole="button"
                disabled={courseBusy || !courseId || publishBlocked}
                onPress={publishCourse}
                style={[
                  styles.secondaryAction,
                  courseBusy || !courseId || publishBlocked ? styles.disabled : null
                ]}
              >
                <Text style={styles.secondaryActionText}>
                  {publishing ? "Saving & publishing..." : "Save & Publish Course"}
                </Text>
              </Pressable>
            </View>
          </>
        )}
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Lessons</Text>
        {coursePublished ? (
          <Text style={styles.muted}>
            Lessons are read-only while this course is published. Unpublish the course to
            add, edit, or remove lessons.
          </Text>
        ) : null}
        {lessons.length ? (
          <View style={styles.list}>
            {lessons.map((lesson, index) => (
              <View key={String(lesson.id || index)} style={styles.row}>
                <Text style={styles.rowTitle}>
                  {lesson.title || `Lesson ${index + 1}`}
                </Text>
                <Text style={styles.muted}>
                  {[lesson.status || "draft", lesson.order && `order ${lesson.order}`]
                    .filter(Boolean)
                    .join(" | ")}
                </Text>
                {lesson.body ? <Text style={styles.body}>{lesson.body}</Text> : null}
                {lesson.lessonType ||
                lesson.relatedProductIds?.length ||
                lesson.relatedLiveIds?.length ||
                lesson.forumThreadId ||
                lesson.taskTemplate?.title ? (
                  <Text style={styles.muted}>
                    {[
                      lesson.lessonType && `Type ${lesson.lessonType}`,
                      Array.isArray(lesson.relatedProductIds) &&
                        lesson.relatedProductIds.length &&
                        `Products ${lesson.relatedProductIds.join(", ")}`,
                      Array.isArray(lesson.relatedLiveIds) &&
                        lesson.relatedLiveIds.length &&
                        `Lives ${lesson.relatedLiveIds.join(", ")}`,
                      lesson.forumThreadId && `Forum/Q&A ${lesson.forumThreadId}`,
                      lesson.externalVideoUrl && `Video ${lesson.externalVideoUrl}`,
                      Array.isArray(lesson.documentUrls) &&
                        lesson.documentUrls.length &&
                        `Docs ${lesson.documentUrls.length}`,
                      lesson.taskTemplate?.title && `Task ${lesson.taskTemplate.title}`
                    ]
                      .filter(Boolean)
                      .join(" | ")}
                  </Text>
                ) : null}
                {!coursePublished ? (
                  <>
                    <View style={styles.actions}>
                      <Pressable
                        accessibilityLabel={`Edit lesson ${lesson.title || index + 1}`}
                        accessibilityRole="button"
                        disabled={courseBusy}
                        onPress={() => editLesson(lesson)}
                        style={styles.secondaryAction}
                      >
                        <Text style={styles.secondaryActionText}>Edit</Text>
                      </Pressable>
                      <Pressable
                        accessibilityLabel={`Remove lesson ${lesson.title || index + 1}`}
                        accessibilityRole="button"
                        disabled={courseBusy}
                        onPress={() =>
                          setDeleteLessonId(cleanId(lesson.id || lesson._id))
                        }
                        style={styles.dangerAction}
                      >
                        <Text style={styles.dangerActionText}>Remove</Text>
                      </Pressable>
                    </View>
                    {deleteLessonId === cleanId(lesson.id || lesson._id) ? (
                      <View style={styles.warningBox}>
                        <Text style={styles.warningTitle}>Remove this lesson?</Text>
                        <Text style={styles.warningText}>
                          The lesson will be removed from the course. A reusable Video
                          Library item will remain available.
                        </Text>
                        <View style={styles.actions}>
                          <Pressable
                            accessibilityLabel={`Confirm removal of lesson ${lesson.title || index + 1}`}
                            accessibilityRole="button"
                            disabled={courseBusy}
                            onPress={() =>
                              void removeLesson(cleanId(lesson.id || lesson._id))
                            }
                            style={styles.dangerAction}
                          >
                            <Text style={styles.dangerActionText}>Confirm Remove</Text>
                          </Pressable>
                          <Pressable
                            accessibilityRole="button"
                            disabled={courseBusy}
                            onPress={() => setDeleteLessonId("")}
                            style={styles.secondaryAction}
                          >
                            <Text style={styles.secondaryActionText}>Keep Lesson</Text>
                          </Pressable>
                        </View>
                      </View>
                    ) : null}
                  </>
                ) : null}
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.muted}>No lessons yet.</Text>
        )}
        {!coursePublished ? (
          <>
            <TextInput
              accessibilityLabel="Commercial course lesson title"
              onChangeText={setLessonTitle}
              placeholder="Lesson title"
              placeholderTextColor={palette.textMuted}
              style={styles.input}
              value={lessonTitle}
            />
            <TextInput
              accessibilityLabel="Commercial course lesson body"
              multiline
              onChangeText={setLessonBody}
              placeholder="Lesson body, product instructions, trial evidence, support notes"
              placeholderTextColor={palette.textMuted}
              style={[styles.input, styles.textArea]}
              value={lessonBody}
            />
            <LessonMediaSourceEditor
              value={lessonMediaDraft}
              onChange={setLessonMediaDraft}
              disabled={courseBusy}
              onPickUpload={pickLessonVideo}
              pendingUploadName={lessonVideoFile?.fileName || lessonVideoFile?.name || ""}
              onRemove={() => {
                setLessonVideoFile(null);
                setLessonVideoAssetId("");
                setLessonMediaDraft(emptyLessonMediaDraft());
              }}
            />
            <VideoLibraryPicker
              selectedId={lessonVideoAssetId}
              disabled={courseBusy}
              onSelect={(video) => {
                setLessonVideoFile(null);
                setLessonVideoAssetId(video?.id || "");
                setLessonMediaDraft(
                  video ? lessonMediaDraftFromLesson(video) : emptyLessonMediaDraft()
                );
              }}
            />
            <Text style={styles.selectorLabel}>Lesson type</Text>
            <View
              style={styles.actions}
              accessibilityRole="radiogroup"
              accessibilityLabel="Commercial course lesson type"
            >
              {LESSON_TYPE_OPTIONS.map(({ value, label }) => (
                <Pressable
                  key={value}
                  accessibilityRole="radio"
                  accessibilityLabel={`Set commercial course lesson type to ${label}`}
                  aria-checked={lessonType === value}
                  accessibilityState={{
                    checked: lessonType === value,
                    disabled: courseBusy
                  }}
                  disabled={courseBusy}
                  onPress={() => setLessonType(value)}
                  style={[
                    styles.action,
                    lessonType === value ? styles.actionSelected : null
                  ]}
                >
                  <Text
                    style={[
                      styles.actionText,
                      lessonType === value ? styles.actionTextSelected : null
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.formGrid}>
              <TextInput
                accessibilityLabel="Commercial course lesson related products"
                onChangeText={setLessonRelatedProductIds}
                placeholder="Related product IDs"
                placeholderTextColor={palette.textMuted}
                style={styles.input}
                value={lessonRelatedProductIds}
              />
              <TextInput
                accessibilityLabel="Commercial course lesson documents"
                autoCapitalize="none"
                onChangeText={setLessonDocumentUrls}
                placeholder="Document URLs, comma separated"
                placeholderTextColor={palette.textMuted}
                style={styles.input}
                value={lessonDocumentUrls}
              />
              <TextInput
                accessibilityLabel="Commercial course lesson related lives"
                onChangeText={setLessonRelatedLiveIds}
                placeholder="Related live IDs"
                placeholderTextColor={palette.textMuted}
                style={styles.input}
                value={lessonRelatedLiveIds}
              />
              <TextInput
                accessibilityLabel="Commercial course lesson Forum Q&A thread"
                onChangeText={setLessonForumThreadId}
                placeholder="Forum/Q&A thread ID"
                placeholderTextColor={palette.textMuted}
                style={styles.input}
                value={lessonForumThreadId}
              />
              <TextInput
                accessibilityLabel="Commercial course lesson task title"
                onChangeText={setLessonTaskTitle}
                placeholder="Task created by this lesson"
                placeholderTextColor={palette.textMuted}
                style={styles.input}
                value={lessonTaskTitle}
              />
              <TextInput
                accessibilityLabel="Commercial course lesson task due offset days"
                keyboardType="numeric"
                onChangeText={setLessonTaskDueOffsetDays}
                placeholder="Task due offset days"
                placeholderTextColor={palette.textMuted}
                style={styles.input}
                value={lessonTaskDueOffsetDays}
              />
            </View>
            <Pressable
              accessibilityLabel={
                editingLessonId
                  ? "Save commercial course lesson changes"
                  : "Add commercial course lesson"
              }
              accessibilityRole="button"
              disabled={courseBusy || !lessonTitle.trim()}
              onPress={addLesson}
              style={[
                styles.primaryAction,
                courseBusy || !lessonTitle.trim() ? styles.disabled : null
              ]}
            >
              <Text style={styles.primaryActionText}>
                {addingLesson
                  ? "Saving..."
                  : editingLessonId
                    ? "Save Lesson Changes"
                    : "Add Lesson"}
              </Text>
            </Pressable>
            {editingLessonId ? (
              <Pressable
                accessibilityLabel="Cancel lesson edit"
                accessibilityRole="button"
                disabled={courseBusy}
                onPress={cancelLessonEdit}
                style={styles.secondaryAction}
              >
                <Text style={styles.secondaryActionText}>Cancel Edit</Text>
              </Pressable>
            ) : null}
          </>
        ) : null}
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Commercial Course Loop</Text>
        <Text style={styles.bullet}>
          Attach products and product lines before public launch.
        </Text>
        <Text style={styles.bullet}>
          Use product-trial evidence runs in lessons when making product claims.
        </Text>
        <Text style={styles.bullet}>
          Announce published courses in feed and link them from storefront/profile.
        </Text>
        <Text style={styles.bullet}>
          Answer course/product questions in Forum/Q&A support threads.
        </Text>
        <View style={styles.actions}>
          <ActionLink href="/home/commercial/products" label="Products" />
          <ActionLink href="/home/commercial/trials" label="Product Trials" />
          <ActionLink href="/home/commercial/storefront" label="Storefront" />
          <ActionLink href="/home/commercial/community" label="Forum / Q&A" />
        </View>
      </AppCard>

      {!coursePublished && course ? (
        <AppCard>
          <Text style={styles.cardTitle}>Archive draft course</Text>
          <Text style={styles.body}>
            Archive a course you no longer need. It disappears from active course lists,
            but GrowPath retains the record for audit and does not delete reusable Video
            Library files. Published courses must be returned to draft first.
          </Text>
          {!archiveConfirming ? (
            <Pressable
              accessibilityLabel="Archive commercial course"
              accessibilityRole="button"
              disabled={courseBusy || !courseId}
              onPress={() => setArchiveConfirming(true)}
              style={[styles.dangerAction, courseBusy && styles.disabled]}
            >
              <Text style={styles.dangerActionText}>Archive Course</Text>
            </Pressable>
          ) : (
            <View style={styles.warningBox}>
              <Text style={styles.warningTitle}>Archive this draft course?</Text>
              <Text style={styles.warningText}>
                This removes the course from active lists. Its retained audit record is
                not a learner-visible course and cannot be edited from this screen.
              </Text>
              <View style={styles.actions}>
                <Pressable
                  accessibilityLabel="Confirm archive commercial course"
                  accessibilityRole="button"
                  disabled={courseBusy}
                  onPress={() => void archiveCourse()}
                  style={[styles.dangerAction, courseBusy && styles.disabled]}
                >
                  <Text style={styles.dangerActionText}>
                    {archiving ? "Archiving..." : "Confirm Archive"}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityLabel="Keep commercial course"
                  accessibilityRole="button"
                  disabled={courseBusy}
                  onPress={() => setArchiveConfirming(false)}
                  style={styles.secondaryAction}
                >
                  <Text style={styles.secondaryActionText}>Keep Course</Text>
                </Pressable>
              </View>
            </View>
          )}
        </AppCard>
      ) : null}
    </AppPage>
  );
}

export function createCommercialCourseDetailStyles(palette: ThemePalette) {
  return StyleSheet.create({
    header: { gap: 8 },
    kicker: {
      color: palette.link,
      fontSize: 12,
      fontWeight: "900",
      textTransform: "uppercase"
    },
    title: { color: palette.text, fontSize: 28, fontWeight: "900" },
    subtitle: { color: palette.textMuted, lineHeight: 21 },
    cardTitle: { color: palette.text, fontSize: 17, fontWeight: "900" },
    body: { color: palette.textMuted, fontSize: 14, lineHeight: 21, marginTop: 8 },
    muted: { color: palette.textMuted, fontSize: 13, marginTop: 4 },
    detailGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
    detailRow: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      minWidth: 170,
      padding: 10
    },
    detailLabel: {
      color: palette.textMuted,
      fontSize: 11,
      fontWeight: "900",
      textTransform: "uppercase"
    },
    detailValue: {
      color: palette.text,
      fontSize: 14,
      fontWeight: "800",
      marginTop: 4
    },
    formGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
    mediaTools: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 12
    },
    mediaButton: {
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      paddingHorizontal: 12,
      paddingVertical: 9
    },
    mediaButtonText: {
      color: palette.accentText,
      fontSize: 13,
      fontWeight: "900"
    },
    clearButton: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 9
    },
    clearButtonText: {
      color: palette.text,
      fontSize: 13,
      fontWeight: "900"
    },
    previewGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      marginTop: 10
    },
    thumbnailPreview: {
      aspectRatio: 4 / 3,
      backgroundColor: palette.surfaceMuted,
      borderRadius: radius.card,
      flex: 1,
      minWidth: 180
    },
    bannerPreview: {
      aspectRatio: 16 / 7,
      backgroundColor: palette.surfaceMuted,
      borderRadius: radius.card,
      flex: 2,
      minWidth: 260
    },
    input: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      color: palette.text,
      flexGrow: 1,
      fontSize: 14,
      marginTop: 10,
      minWidth: 220,
      paddingHorizontal: 10,
      paddingVertical: 9
    },
    textArea: { minHeight: 88, textAlignVertical: "top" },
    actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
    action: {
      backgroundColor: palette.surface,
      borderColor: palette.accent,
      borderRadius: radius.card,
      borderWidth: 1,
      paddingHorizontal: 11,
      paddingVertical: 8
    },
    actionSelected: { backgroundColor: palette.accent, borderColor: palette.accent },
    actionText: { color: palette.link, fontSize: 13, fontWeight: "900" },
    actionTextSelected: { color: palette.accentText },
    lineSelector: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      marginTop: 10,
      padding: 9
    },
    selectorLabel: {
      color: palette.link,
      fontSize: 11,
      fontWeight: "900",
      textTransform: "uppercase"
    },
    selectorActions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
    primaryAction: {
      alignSelf: "flex-start",
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      marginTop: 12,
      paddingHorizontal: 12,
      paddingVertical: 9
    },
    primaryActionText: { color: palette.accentText, fontSize: 13, fontWeight: "900" },
    secondaryAction: {
      alignSelf: "flex-start",
      backgroundColor: palette.surface,
      borderColor: palette.accent,
      borderRadius: radius.card,
      borderWidth: 1,
      marginTop: 12,
      paddingHorizontal: 12,
      paddingVertical: 9
    },
    secondaryActionText: { color: palette.link, fontSize: 13, fontWeight: "900" },
    dangerAction: {
      alignSelf: "flex-start",
      backgroundColor: palette.surface,
      borderColor: palette.danger,
      borderRadius: radius.card,
      borderWidth: 1,
      marginTop: 12,
      paddingHorizontal: 12,
      paddingVertical: 9
    },
    dangerActionText: { color: palette.danger, fontSize: 13, fontWeight: "900" },
    disabled: { opacity: 0.55 },
    success: { color: palette.success, fontSize: 13, fontWeight: "800", marginTop: 8 },
    warningBox: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.warning,
      borderRadius: radius.card,
      borderWidth: 1,
      marginTop: 10,
      padding: 10
    },
    warningTitle: {
      color: palette.warning,
      fontSize: 12,
      fontWeight: "900",
      textTransform: "uppercase"
    },
    warningText: {
      color: palette.warning,
      fontSize: 12,
      fontWeight: "800",
      marginTop: 4
    },
    list: { gap: 10, marginTop: 12 },
    row: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      padding: 10
    },
    rowTitle: { color: palette.text, fontSize: 15, fontWeight: "900" },
    bullet: {
      color: palette.textSoft,
      fontSize: 13,
      fontWeight: "700",
      lineHeight: 19,
      marginTop: 6
    }
  });
}
