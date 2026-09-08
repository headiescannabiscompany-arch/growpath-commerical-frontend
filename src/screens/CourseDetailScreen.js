import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import {
  archiveCourse,
  completeLesson,
  enrollInCourse,
  getCourse,
  getCourseLearnerNotes,
  getEnrollmentStatus,
  getReviews,
  publishCourse,
  sendWatchTime,
  saveCourseLearnerNote,
  trackDropoff,
  trackCourseProductClick,
  trackCourseView,
  trackLessonView,
  unpublishCourse,
  updateCourse
} from "../api/courses";
import { apiRequest } from "../api/apiRequest";
import {
  getCoursePaymentStatus,
  openCourseDispute,
  requestCourseRefund,
  startCourseCheckout
} from "../api/coursePayments";
import { submitReport, exportCourseSales } from "../api/reports";
import PersonalFeedPlacement from "@/components/feed/PersonalFeedPlacement";
import AuthorizedCourseImage from "@/components/learning/AuthorizedCourseImage";
import LessonMediaCard from "@/components/learning/LessonMediaCard";
import PublicShareActions from "@/components/sharing/PublicShareActions";
import { listPersonalGrows } from "@/api/grows";
import { createPersonalTask } from "@/api/tasks";
import { getCourseMediaAccessUrl, openCourseMedia } from "@/api/uploads";
import { useAuth } from "@/auth/AuthContext";
import { useEntitlements } from "@/entitlements";
import { getLearningAccess } from "@/features/learning/learningAccess";
import { lessonDocumentUrls, lessonHasMedia } from "@/features/learning/lessonMedia";
import { useAppTheme } from "../theme/appTheme";
import { radius } from "../theme/theme";
import { resolveImageUri } from "../utils/photoUploads";

function rowId(row) {
  return String(row?._id || row?.id || "");
}

export function isCommercialManagedCourse(course) {
  return (
    String(course?.sourceType || "").toLowerCase() === "commercial_course" ||
    String(course?.authoringSource || "").toLowerCase() === "commercial_record"
  );
}

export function isFacilityManagedCourse(course) {
  return (
    String(course?.sourceType || "").toLowerCase() === "facility_course" ||
    String(course?.authoringSource || "").toLowerCase() === "facility_workspace"
  );
}

function normalizeCourse(payload, fallback) {
  const next = payload?.course
    ? payload.course
    : payload?.data?.course
      ? payload.data.course
      : payload?.data && !Array.isArray(payload.data)
        ? payload.data
        : payload;
  return next ? { ...(fallback || {}), ...next } : fallback || null;
}

function normalizeList(payload, key) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.[key])) return payload[key];
  if (Array.isArray(payload?.data?.[key])) return payload.data[key];
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function coursePrice(course) {
  const cents = Number(course?.priceCents || 0);
  if (cents > 0) return `$${(cents / 100).toFixed(2)}`;
  const price = Number(course?.price || 0);
  return price > 0 ? `$${price.toFixed(2)}` : "Free";
}

function facilityVisibilityOf(course) {
  const value = String(course?.visibility || "facilityOnly");
  return ["facilityOnly", "public", "unlisted"].includes(value) ? value : "facilityOnly";
}

function facilityVisibilityLabel(value) {
  if (value === "public") return "Public Catalog";
  if (value === "unlisted") return "Unlisted Link";
  return "Facility Only";
}

export function courseDetailImageSource(course, authorizedUrl = "") {
  const savedImage = resolveImageUri(
    authorizedUrl ||
      course?.bannerUrl ||
      course?.bannerImageUrl ||
      course?.coverImageUrl ||
      course?.coverImage ||
      course?.imageUrl ||
      course?.thumbnailUrl ||
      course?.thumbnail ||
      ""
  );
  return savedImage ? { uri: savedImage } : null;
}

function lessonTitle(lesson, index) {
  return String(lesson?.title || `Lesson ${index + 1}`);
}

function lessonImageUrls(lesson) {
  if (!Array.isArray(lesson?.imageUrls)) return [];
  return [
    ...new Set(lesson.imageUrls.map((url) => String(url || "").trim()).filter(Boolean))
  ];
}

async function openCheckoutUrl(url) {
  if (Platform.OS === "web" && typeof window !== "undefined" && window.location) {
    window.location.href = url;
    return;
  }
  await Linking.openURL(url);
}

/**
 * @param {{ route: any; navigation?: any; facilityWorkspace?: any }} props
 */
export default function CourseDetailScreen({
  route,
  navigation = null,
  facilityWorkspace = null
}) {
  const router = useRouter();
  const auth = useAuth();
  const entitlements = useEntitlements();
  const access = getLearningAccess(entitlements);
  const facilityMode = Boolean(facilityWorkspace);
  const genericFacilityLearnerMode = entitlements.mode === "facility" && !facilityMode;
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const initialCourse = route?.params?.course || null;
  const rawId = route?.params?.id || route?.params?.courseId || rowId(initialCourse);
  const courseId = String(rawId || "");
  const checkoutResult = String(route?.params?.checkout || "").toLowerCase();
  const checkoutHandledRef = useRef(false);

  const [course, setCourse] = useState(initialCourse);
  const [reviews, setReviews] = useState([]);
  const [enrollment, setEnrollment] = useState(null);
  const [facilityLearnerState, setFacilityLearnerState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [authorizedCover, setAuthorizedCover] = useState({ source: "", url: "" });
  const [activeLesson, setActiveLesson] = useState(null);
  const [reportReason, setReportReason] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [disputeReason, setDisputeReason] = useState("");
  const [salesRange, setSalesRange] = useState("last_30_days");
  const [courseFee, setCourseFee] = useState(() => {
    const cents = Number(initialCourse?.priceCents || 0);
    return cents > 0 ? (cents / 100).toFixed(2) : "";
  });
  const [liveReminderIds, setLiveReminderIds] = useState([]);
  const [liveRsvpIds, setLiveRsvpIds] = useState([]);
  const [learnerNotes, setLearnerNotes] = useState({});
  const [lessonNote, setLessonNote] = useState("");
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [lessonDeleteTarget, setLessonDeleteTarget] = useState("");
  const [facilityVisibility, setFacilityVisibility] = useState(() =>
    facilityVisibilityOf(initialCourse)
  );
  const loadedFacilityVisibility = facilityVisibilityOf(course);

  const loadedCourseId = rowId(course) || courseId;
  const lessons = useMemo(() => normalizeList(course?.lessons, "lessons"), [course]);
  const liveSessions = useMemo(
    () => normalizeList(course?.liveSessions, "liveSessions"),
    [course]
  );
  const documents = useMemo(
    () => normalizeList(course?.documents, "documents"),
    [course]
  );
  const mediaAssets = useMemo(
    () => normalizeList(course?.mediaAssets, "mediaAssets"),
    [course]
  );
  const activeLessonDocuments = useMemo(
    () => lessonDocumentUrls(activeLesson),
    [activeLesson]
  );
  const activeLessonImages = useMemo(() => lessonImageUrls(activeLesson), [activeLesson]);
  const currentCoverSource = courseDetailImageSource(course)?.uri || "";
  const currentAuthorizedCoverUrl =
    currentCoverSource && authorizedCover.source === currentCoverSource
      ? authorizedCover.url
      : "";
  const completedLessonIds = useMemo(
    () =>
      new Set(
        normalizeList(
          facilityMode
            ? facilityLearnerState?.completedLessonIds
            : enrollment?.progress?.completedLessonIds ||
                enrollment?.completedLessonIds ||
                enrollment?.enrollment?.completedLessonIds,
          "completedLessonIds"
        ).map(String)
      ),
    [enrollment, facilityLearnerState, facilityMode]
  );
  const completedLessonCount = completedLessonIds.size;
  const enrolled = Boolean(
    enrollment?.enrolled ||
    enrollment?.isEnrolled ||
    course?.isEnrolled ||
    course?.enrolled
  );
  const isPaidCourse =
    Number(course?.priceCents || course?.price || 0) > 0 ||
    Boolean(String(course?.stripePriceId || "").trim()) ||
    String(course?.access || "").toLowerCase() === "paid";
  const paymentStatus =
    enrollment?.paymentStatus ||
    enrollment?.checkoutStatus ||
    enrollment?.status ||
    "not_started";
  const normalizedPaymentStatus = String(paymentStatus).toLowerCase();
  const refundStatus = String(enrollment?.refundStatus || "none").toLowerCase();
  const refundRequestStatus = String(
    enrollment?.refundRequestStatus ||
      (refundStatus === "requested" ? "requested" : "none")
  ).toLowerCase();
  const disputeStatus = String(enrollment?.disputeStatus || "none").toLowerCase();
  const disputeReportStatus = String(
    enrollment?.disputeReportStatus || "none"
  ).toLowerCase();
  const viewerId = String(auth.user?._id || auth.user?.id || "");
  const ownerId = String(
    course?.userId ||
      course?.creatorId ||
      course?.authorId ||
      course?.creator?._id ||
      course?.creator?.id ||
      ""
  );
  const ownsCourse = Boolean(
    course?._viewerOwnsCourse || (viewerId && ownerId === viewerId)
  );
  const commercialManagedCourse = isCommercialManagedCourse(course);
  const facilityManagedCourse = isFacilityManagedCourse(course);
  const courseFacilityId = String(
    course?.facilityId?._id || course?.facilityId?.id || course?.facilityId || ""
  );
  const facilityScopeMatches = Boolean(
    facilityMode &&
    facilityManagedCourse &&
    facilityWorkspace?.facilityId &&
    courseFacilityId === String(facilityWorkspace.facilityId)
  );
  const facilityPermissions = facilityScopeMatches ? course?.permissions || {} : {};
  const workspaceOwnsCourse =
    facilityScopeMatches || (!facilityManagedCourse && ownsCourse);
  const canManageNativeCourse =
    !facilityMode &&
    !genericFacilityLearnerMode &&
    ownsCourse &&
    !commercialManagedCourse &&
    !facilityManagedCourse;
  const canManageCoursePricing = facilityMode
    ? facilityPermissions.canSetPrice === true
    : canManageNativeCourse;
  const canManageLessons = facilityMode
    ? facilityPermissions.canEditLessons === true
    : !genericFacilityLearnerMode &&
      !commercialManagedCourse &&
      !facilityManagedCourse &&
      access.canCreateCourses;
  const canPublishManagedCourse = facilityMode
    ? course?.isPublished
      ? facilityPermissions.canUnpublish === true
      : facilityPermissions.canPublish === true
    : canManageNativeCourse && access.canPublishCourses;
  const canArchiveManagedCourse = facilityMode
    ? facilityPermissions.canArchive === true
    : canManageNativeCourse;
  const maxLessonsPerCourse = facilityMode
    ? (facilityWorkspace?.limits?.maxLessonsPerCourse ?? null)
    : access.maxLessonsPerCourse;
  const hasPaidPurchase =
    isPaidCourse &&
    (enrolled ||
      ["paid", "refunded", "disputed"].includes(normalizedPaymentStatus) ||
      refundStatus !== "none" ||
      refundRequestStatus !== "none" ||
      disputeStatus !== "none" ||
      disputeReportStatus !== "none");
  const canOpenLessons = facilityMode
    ? facilityScopeMatches
    : !isPaidCourse ||
      workspaceOwnsCourse ||
      enrolled ||
      course?._viewerHasAccess === true;
  const learnerActionsAvailable = facilityMode
    ? Boolean(course?.isPublished && facilityLearnerState?.accessSource)
    : canOpenLessons;
  const canRequestRefund =
    Boolean(enrollment?.recordId) &&
    refundRequestStatus !== "requested" &&
    refundStatus !== "refunded" &&
    enrollment?.refundLifecycleStatus !== "full";
  const canReportPaymentIssue =
    Boolean(enrollment?.recordId) &&
    !["reported", "resolved", "declined", "closed"].includes(disputeReportStatus);

  useEffect(() => {
    const cents = Number(course?.priceCents || 0);
    setCourseFee(cents > 0 ? (cents / 100).toFixed(2) : "");
  }, [course?.priceCents]);

  useEffect(() => {
    setFacilityVisibility(loadedFacilityVisibility);
  }, [loadedFacilityVisibility]);

  useEffect(() => {
    let active = true;
    const source = courseDetailImageSource(course)?.uri || "";
    if (!source) {
      return () => {
        active = false;
      };
    }
    getCourseMediaAccessUrl(source)
      .then((url) => {
        if (active) setAuthorizedCover({ source, url });
      })
      .catch(() => {
        if (active) setAuthorizedCover({ source, url: "" });
      });
    return () => {
      active = false;
    };
  }, [course]);

  const load = useCallback(async () => {
    if (!facilityMode && !access.canViewCourses) {
      setLoading(false);
      return;
    }
    if (!courseId && !initialCourse) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setFeedback("");
    if (facilityMode) {
      setFacilityLearnerState(null);
      setLiveRsvpIds([]);
      setLearnerNotes({});
      setActiveLesson(null);
    }
    try {
      const id = courseId || rowId(initialCourse);
      if (facilityMode) {
        if (id && typeof facilityWorkspace?.api?.get !== "function") {
          throw new Error("Facility course loading is unavailable.");
        }
        const courseResponse = id
          ? await facilityWorkspace?.api?.get?.(id)
          : initialCourse;
        const nextCourse = normalizeCourse(courseResponse, initialCourse);
        if (!nextCourse) throw new Error("Unable to load course.");
        let nextLearnerState = null;
        if (nextCourse.isPublished) {
          if (typeof facilityWorkspace?.api?.getLearnerState !== "function") {
            throw new Error("Facility course learner access is unavailable.");
          }
          nextLearnerState = await facilityWorkspace.api.getLearnerState(
            rowId(nextCourse) || id
          );
        }
        setCourse(nextCourse);
        setEnrollment(null);
        setReviews([]);
        setFacilityLearnerState(nextLearnerState);
        setLiveRsvpIds(nextLearnerState?.activeRsvpSourceSessionIds || []);
        setLearnerNotes(
          Object.fromEntries(
            normalizeList(nextLearnerState, "notes").map((item) => [
              String(item.lessonId),
              item.note
            ])
          )
        );
        return;
      }
      const [
        courseResponse,
        statusResponse,
        paymentResponse,
        reviewsResponse,
        notesResponse
      ] = await Promise.all([
        id
          ? facilityMode
            ? facilityWorkspace?.api?.get?.(id)
            : getCourse(id)
          : Promise.resolve(initialCourse),
        id ? getEnrollmentStatus(id).catch(() => null) : Promise.resolve(null),
        id ? getCoursePaymentStatus(id).catch(() => null) : Promise.resolve(null),
        id ? getReviews(id).catch(() => []) : Promise.resolve([]),
        id ? getCourseLearnerNotes(id).catch(() => null) : Promise.resolve(null)
      ]);
      setCourse(normalizeCourse(courseResponse, initialCourse));
      setFacilityLearnerState(null);
      setEnrollment({
        ...(paymentResponse || {}),
        ...(statusResponse?.data || statusResponse || {})
      });
      setReviews(normalizeList(reviewsResponse, "reviews"));
      const noteRows = normalizeList(notesResponse, "notes");
      setLearnerNotes(
        Object.fromEntries(noteRows.map((item) => [String(item.lessonId), item.note]))
      );
    } catch (error) {
      if (facilityMode) setCourse(null);
      setFeedback(error?.message || "Unable to load course.");
    } finally {
      setLoading(false);
    }
  }, [access.canViewCourses, courseId, facilityMode, facilityWorkspace, initialCourse]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (loadedCourseId) trackCourseView(loadedCourseId).catch(() => null);
  }, [loadedCourseId]);

  useEffect(() => {
    if (!loadedCourseId || facilityMode) return;
    let alive = true;
    apiRequest(`/api/courses/${encodeURIComponent(loadedCourseId)}/live-rsvps`)
      .then((response) => {
        if (alive) setLiveRsvpIds(response?.sessionIds || []);
      })
      .catch(() => null);
    return () => {
      alive = false;
    };
  }, [facilityMode, loadedCourseId]);

  const refreshPaymentStatus = useCallback(async () => {
    if (!loadedCourseId || facilityMode) return null;
    try {
      const [payment, status] = await Promise.all([
        getCoursePaymentStatus(loadedCourseId).catch(() => null),
        getEnrollmentStatus(loadedCourseId).catch(() => null)
      ]);
      const next = {
        ...(payment || {}),
        ...(status?.data || status || {})
      };
      setEnrollment(next);
      return next;
    } catch (error) {
      setFeedback(error?.message || "Unable to refresh payment status.");
      return null;
    }
  }, [facilityMode, loadedCourseId]);

  useEffect(() => {
    if (facilityMode || loading || checkoutHandledRef.current || !checkoutResult) return;
    checkoutHandledRef.current = true;
    if (checkoutResult === "canceled") {
      setFeedback("Checkout was canceled. No course access was changed.");
      return;
    }
    if (checkoutResult !== "success") return;
    void (async () => {
      const next = await refreshPaymentStatus();
      const confirmed = Boolean(next?.enrolled || next?.isEnrolled);
      setFeedback(
        confirmed
          ? "Payment confirmed. This course is unlocked."
          : "Payment submitted. Stripe confirmation is still processing; refresh status in a moment."
      );
    })();
  }, [checkoutResult, facilityMode, loading, refreshPaymentStatus]);

  async function enroll() {
    if (!loadedCourseId || facilityMode) return;
    setSaving(true);
    setFeedback("");
    try {
      if (isPaidCourse) {
        const checkout = await startCourseCheckout(loadedCourseId);
        const url = checkout?.url || checkout?.checkoutUrl || checkout?.data?.url;
        if (!url) {
          setFeedback("Checkout unavailable. The backend did not return a checkout URL.");
          return;
        }
        await openCheckoutUrl(url);
        setFeedback(
          "Checkout started. Access unlocks only after the backend confirms the webhook and enrollment status."
        );
        await refreshPaymentStatus();
      } else {
        await enrollInCourse(loadedCourseId);
        setFeedback("Enrollment requested. Waiting for backend confirmation.");
        await refreshPaymentStatus();
      }
    } catch (error) {
      setFeedback(error?.message || "Unable to start enrollment.");
    } finally {
      setSaving(false);
    }
  }

  async function saveCourseFee() {
    if (
      !loadedCourseId ||
      !canManageCoursePricing ||
      (facilityMode && typeof facilityWorkspace?.api?.update !== "function") ||
      (!facilityMode && !access.canSellPaidCourses)
    )
      return;
    const numeric = Number(courseFee);
    if (!Number.isFinite(numeric) || numeric < 0) {
      setFeedback("Enter a valid course fee of $0.00 or more.");
      return;
    }
    const cents = Math.round(numeric * 100);
    if (facilityMode && cents > 0 && facilityVisibility === "facilityOnly") {
      setFeedback(
        "Choose Public Catalog or Unlisted Link before setting a paid Facility course fee."
      );
      return;
    }
    setSaving(true);
    setFeedback("");
    try {
      const updatePayload = {
        priceCents: cents,
        price: cents / 100,
        currency: "usd",
        access: cents > 0 ? "paid" : "free",
        ...(facilityMode ? { visibility: facilityVisibility } : {})
      };
      const updated = facilityMode
        ? await facilityWorkspace.api.update(loadedCourseId, updatePayload)
        : await updateCourse(loadedCourseId, updatePayload);
      setCourse((current) => ({
        ...current,
        ...normalizeCourse(updated, current),
        _viewerOwnsCourse: true,
        priceCents: cents,
        price: cents / 100,
        access: cents > 0 ? "paid" : "free",
        ...(facilityMode ? { visibility: facilityVisibility } : {})
      }));
      setFeedback(
        `Course fee saved: ${cents > 0 ? `$${(cents / 100).toFixed(2)}` : "Free"}.`
      );
    } catch (error) {
      setFeedback(error?.message || "Unable to save the course fee.");
    } finally {
      setSaving(false);
    }
  }

  async function openLesson(lesson) {
    const id = rowId(lesson);
    if (id) await trackLessonView(id).catch(() => null);
    if (navigation?.navigate) {
      navigation.navigate("Lesson", {
        lesson,
        courseId: loadedCourseId,
        facilityManagedCourse
      });
      return;
    }
    setActiveLesson(lesson);
    setLessonNote(learnerNotes[id] || "");
  }

  function applyFacilityLearnerState(nextState) {
    setFacilityLearnerState(nextState || null);
    setLiveRsvpIds(nextState?.activeRsvpSourceSessionIds || []);
    setLearnerNotes(
      Object.fromEntries(
        normalizeList(nextState, "notes").map((item) => [
          String(item.lessonId),
          item.note
        ])
      )
    );
  }

  async function saveLessonNote() {
    const lessonId = rowId(activeLesson);
    if (!loadedCourseId || !lessonId || !learnerActionsAvailable) return;
    setSaving(true);
    try {
      if (facilityMode) {
        if (typeof facilityWorkspace?.api?.saveLearnerNote !== "function") {
          throw new Error("Facility course notes are unavailable.");
        }
        const next = await facilityWorkspace.api.saveLearnerNote(
          loadedCourseId,
          lessonId,
          lessonNote
        );
        applyFacilityLearnerState(next);
      } else {
        await saveCourseLearnerNote(loadedCourseId, lessonId, lessonNote);
        setLearnerNotes((current) => ({
          ...current,
          [lessonId]: lessonNote.trim()
        }));
      }
      setFeedback(
        lessonNote.trim() ? "Private lesson note saved." : "Lesson note removed."
      );
    } catch (error) {
      setFeedback(error?.message || "Unable to save the lesson note.");
    } finally {
      setSaving(false);
    }
  }

  function askAIAboutCourse() {
    const lessonId = rowId(activeLesson);
    const query = new URLSearchParams({
      preset: "course",
      courseId: loadedCourseId,
      ...(lessonId ? { lessonId } : {}),
      prompt: `Help me understand ${activeLesson?.title || course?.title || "this course"}`
    }).toString();
    const path =
      entitlements.mode === "facility"
        ? `/home/facility/ai-ask?${query}`
        : entitlements.mode === "commercial"
          ? `/home/commercial/tools/ask-ai?${query}`
          : `/home/personal/ai?${query}`;
    router.push(path);
  }

  async function openRelatedProduct(productId) {
    if (loadedCourseId) {
      await trackCourseProductClick(loadedCourseId, productId).catch(() => null);
    }
    router.push(`/home/commercial/products/${encodeURIComponent(String(productId))}`);
  }

  async function createLessonTask() {
    if (!activeLesson || !loadedCourseId) return;
    setSaving(true);
    try {
      const grows = await listPersonalGrows();
      const grow = grows.find((item) => item?.status === "active") || grows[0];
      const growId = rowId(grow);
      if (!growId) {
        setFeedback("Create or select a grow before adding this lesson task.");
        return;
      }
      await createPersonalTask({
        growId,
        linkedGrowId: growId,
        linkedCourseId: loadedCourseId,
        linkedCourseAssignmentId: rowId(activeLesson),
        linkedLessonId: rowId(activeLesson),
        title: activeLesson?.taskTemplate?.title || `Course: ${activeLesson.title}`,
        description:
          activeLesson?.taskTemplate?.description ||
          activeLesson?.assignmentPrompt ||
          "Complete this course lesson assignment.",
        priority: activeLesson?.taskTemplate?.priority || "medium",
        sourceType: "course_assignment",
        sourceObjectId: rowId(activeLesson)
      });
      setFeedback("Lesson task added to your grow workspace.");
    } catch (error) {
      setFeedback(error?.message || "Unable to create the lesson task.");
    } finally {
      setSaving(false);
    }
  }

  async function markLessonComplete(lesson) {
    const id = rowId(lesson);
    if (!id || !loadedCourseId || !learnerActionsAvailable) return;
    setSaving(true);
    try {
      if (facilityMode) {
        if (typeof facilityWorkspace?.api?.completeLesson !== "function") {
          throw new Error("Facility course progress is unavailable.");
        }
        applyFacilityLearnerState(
          await facilityWorkspace.api.completeLesson(loadedCourseId, id)
        );
      } else {
        await completeLesson(id, loadedCourseId);
      }
      await sendWatchTime(id, Number(lesson?.durationSeconds || 0)).catch(() => null);
      setFeedback("Lesson marked complete.");
      setActiveLesson(null);
      if (!facilityMode) await load();
    } catch (error) {
      setFeedback(error?.message || "Unable to complete lesson.");
    } finally {
      setSaving(false);
    }
  }

  async function publishCurrentCourse() {
    if (!loadedCourseId || !canPublishManagedCourse) return;
    if (facilityMode && isPaidCourse && facilityVisibility === "facilityOnly") {
      setFeedback(
        "A paid Facility course must use Public Catalog or Unlisted Link before publishing."
      );
      return;
    }
    setSaving(true);
    try {
      if (facilityMode) {
        if (typeof facilityWorkspace?.api?.publish !== "function") {
          throw new Error("Facility course publishing is unavailable.");
        }
        await facilityWorkspace.api.publish(loadedCourseId, {
          visibility: facilityVisibility
        });
      } else {
        await publishCourse(loadedCourseId);
      }
      setFeedback("Course published.");
      await load();
    } catch (error) {
      setFeedback(error?.message || "Unable to publish course.");
    } finally {
      setSaving(false);
    }
  }

  async function unpublishCurrentCourse() {
    if (!loadedCourseId || !canPublishManagedCourse) return;
    setSaving(true);
    try {
      if (facilityMode) {
        if (typeof facilityWorkspace?.api?.unpublish !== "function") {
          throw new Error("Facility course unpublishing is unavailable.");
        }
        await facilityWorkspace.api.unpublish(loadedCourseId);
      } else {
        await unpublishCourse(loadedCourseId);
      }
      setFeedback("Course unpublished and returned to a private draft.");
      await load();
    } catch (error) {
      setFeedback(error?.message || "Unable to unpublish course.");
    } finally {
      setSaving(false);
    }
  }

  async function archiveCurrentCourse() {
    if (!loadedCourseId || course?.isPublished || !canArchiveManagedCourse) return;
    setSaving(true);
    try {
      if (facilityMode) {
        if (typeof facilityWorkspace?.api?.archive !== "function") {
          throw new Error("Facility course archiving is unavailable.");
        }
        await facilityWorkspace.api.archive(loadedCourseId);
      } else {
        await archiveCourse(loadedCourseId);
      }
      setArchiveConfirmOpen(false);
      setFeedback("Course archived. Returning to your active courses.");
      router.replace?.(
        facilityMode ? "/home/facility/courses" : "/home/personal/courses"
      );
    } catch (error) {
      setFeedback(error?.message || "Unable to archive course.");
    } finally {
      setSaving(false);
    }
  }

  async function saveFacilityVisibility() {
    if (
      !loadedCourseId ||
      !facilityScopeMatches ||
      course?.isPublished ||
      facilityPermissions.canEditCourse !== true ||
      typeof facilityWorkspace?.api?.update !== "function"
    )
      return;
    if (isPaidCourse && facilityVisibility === "facilityOnly") {
      setFeedback("A paid Facility course must use Public Catalog or Unlisted Link.");
      return;
    }
    setSaving(true);
    setFeedback("");
    try {
      const updated = await facilityWorkspace.api.update(loadedCourseId, {
        visibility: facilityVisibility
      });
      setCourse((current) => ({
        ...current,
        ...normalizeCourse(updated, current),
        visibility: facilityVisibility,
        _viewerOwnsCourse: true
      }));
      setFeedback(
        `Facility course audience saved: ${facilityVisibilityLabel(facilityVisibility)}.`
      );
    } catch (error) {
      setFeedback(error?.message || "Unable to save the Facility course audience.");
    } finally {
      setSaving(false);
    }
  }

  async function reportCourse() {
    if (!loadedCourseId || !reportReason.trim()) return;
    setSaving(true);
    try {
      await submitReport({
        contentType: "course",
        contentId: loadedCourseId,
        contentTitle: course?.title || course?.name || "Course",
        targetUrl: `/courses?courseId=${encodeURIComponent(loadedCourseId)}`,
        reason: reportReason.trim()
      });
      setReportReason("");
      setFeedback("Report submitted.");
    } catch (error) {
      setFeedback(error?.message || "Unable to submit report.");
    } finally {
      setSaving(false);
    }
  }

  async function submitRefund() {
    if (!loadedCourseId || !refundReason.trim()) return;
    setSaving(true);
    try {
      await requestCourseRefund(loadedCourseId, {
        recordId: String(enrollment?.recordId || ""),
        expectedRefundedAmountCents: Number(enrollment?.refundedAmountCents || 0),
        reason: refundReason.trim()
      });
      setRefundReason("");
      setFeedback(
        "Refund request submitted. Final state comes from backend payment status."
      );
      await refreshPaymentStatus();
    } catch (error) {
      setFeedback(error?.message || "Unable to request refund.");
    } finally {
      setSaving(false);
    }
  }

  async function submitDispute() {
    if (!loadedCourseId || !disputeReason.trim()) return;
    setSaving(true);
    try {
      await openCourseDispute(loadedCourseId, {
        recordId: String(enrollment?.recordId || ""),
        expectedRefundedAmountCents: Number(enrollment?.refundedAmountCents || 0),
        reason: disputeReason.trim()
      });
      setDisputeReason("");
      setFeedback(
        "Payment issue sent to GrowPath support. This does not open a bank or card dispute."
      );
      await refreshPaymentStatus();
    } catch (error) {
      setFeedback(error?.message || "Unable to report the payment issue.");
    } finally {
      setSaving(false);
    }
  }

  async function exportSales() {
    if (!loadedCourseId) return;
    setSaving(true);
    try {
      const response = await exportCourseSales({
        range: salesRange,
        courseId: loadedCourseId
      });
      const url = response?.url || response?.data?.url;
      if (url) await Linking.openURL(url);
      setFeedback("Course sales report requested.");
    } catch (error) {
      setFeedback(error?.message || "Unable to export sales report.");
    } finally {
      setSaving(false);
    }
  }

  async function openCourseResource(url, options = {}) {
    setFeedback("");
    try {
      await openCourseMedia(url, options);
    } catch (error) {
      setFeedback(error?.message || "Unable to open this course resource.");
    }
  }

  async function addLiveReminder(session, index) {
    const sessionKey = rowId(session) || `${session?.scheduledStart || "live"}-${index}`;
    if (!session?.scheduledStart || liveReminderIds.includes(sessionKey)) return;
    setSaving(true);
    setFeedback("");
    try {
      const grows = await listPersonalGrows();
      const grow =
        grows.find(
          (item) => String(item?.status || "active").toLowerCase() === "active"
        ) || grows[0];
      const growId = String(grow?.id || grow?._id || "");
      if (!growId) {
        setFeedback("Create a grow first so the live reminder has a task workspace.");
        return;
      }
      const watchUrl = String(
        session?.watchUrl ||
          session?.meetingUrl ||
          (session?.twitchChannel ? `https://www.twitch.tv/${session.twitchChannel}` : "")
      );
      const task = await createPersonalTask({
        growId,
        linkedGrowId: growId,
        linkedCourseId: loadedCourseId,
        linkedLiveId: sessionKey,
        actionUrl: watchUrl || null,
        title: `Watch live: ${String(session?.title || course?.title || "Course session")}`,
        description: [
          String(session?.description || "Scheduled course live session."),
          watchUrl ? `Watch: ${watchUrl}` : ""
        ]
          .filter(Boolean)
          .join("\n"),
        dueDate: String(session.scheduledStart),
        endAt: session?.scheduledEnd || null,
        allDay: false,
        priority: "high",
        calendarType: "live_session",
        sourceType: "course_live_reminder",
        sourceObjectId: loadedCourseId,
        reminderPlan: session?.reminderPlan || {
          label: "1 hour before",
          channels: ["in_app"]
        }
      });
      if (!task) throw new Error("The reminder task could not be saved.");
      setLiveReminderIds((current) => [...current, sessionKey]);
      setFeedback("Live-session reminder added to My Tasks and Calendar.");
    } catch (error) {
      setFeedback(error?.message || "Unable to create the live reminder task.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleLiveRsvp(session, index) {
    const sourceSessionId = String(session?.sourceSessionId || "").trim();
    const sessionKey = facilityMode
      ? sourceSessionId
      : rowId(session) || `${session?.scheduledStart || "live"}-${index}`;
    if (!loadedCourseId || !sessionKey || saving || !learnerActionsAvailable) return;
    const isRsvped = liveRsvpIds.includes(sessionKey);
    setSaving(true);
    setFeedback("");
    try {
      if (facilityMode) {
        const action = isRsvped
          ? facilityWorkspace?.api?.cancelLiveRsvp
          : facilityWorkspace?.api?.rsvpLive;
        if (typeof action !== "function") {
          throw new Error("Facility course Live RSVP is unavailable.");
        }
        applyFacilityLearnerState(await action(loadedCourseId, sourceSessionId));
      } else {
        await apiRequest(
          `/api/courses/${encodeURIComponent(loadedCourseId)}/lives/${encodeURIComponent(sessionKey)}/rsvp`,
          {
            method: isRsvped ? "DELETE" : "POST",
            body: isRsvped
              ? undefined
              : {
                  reminderPlan: session?.reminderPlan || {
                    label: "1 hour before",
                    channels: ["in_app"]
                  }
                }
          }
        );
        setLiveRsvpIds((current) =>
          isRsvped ? current.filter((id) => id !== sessionKey) : [...current, sessionKey]
        );
      }
      setFeedback(
        isRsvped
          ? "Live RSVP canceled. The course event remains visible on your calendar."
          : "You are going. GrowPath will keep this live in your course calendar and reminder center."
      );
    } catch (error) {
      setFeedback(error?.message || "Unable to update the live RSVP.");
    } finally {
      setSaving(false);
    }
  }

  function addLesson() {
    if (!loadedCourseId || !canManageLessons) return;
    if (!navigation?.navigate) {
      router.push(
        facilityMode
          ? `/home/facility/courses?action=add-lesson&courseId=${encodeURIComponent(loadedCourseId)}`
          : `/courses/add-lesson?courseId=${encodeURIComponent(loadedCourseId)}&from=${encodeURIComponent("/home/personal/courses")}`
      );
      return;
    }
    navigation.navigate("AddLesson", { courseId: loadedCourseId });
  }

  function editLesson(lesson) {
    const id = rowId(lesson);
    if (!id || !loadedCourseId) return;
    if (navigation?.navigate) {
      navigation.navigate("EditLesson", { lessonId: id, lesson });
      return;
    }
    const returnHref = facilityMode
      ? `/home/facility/courses?courseId=${encodeURIComponent(loadedCourseId)}`
      : `/courses?courseId=${encodeURIComponent(loadedCourseId)}`;
    router.push(
      facilityMode
        ? `/home/facility/courses?action=edit-lesson&lessonId=${encodeURIComponent(id)}&courseId=${encodeURIComponent(loadedCourseId)}`
        : `/courses/edit-lesson?lessonId=${encodeURIComponent(id)}&courseId=${encodeURIComponent(loadedCourseId)}&from=${encodeURIComponent(returnHref)}`
    );
  }

  async function deleteFacilityLesson(lesson) {
    const lessonId = rowId(lesson);
    if (
      !facilityMode ||
      !loadedCourseId ||
      !lessonId ||
      course?.isPublished ||
      !canManageLessons ||
      typeof facilityWorkspace?.api?.deleteLesson !== "function"
    ) {
      return;
    }
    setSaving(true);
    setFeedback("");
    try {
      const updated = await facilityWorkspace.api.deleteLesson(loadedCourseId, lessonId);
      setCourse((current) => normalizeCourse(updated, current));
      if (rowId(activeLesson) === lessonId) setActiveLesson(null);
      setLessonDeleteTarget("");
      setFeedback("Lesson deleted from this draft course.");
    } catch (error) {
      setFeedback(error?.message || "Unable to delete the lesson.");
    } finally {
      setSaving(false);
    }
  }

  if (!facilityMode && !access.canViewCourses) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Course unavailable</Text>
        {!facilityMode ? (
          <PersonalFeedPlacement placement="top" routeKey="personal_course_detail" />
        ) : null}
        <Text style={styles.meta}>This account does not have `COURSES_VIEW`.</Text>
        {!facilityMode ? (
          <PersonalFeedPlacement placement="bottom" routeKey="personal_course_detail" />
        ) : null}
      </ScrollView>
    );
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={palette.accent} />
        <Text style={styles.meta}>Loading course...</Text>
      </View>
    );
  }

  if (!course) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Course unavailable</Text>
        {feedback ? <Text style={styles.meta}>{feedback}</Text> : null}
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{course?.title || course?.name || "Course"}</Text>
      {!facilityMode ? (
        <PersonalFeedPlacement
          placement="top"
          routeKey="personal_course_detail"
          longContent
        />
      ) : null}
      <Text style={styles.meta}>
        {coursePrice(course)} |{" "}
        {course?.status || (course?.isPublished ? "published" : "draft")}
      </Text>
      {courseDetailImageSource(course, currentAuthorizedCoverUrl) ? (
        <Image
          accessibilityLabel={`${String(course?.title || course?.name || "Course")} full course image`}
          resizeMode="cover"
          source={courseDetailImageSource(course, currentAuthorizedCoverUrl)}
          style={styles.courseHeroImage}
        />
      ) : null}
      {course?.summary || course?.description ? (
        <Text style={styles.body}>{course.summary || course.description}</Text>
      ) : null}
      {course?.isPublished &&
      loadedCourseId &&
      (!facilityManagedCourse || facilityVisibility !== "facilityOnly") ? (
        <PublicShareActions
          title={course?.title || course?.name || "GrowPath course"}
          path={`/courses?courseId=${encodeURIComponent(loadedCourseId)}`}
          description={course?.summary || course?.description}
          heading="Share this course"
          socialPreviewUrl={course?.socialPreviewUrl}
        />
      ) : null}
      {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}

      {ownsCourse && commercialManagedCourse && loadedCourseId ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Commercial course management</Text>
          <Text style={styles.meta}>
            Pricing, lessons, resources, publishing, and archiving for this course are
            managed in your Commercial workspace.
          </Text>
          <Pressable
            onPress={() =>
              router.push(
                `/home/commercial/courses/${encodeURIComponent(loadedCourseId)}`
              )
            }
            style={styles.primaryBtn}
            accessibilityRole="button"
            accessibilityLabel="Manage course in Commercial workspace"
          >
            <Text style={styles.primaryText}>Manage in Commercial Workspace</Text>
          </Pressable>
        </View>
      ) : null}

      {facilityScopeMatches && loadedCourseId ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Facility workspace course</Text>
          <Text style={styles.meta}>
            This course and its authoring actions stay bound to the selected Facility.
            Your server-verified workspace permissions control the actions shown below.
          </Text>
          <Text style={styles.meta}>
            Audience: {facilityVisibilityLabel(facilityVisibility)}
          </Text>
          <Text style={styles.meta}>
            Paid-course payout readiness uses the Facility business owner configured by
            the server. Staff and viewers are never prompted to connect a personal Stripe
            payout account here.
          </Text>
          {course?.isPublished && facilityLearnerState?.included ? (
            <Text style={styles.badge}>Included with Facility workspace</Text>
          ) : null}
        </View>
      ) : null}

      {facilityScopeMatches &&
      !course?.isPublished &&
      facilityPermissions.canEditCourse === true ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Facility course audience</Text>
          <Text style={styles.meta}>
            Facility Only keeps training inside this workspace. Public Catalog lists it
            for discovery. Unlisted Link allows access through the direct link. Paid
            courses cannot use Facility Only.
          </Text>
          <View
            style={styles.actions}
            accessibilityRole="radiogroup"
            accessibilityLabel="Facility course audience"
          >
            {[
              ["facilityOnly", "Facility Only"],
              ["public", "Public Catalog"],
              ["unlisted", "Unlisted Link"]
            ].map(([value, label]) => (
              <Pressable
                key={value}
                disabled={saving}
                onPress={() => setFacilityVisibility(value)}
                accessibilityRole="radio"
                aria-checked={facilityVisibility === value}
                accessibilityState={{ checked: facilityVisibility === value }}
                accessibilityLabel={`Set course audience to ${label}`}
                style={
                  facilityVisibility === value ? styles.primaryBtn : styles.secondaryBtn
                }
              >
                <Text
                  style={
                    facilityVisibility === value
                      ? styles.primaryText
                      : styles.secondaryText
                  }
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            disabled={saving}
            onPress={saveFacilityVisibility}
            style={[styles.secondaryBtn, saving && styles.disabled]}
            accessibilityRole="button"
            accessibilityLabel="Save Facility course audience"
          >
            <Text style={styles.secondaryText}>
              {saving ? "Saving..." : "Save Audience"}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {canManageCoursePricing ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {facilityMode ? "Facility course pricing" : "Creator pricing"}
          </Text>
          {facilityMode || access.canSellPaidCourses ? (
            <>
              <Text style={styles.meta}>
                Enter 0.00 for a free course or set the learner fee in USD.
              </Text>
              <TextInput
                value={courseFee}
                onChangeText={setCourseFee}
                placeholder="0.00"
                placeholderTextColor={palette.textMuted}
                keyboardType="decimal-pad"
                editable={!saving}
                style={styles.input}
                accessibilityLabel="Edit course price USD"
              />
              <Pressable
                disabled={saving}
                onPress={saveCourseFee}
                style={[styles.primaryBtn, saving && styles.disabled]}
                accessibilityRole="button"
                accessibilityLabel="Save course fee"
              >
                <Text style={styles.primaryText}>
                  {saving ? "Saving..." : "Save Course Fee"}
                </Text>
              </Pressable>
            </>
          ) : (
            <Text style={styles.meta}>
              Paid course sales are available on Free. Refresh access or contact support.
            </Text>
          )}
        </View>
      ) : facilityMode ? null : !workspaceOwnsCourse && !enrolled ? (
        <Pressable disabled={saving} onPress={enroll} style={styles.primaryBtn}>
          <Text style={styles.primaryText}>
            {saving ? "Saving..." : isPaidCourse ? "Start Checkout" : "Enroll"}
          </Text>
        </Pressable>
      ) : (
        <Text style={styles.badge}>Enrolled</Text>
      )}
      {!facilityMode && !workspaceOwnsCourse && isPaidCourse ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Purchase Status</Text>
          <Text style={styles.meta}>
            Enrollment: {enrolled ? "confirmed" : "not confirmed"}
          </Text>
          <Text style={styles.meta}>Payment: {String(paymentStatus)}</Text>
          <Text style={styles.meta}>Refund: {refundStatus}</Text>
          <Text style={styles.meta}>
            Payment support: {disputeReportStatus} · provider dispute: {disputeStatus}
          </Text>
          {!hasPaidPurchase ? (
            <Text style={styles.meta}>
              No completed payment is recorded for this course.
            </Text>
          ) : null}
          <Pressable
            disabled={saving}
            onPress={refreshPaymentStatus}
            style={styles.secondaryBtn}
          >
            <Text style={styles.secondaryText}>Refresh Status</Text>
          </Pressable>
        </View>
      ) : null}

      {!facilityMode || learnerActionsAvailable ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your progress</Text>
          <Text style={styles.meta} accessibilityLabel="Course lesson progress">
            {completedLessonCount} of {lessons.length} lessons complete
          </Text>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${lessons.length ? Math.round((completedLessonCount / lessons.length) * 100) : 0}%`
                }
              ]}
            />
          </View>
          <Pressable onPress={askAIAboutCourse} style={styles.secondaryBtn}>
            <Text style={styles.secondaryText}>Ask AI About This Course</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Lessons</Text>
          {canManageLessons ? (
            <Text style={styles.meta}>
              {maxLessonsPerCourse === null
                ? "Unlimited"
                : `${lessons.length}/${maxLessonsPerCourse}`}
            </Text>
          ) : null}
        </View>
        {canManageLessons ? (
          <Pressable
            disabled={
              maxLessonsPerCourse !== null && lessons.length >= maxLessonsPerCourse
            }
            onPress={addLesson}
            accessibilityRole="button"
            accessibilityLabel="Add course lesson"
            accessibilityState={{
              disabled:
                maxLessonsPerCourse !== null && lessons.length >= maxLessonsPerCourse
            }}
            style={[
              styles.secondaryBtn,
              maxLessonsPerCourse !== null &&
                lessons.length >= maxLessonsPerCourse &&
                styles.disabled
            ]}
          >
            <Text style={styles.secondaryText}>Add Lesson</Text>
          </Pressable>
        ) : null}
        {lessons.map((lesson, index) => (
          <View key={rowId(lesson) || lessonTitle(lesson, index)} style={styles.row}>
            <Text style={styles.rowTitle}>{lessonTitle(lesson, index)}</Text>
            {completedLessonIds.has(rowId(lesson)) ? (
              <Text style={styles.badge}>Complete</Text>
            ) : null}
            <Text style={styles.meta}>
              {lesson.content ? "Text" : ""} {lessonHasMedia(lesson) ? "Video" : ""}{" "}
              {lessonDocumentUrls(lesson).length ? "Documents" : ""}{" "}
              {lesson.audioUrl ? "Audio" : ""}
            </Text>
            <View style={styles.actions}>
              <Pressable
                disabled={!canOpenLessons}
                onPress={() => openLesson(lesson)}
                style={[styles.secondaryBtn, !canOpenLessons && styles.disabled]}
                accessibilityRole="button"
                accessibilityState={{ disabled: !canOpenLessons }}
                accessibilityLabel={
                  canOpenLessons
                    ? `Open lesson ${lessonTitle(lesson, index)}`
                    : `Lesson ${lessonTitle(lesson, index)} locked until payment is confirmed`
                }
              >
                <Text style={styles.secondaryText}>
                  {canOpenLessons ? "Open Lesson" : "Locked — Payment Required"}
                </Text>
              </Pressable>
              {canManageLessons ? (
                <>
                  <Pressable
                    accessibilityLabel={`Edit lesson ${lessonTitle(lesson, index)}`}
                    accessibilityRole="button"
                    onPress={() => editLesson(lesson)}
                    style={styles.secondaryBtn}
                  >
                    <Text style={styles.secondaryText}>Edit</Text>
                  </Pressable>
                  {facilityMode && !course?.isPublished ? (
                    lessonDeleteTarget === rowId(lesson) ? (
                      <View style={styles.actions}>
                        <Text style={styles.meta}>
                          Delete {lessonTitle(lesson, index)} from this draft?
                        </Text>
                        <Pressable
                          disabled={saving}
                          accessibilityLabel={`Confirm delete lesson ${lessonTitle(lesson, index)}`}
                          accessibilityRole="button"
                          onPress={() => deleteFacilityLesson(lesson)}
                          style={[styles.primaryBtn, saving && styles.disabled]}
                        >
                          <Text style={styles.primaryText}>Confirm Delete</Text>
                        </Pressable>
                        <Pressable
                          disabled={saving}
                          accessibilityLabel={`Keep lesson ${lessonTitle(lesson, index)}`}
                          accessibilityRole="button"
                          onPress={() => setLessonDeleteTarget("")}
                          style={styles.secondaryBtn}
                        >
                          <Text style={styles.secondaryText}>Keep Lesson</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <Pressable
                        disabled={saving}
                        accessibilityLabel={`Delete lesson ${lessonTitle(lesson, index)}`}
                        accessibilityRole="button"
                        onPress={() => setLessonDeleteTarget(rowId(lesson))}
                        style={styles.secondaryBtn}
                      >
                        <Text style={styles.secondaryText}>Delete</Text>
                      </Pressable>
                    )
                  ) : null}
                </>
              ) : null}
            </View>
          </View>
        ))}
        {!lessons.length ? <Text style={styles.meta}>No lessons returned.</Text> : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Course resources</Text>
        {[...documents, ...mediaAssets].map((resource, index) => {
          const url = String(
            resource?.storageUrl || resource?.url || resource?.documentUrl || ""
          );
          return (
            <View
              key={rowId(resource) || `${resource?.title || "resource"}-${index}`}
              style={styles.row}
            >
              <Text style={styles.rowTitle}>
                {resource?.title || resource?.fileName || `Resource ${index + 1}`}
              </Text>
              {resource?.description ? (
                <Text style={styles.body}>{resource.description}</Text>
              ) : null}
              {url ? (
                <Pressable
                  onPress={() =>
                    openCourseResource(url, {
                      filename:
                        resource?.fileName || resource?.title || "course-resource",
                      mimeType: resource?.fileType || resource?.mimeType || ""
                    })
                  }
                  style={styles.secondaryBtn}
                >
                  <Text style={styles.secondaryText}>Open Resource</Text>
                </Pressable>
              ) : (
                <Text style={styles.meta}>Resource is planned but not uploaded yet.</Text>
              )}
            </View>
          );
        })}
        {!documents.length && !mediaAssets.length ? (
          <Text style={styles.meta}>No shared resources attached.</Text>
        ) : null}
      </View>

      {course?.forumThreadId || course?.linkedForumThreadIds?.length ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Course discussion</Text>
          <Text style={styles.meta}>Ask questions and continue the course Q&A.</Text>
          <Pressable
            onPress={() =>
              router.push(
                `/forum/post/${encodeURIComponent(String(course.forumThreadId || course.linkedForumThreadIds[0]))}`
              )
            }
            style={styles.secondaryBtn}
          >
            <Text style={styles.secondaryText}>Open Discussion</Text>
          </Pressable>
        </View>
      ) : null}

      {course?.linkedProductIds?.length ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Related products</Text>
          {course.linkedProductIds.map((productId) => (
            <Pressable
              key={String(productId)}
              onPress={() => openRelatedProduct(productId)}
              style={styles.secondaryBtn}
            >
              <Text style={styles.secondaryText}>View Product {String(productId)}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Scheduled live sessions</Text>
        <Text style={styles.meta}>
          Course lives stay connected to GrowPath Schedule, RSVP status, Notification
          Center context, and optional My Tasks reminders.
        </Text>
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Open GrowPath Schedule for course lives"
            onPress={() => router.push("/home/schedule")}
            style={styles.secondaryBtn}
          >
            <Text style={styles.secondaryText}>Open Schedule</Text>
          </Pressable>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Open Notification Center for course lives"
            onPress={() => router.push("/home/notifications")}
            style={styles.secondaryBtn}
          >
            <Text style={styles.secondaryText}>Notifications</Text>
          </Pressable>
        </View>
        {liveSessions.map((session, index) => {
          const sourceSessionId = String(session?.sourceSessionId || "").trim();
          const sessionKey = facilityMode
            ? sourceSessionId || `display-only-live-${index}`
            : rowId(session) || `${session?.scheduledStart || "live"}-${index}`;
          const watchUrl = String(
            session?.watchUrl ||
              session?.meetingUrl ||
              (session?.twitchChannel
                ? `https://www.twitch.tv/${session.twitchChannel}`
                : "")
          );
          const twitchChannel = String(session?.twitchChannel || "");
          const twitchScheduleUrl = twitchChannel
            ? `https://www.twitch.tv/${twitchChannel}/schedule`
            : "";
          const isRsvped = liveRsvpIds.includes(sessionKey);
          const reminderLabel = String(session?.reminderPlan?.label || "1 hour before");
          const notificationCount = Array.isArray(session?.notificationPlan)
            ? session.notificationPlan.length
            : 0;
          return (
            <View key={sessionKey} style={styles.row}>
              <Text style={styles.rowTitle}>{session?.title || "Course live"}</Text>
              <Text style={styles.meta}>
                {session?.scheduledStart || "Date not scheduled"}
                {session?.timezone ? ` · ${session.timezone}` : ""}
              </Text>
              <Text style={styles.meta}>
                Reminder: {reminderLabel}
                {notificationCount
                  ? ` · ${notificationCount} notification checkpoints`
                  : " · RSVP notification context"}
                {isRsvped ? " · Going" : ""}
              </Text>
              <View style={styles.actions}>
                {learnerActionsAvailable && (!facilityMode || sourceSessionId) ? (
                  <Pressable
                    disabled={saving}
                    onPress={() => toggleLiveRsvp(session, index)}
                    style={isRsvped ? styles.secondaryBtn : styles.primaryBtn}
                    accessibilityRole="button"
                    accessibilityLabel={`${isRsvped ? "Cancel RSVP for" : "RSVP to"} ${session?.title || "course live"}`}
                  >
                    <Text style={isRsvped ? styles.secondaryText : styles.primaryText}>
                      {isRsvped ? "Going · Cancel RSVP" : "Remind Me / RSVP"}
                    </Text>
                  </Pressable>
                ) : null}
                {watchUrl ? (
                  <Pressable
                    accessibilityRole="link"
                    accessibilityLabel={`Watch ${session?.title || "course live"} on Twitch`}
                    onPress={() => Linking.openURL(watchUrl)}
                    style={styles.primaryBtn}
                  >
                    <Text style={styles.primaryText}>Watch on Twitch</Text>
                  </Pressable>
                ) : null}
                {twitchScheduleUrl ? (
                  <Pressable
                    accessibilityRole="link"
                    accessibilityLabel={`Open ${session?.title || "course live"} Twitch schedule`}
                    onPress={() => Linking.openURL(twitchScheduleUrl)}
                    style={styles.secondaryBtn}
                  >
                    <Text style={styles.secondaryText}>Twitch Schedule / Follow</Text>
                  </Pressable>
                ) : null}
                {session?.scheduledStart && learnerActionsAvailable ? (
                  <Pressable
                    disabled={saving || liveReminderIds.includes(sessionKey)}
                    onPress={() => addLiveReminder(session, index)}
                    style={styles.secondaryBtn}
                    accessibilityRole="button"
                    accessibilityLabel={`Add ${session?.title || "live session"} reminder to My Tasks`}
                  >
                    <Text style={styles.secondaryText}>
                      {liveReminderIds.includes(sessionKey)
                        ? "Reminder task created"
                        : "Optional: Add Task"}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          );
        })}
        {!liveSessions.length ? (
          <Text style={styles.meta}>No live sessions scheduled.</Text>
        ) : null}
      </View>

      {!facilityMode ? (
        <PersonalFeedPlacement
          placement="middle"
          routeKey="personal_course_detail"
          longContent
        />
      ) : null}

      {activeLesson ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{activeLesson.title || "Lesson"}</Text>
          <LessonMediaCard lesson={activeLesson} compact />
          {facilityManagedCourse
            ? activeLessonImages.map((url, index) => (
                <AuthorizedCourseImage
                  key={url}
                  accessibilityLabel={`${activeLesson.title || "Lesson"} image ${index + 1}`}
                  resizeMode="cover"
                  uri={url}
                  style={styles.lessonImage}
                />
              ))
            : null}
          {activeLessonDocuments.map((url, index) => {
            const legacySinglePdf =
              activeLessonDocuments.length === 1 &&
              url === String(activeLesson.pdfUrl || "").trim();
            const label = legacySinglePdf
              ? "Open PDF lesson"
              : activeLessonDocuments.length === 1
                ? "Open lesson document"
                : `Open lesson document ${index + 1} of ${activeLessonDocuments.length}`;
            return (
              <Pressable
                key={url}
                accessibilityRole="link"
                accessibilityLabel={label}
                onPress={() =>
                  openCourseResource(url, {
                    filename: legacySinglePdf
                      ? "lesson.pdf"
                      : `lesson-document-${index + 1}`,
                    mimeType: legacySinglePdf ? "application/pdf" : ""
                  })
                }
              >
                <Text style={styles.link}>{label}</Text>
              </Pressable>
            );
          })}
          {activeLesson.audioUrl ? (
            <Pressable
              onPress={() =>
                openCourseResource(activeLesson.audioUrl, {
                  filename: "lesson-audio",
                  mimeType: "audio/mpeg"
                })
              }
            >
              <Text style={styles.link}>Open audio lesson</Text>
            </Pressable>
          ) : null}
          {activeLesson.content ? (
            <Text style={styles.body}>{activeLesson.content}</Text>
          ) : null}
          {activeLesson.forumThreadId ? (
            <Pressable
              onPress={() =>
                router.push(
                  `/forum/post/${encodeURIComponent(String(activeLesson.forumThreadId))}`
                )
              }
              style={styles.secondaryBtn}
            >
              <Text style={styles.secondaryText}>Discuss This Lesson</Text>
            </Pressable>
          ) : null}
          {learnerActionsAvailable ? (
            <>
              <Text style={styles.cardTitle}>Private lesson notes</Text>
              <TextInput
                value={lessonNote}
                onChangeText={setLessonNote}
                placeholder="Write notes you want to keep with this lesson"
                placeholderTextColor={palette.textMuted}
                multiline
                style={[styles.input, styles.noteInput]}
                accessibilityLabel="Private lesson notes"
              />
              <View style={styles.actions}>
                <Pressable
                  disabled={saving}
                  onPress={saveLessonNote}
                  style={styles.secondaryBtn}
                >
                  <Text style={styles.secondaryText}>Save Note</Text>
                </Pressable>
                <Pressable onPress={askAIAboutCourse} style={styles.secondaryBtn}>
                  <Text style={styles.secondaryText}>Ask AI About This Lesson</Text>
                </Pressable>
                {!facilityMode ? (
                  <Pressable
                    disabled={saving}
                    onPress={createLessonTask}
                    style={styles.secondaryBtn}
                  >
                    <Text style={styles.secondaryText}>Create Lesson Task</Text>
                  </Pressable>
                ) : null}
              </View>
              <Pressable
                disabled={saving}
                onPress={() => markLessonComplete(activeLesson)}
                style={styles.primaryBtn}
              >
                <Text style={styles.primaryText}>Mark Complete</Text>
              </Pressable>
            </>
          ) : (
            <Pressable onPress={askAIAboutCourse} style={styles.secondaryBtn}>
              <Text style={styles.secondaryText}>Ask AI About This Lesson</Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => {
              const id = rowId(activeLesson);
              if (id) trackDropoff(id, 0).catch(() => null);
              setActiveLesson(null);
            }}
            style={styles.secondaryBtn}
          >
            <Text style={styles.secondaryText}>Close Lesson</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Reviews</Text>
        {reviews.slice(0, 5).map((review) => (
          <View key={rowId(review) || review.text} style={styles.row}>
            <Text style={styles.rowTitle}>{review.rating || 0}/5</Text>
            <Text style={styles.body}>
              {review.text || review.comment || "No review text."}
            </Text>
          </View>
        ))}
        {!reviews.length ? <Text style={styles.meta}>No reviews yet.</Text> : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Report Course</Text>
        <TextInput
          value={reportReason}
          onChangeText={setReportReason}
          placeholder="Reason"
          placeholderTextColor={palette.textMuted}
          style={styles.input}
          accessibilityLabel="Course report reason"
        />
        <Pressable
          disabled={saving || !reportReason.trim()}
          onPress={reportCourse}
          accessibilityRole="button"
          accessibilityLabel="Submit course report"
          accessibilityState={{ disabled: saving || !reportReason.trim() }}
          style={[
            styles.secondaryBtn,
            (!reportReason.trim() || saving) && styles.disabled
          ]}
        >
          <Text style={styles.secondaryText}>Submit Report</Text>
        </Pressable>
      </View>

      {!workspaceOwnsCourse && hasPaidPurchase ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Refunds and payment support</Text>
          <Text style={styles.meta}>
            Refund requests and payment issues are reviewed by GrowPath support. Reporting
            a payment issue here does not open a bank or card dispute.
          </Text>
          <TextInput
            value={refundReason}
            onChangeText={setRefundReason}
            placeholder="Refund reason"
            placeholderTextColor={palette.textMuted}
            style={styles.input}
            editable={canRequestRefund && !saving}
            accessibilityLabel="Course refund reason"
          />
          <Pressable
            disabled={saving || !canRequestRefund || !refundReason.trim()}
            onPress={submitRefund}
            style={[
              styles.secondaryBtn,
              (!refundReason.trim() || !canRequestRefund || saving) && styles.disabled
            ]}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryText}>
              {refundRequestStatus === "requested"
                ? "Refund Requested"
                : refundStatus === "refunded"
                  ? "Refunded"
                  : "Request Refund"}
            </Text>
          </Pressable>
          <TextInput
            value={disputeReason}
            onChangeText={setDisputeReason}
            placeholder="What is wrong with this payment?"
            placeholderTextColor={palette.textMuted}
            style={styles.input}
            editable={canReportPaymentIssue && !saving}
            accessibilityLabel="Course payment issue"
          />
          <Pressable
            accessibilityLabel="Submit course payment issue report"
            disabled={saving || !canReportPaymentIssue || !disputeReason.trim()}
            onPress={submitDispute}
            style={[
              styles.secondaryBtn,
              (!disputeReason.trim() || !canReportPaymentIssue || saving) &&
                styles.disabled
            ]}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryText}>
              {disputeReportStatus === "reported"
                ? "Payment Issue Reported"
                : disputeReportStatus === "resolved"
                  ? "Payment Issue Resolved"
                  : disputeReportStatus === "declined"
                    ? "Payment Issue Report Declined"
                    : "Report Payment Issue"}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {canPublishManagedCourse ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Course publication</Text>
          <Text style={styles.meta}>
            Publish when the learner experience is ready. Unpublish returns the course to
            a private draft without deleting it.
          </Text>
          <Pressable
            disabled={saving}
            onPress={course?.isPublished ? unpublishCurrentCourse : publishCurrentCourse}
            style={[styles.primaryBtn, saving && styles.disabled]}
            accessibilityRole="button"
            accessibilityLabel={
              course?.isPublished ? "Unpublish course" : "Publish course"
            }
          >
            <Text style={styles.primaryText}>
              {saving
                ? "Saving..."
                : course?.isPublished
                  ? "Unpublish Course"
                  : "Publish Course"}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {canArchiveManagedCourse && !course?.isPublished ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Archive draft course</Text>
          <Text style={styles.meta}>
            Remove this draft from active course lists while retaining its audit record.
            Reusable Video Library files are not deleted.
          </Text>
          {archiveConfirmOpen ? (
            <>
              <Text style={styles.body}>Archive this private draft course?</Text>
              <View style={styles.actions}>
                <Pressable
                  disabled={saving}
                  onPress={archiveCurrentCourse}
                  style={[styles.primaryBtn, saving && styles.disabled]}
                  accessibilityRole="button"
                  accessibilityLabel="Confirm archive course"
                  accessibilityState={{ disabled: saving }}
                >
                  <Text style={styles.primaryText}>
                    {saving ? "Archiving..." : "Confirm Archive"}
                  </Text>
                </Pressable>
                <Pressable
                  disabled={saving}
                  onPress={() => setArchiveConfirmOpen(false)}
                  style={styles.secondaryBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Keep course"
                  accessibilityState={{ disabled: saving }}
                >
                  <Text style={styles.secondaryText}>Keep Course</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <Pressable
              disabled={saving}
              onPress={() => setArchiveConfirmOpen(true)}
              style={styles.secondaryBtn}
              accessibilityRole="button"
              accessibilityLabel="Archive draft course"
              accessibilityState={{ disabled: saving }}
            >
              <Text style={styles.secondaryText}>Archive Course</Text>
            </Pressable>
          )}
        </View>
      ) : null}

      {!facilityMode && access.canViewCourseAnalytics ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Course Sales Report</Text>
          <TextInput
            value={salesRange}
            onChangeText={setSalesRange}
            placeholder="last_30_days"
            placeholderTextColor={palette.textMuted}
            style={styles.input}
          />
          <Pressable disabled={saving} onPress={exportSales} style={styles.secondaryBtn}>
            <Text style={styles.secondaryText}>Export Sales</Text>
          </Pressable>
        </View>
      ) : null}
      {!facilityMode ? (
        <PersonalFeedPlacement
          placement="bottom"
          routeKey="personal_course_detail"
          longContent
        />
      ) : null}
    </ScrollView>
  );
}

export function createStyles(palette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.page },
    content: { padding: 18, paddingBottom: 36, gap: 12 },
    loading: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: palette.page
    },
    title: { fontSize: 24, fontWeight: "800", color: palette.text },
    courseHeroImage: {
      width: "100%",
      maxWidth: 920,
      aspectRatio: 16 / 9,
      alignSelf: "center",
      borderRadius: radius.card,
      backgroundColor: palette.surfaceMuted
    },
    lessonImage: {
      width: "100%",
      aspectRatio: 4 / 3,
      borderRadius: radius.card,
      backgroundColor: palette.surfaceMuted
    },
    body: { color: palette.textSoft, lineHeight: 20 },
    meta: { color: palette.textMuted, fontSize: 13 },
    feedback: {
      color: palette.text,
      backgroundColor: palette.surfaceMuted,
      borderRadius: radius.card,
      padding: 8
    },
    badge: { alignSelf: "flex-start", color: palette.success, fontWeight: "800" },
    card: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      padding: 12,
      gap: 8,
      backgroundColor: palette.surface
    },
    cardHeader: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
    cardTitle: { fontSize: 16, fontWeight: "800", color: palette.text },
    row: {
      borderTopWidth: 1,
      borderTopColor: palette.borderSoft,
      paddingTop: 8,
      gap: 4
    },
    rowTitle: { fontWeight: "800", color: palette.text },
    actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    input: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      paddingHorizontal: 10,
      paddingVertical: 9,
      backgroundColor: palette.surface,
      color: palette.text
    },
    primaryBtn: {
      alignSelf: "flex-start",
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      paddingHorizontal: 12,
      paddingVertical: 9
    },
    primaryText: { color: palette.accentText, fontWeight: "800" },
    secondaryBtn: {
      alignSelf: "flex-start",
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      paddingHorizontal: 12,
      paddingVertical: 9,
      backgroundColor: palette.surface
    },
    secondaryText: { color: palette.text, fontWeight: "800" },
    link: { color: palette.link, fontWeight: "800" },
    noteInput: { minHeight: 96, textAlignVertical: "top" },
    progressTrack: {
      height: 10,
      borderRadius: 999,
      overflow: "hidden",
      backgroundColor: palette.surfaceStrong
    },
    progressFill: { height: "100%", backgroundColor: palette.success },
    disabled: { opacity: 0.5 }
  });
}
