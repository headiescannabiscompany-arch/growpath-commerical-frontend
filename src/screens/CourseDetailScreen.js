import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
  approveCourse,
  completeLesson,
  enrollInCourse,
  getCourse,
  getEnrollmentStatus,
  getReviews,
  rejectCourse,
  sendWatchTime,
  submitForReview,
  trackDropoff,
  trackLessonView
} from "../api/courses";
import {
  getCoursePaymentStatus,
  openCourseDispute,
  requestCourseRefund,
  startCourseCheckout
} from "../api/coursePayments";
import { submitReport, exportCourseSales } from "../api/reports";
import { useEntitlements } from "@/entitlements";
import { getLearningAccess } from "@/features/learning/learningAccess";

function rowId(row) {
  return String(row?._id || row?.id || "");
}

function normalizeCourse(payload, fallback) {
  if (payload?.course) return payload.course;
  if (payload?.data?.course) return payload.data.course;
  if (payload?.data && !Array.isArray(payload.data)) return payload.data;
  return payload || fallback || null;
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

function lessonTitle(lesson, index) {
  return String(lesson?.title || `Lesson ${index + 1}`);
}

async function openCheckoutUrl(url) {
  if (Platform.OS === "web" && typeof window !== "undefined" && window.location) {
    window.location.href = url;
    return;
  }
  await Linking.openURL(url);
}

export default function CourseDetailScreen({ route, navigation }) {
  const entitlements = useEntitlements();
  const access = getLearningAccess(entitlements);
  const initialCourse = route?.params?.course || null;
  const rawId = route?.params?.id || route?.params?.courseId || rowId(initialCourse);
  const courseId = String(rawId || "");

  const [course, setCourse] = useState(initialCourse);
  const [reviews, setReviews] = useState([]);
  const [enrollment, setEnrollment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [activeLesson, setActiveLesson] = useState(null);
  const [reportReason, setReportReason] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [disputeReason, setDisputeReason] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [salesRange, setSalesRange] = useState("last_30_days");

  const loadedCourseId = rowId(course) || courseId;
  const lessons = useMemo(() => normalizeList(course?.lessons, "lessons"), [course]);
  const enrolled = Boolean(
    enrollment?.enrolled ||
    enrollment?.isEnrolled ||
    course?.isEnrolled ||
    course?.enrolled
  );
  const isPaidCourse = Number(course?.priceCents || course?.price || 0) > 0;
  const paymentStatus =
    enrollment?.paymentStatus ||
    enrollment?.checkoutStatus ||
    enrollment?.status ||
    "not_started";

  const load = useCallback(async () => {
    if (!access.canViewCourses) {
      setLoading(false);
      return;
    }
    if (!courseId && !initialCourse) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setFeedback("");
    try {
      const id = courseId || rowId(initialCourse);
      const [courseResponse, statusResponse, reviewsResponse] = await Promise.all([
        id ? getCourse(id) : Promise.resolve(initialCourse),
        id ? getEnrollmentStatus(id).catch(() => null) : Promise.resolve(null),
        id ? getReviews(id).catch(() => []) : Promise.resolve([])
      ]);
      setCourse(normalizeCourse(courseResponse, initialCourse));
      setEnrollment(statusResponse?.data || statusResponse || null);
      setReviews(normalizeList(reviewsResponse, "reviews"));
    } catch (error) {
      setFeedback(error?.message || "Unable to load course.");
    } finally {
      setLoading(false);
    }
  }, [access.canViewCourses, courseId, initialCourse]);

  useEffect(() => {
    load();
  }, [load]);

  async function refreshPaymentStatus() {
    if (!loadedCourseId) return null;
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
  }

  async function enroll() {
    if (!loadedCourseId) return;
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

  async function openLesson(lesson) {
    const id = rowId(lesson);
    if (id) await trackLessonView(id).catch(() => null);
    if (navigation?.navigate) {
      navigation.navigate("Lesson", { lesson, courseId: loadedCourseId });
      return;
    }
    setActiveLesson(lesson);
  }

  async function markLessonComplete(lesson) {
    const id = rowId(lesson);
    if (!id || !loadedCourseId) return;
    setSaving(true);
    try {
      await completeLesson(id, loadedCourseId);
      await sendWatchTime(id, Number(lesson?.durationSeconds || 0)).catch(() => null);
      setFeedback("Lesson marked complete.");
      setActiveLesson(null);
      await load();
    } catch (error) {
      setFeedback(error?.message || "Unable to complete lesson.");
    } finally {
      setSaving(false);
    }
  }

  async function submitReview() {
    if (!loadedCourseId) return;
    setSaving(true);
    try {
      await submitForReview(loadedCourseId);
      setFeedback("Course submitted for review.");
      await load();
    } catch (error) {
      setFeedback(error?.message || "Unable to submit for review.");
    } finally {
      setSaving(false);
    }
  }

  async function approve() {
    if (!loadedCourseId) return;
    setSaving(true);
    try {
      await approveCourse(loadedCourseId);
      setFeedback("Course approved.");
      await load();
    } catch (error) {
      setFeedback(error?.message || "Unable to approve course.");
    } finally {
      setSaving(false);
    }
  }

  async function reject() {
    if (!loadedCourseId || !rejectReason.trim()) return;
    setSaving(true);
    try {
      await rejectCourse(loadedCourseId, rejectReason.trim());
      setRejectReason("");
      setFeedback("Course rejected.");
      await load();
    } catch (error) {
      setFeedback(error?.message || "Unable to reject course.");
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
      await requestCourseRefund(loadedCourseId, refundReason.trim());
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
      await openCourseDispute(loadedCourseId, disputeReason.trim());
      setDisputeReason("");
      setFeedback("Dispute submitted. Final state comes from backend payment status.");
      await refreshPaymentStatus();
    } catch (error) {
      setFeedback(error?.message || "Unable to open dispute.");
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

  function addLesson() {
    if (!loadedCourseId || !navigation?.navigate) return;
    navigation.navigate("AddLesson", { courseId: loadedCourseId });
  }

  function editLesson(lesson) {
    const id = rowId(lesson);
    if (!id || !navigation?.navigate) return;
    navigation.navigate("EditLesson", { lessonId: id, lesson });
  }

  if (!access.canViewCourses) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Course unavailable</Text>
        <Text style={styles.meta}>This account does not have `COURSES_VIEW`.</Text>
      </ScrollView>
    );
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator />
        <Text style={styles.meta}>Loading course...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{course?.title || course?.name || "Course"}</Text>
      <Text style={styles.meta}>
        {coursePrice(course)} |{" "}
        {course?.status || (course?.isPublished ? "published" : "draft")}
      </Text>
      {course?.summary || course?.description ? (
        <Text style={styles.body}>{course.summary || course.description}</Text>
      ) : null}
      {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}

      {!enrolled ? (
        <Pressable disabled={saving} onPress={enroll} style={styles.primaryBtn}>
          <Text style={styles.primaryText}>
            {saving ? "Saving..." : isPaidCourse ? "Start Checkout" : "Enroll"}
          </Text>
        </Pressable>
      ) : (
        <Text style={styles.badge}>Enrolled</Text>
      )}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Purchase Status</Text>
        <Text style={styles.meta}>Enrollment: {enrolled ? "confirmed" : "pending"}</Text>
        <Text style={styles.meta}>Payment: {String(paymentStatus)}</Text>
        <Text style={styles.meta}>
          Refund: {String(enrollment?.refundStatus || "none")}
        </Text>
        <Text style={styles.meta}>
          Dispute: {String(enrollment?.disputeStatus || "none")}
        </Text>
        <Text style={styles.meta}>
          Earnings: {String(enrollment?.earningsStatus || "pending_webhook")}
        </Text>
        <Pressable
          disabled={saving}
          onPress={refreshPaymentStatus}
          style={styles.secondaryBtn}
        >
          <Text style={styles.secondaryText}>Refresh Status</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Lessons</Text>
          {access.canCreateCourses ? (
            <Text style={styles.meta}>
              {access.maxLessonsPerCourse === null
                ? "Unlimited"
                : `${lessons.length}/${access.maxLessonsPerCourse}`}
            </Text>
          ) : null}
        </View>
        {access.canCreateCourses ? (
          <Pressable
            disabled={
              !navigation?.navigate ||
              (access.maxLessonsPerCourse !== null &&
                lessons.length >= access.maxLessonsPerCourse)
            }
            onPress={addLesson}
            style={[
              styles.secondaryBtn,
              (!navigation?.navigate ||
                (access.maxLessonsPerCourse !== null &&
                  lessons.length >= access.maxLessonsPerCourse)) &&
                styles.disabled
            ]}
          >
            <Text style={styles.secondaryText}>Add Lesson</Text>
          </Pressable>
        ) : null}
        {lessons.map((lesson, index) => (
          <View key={rowId(lesson) || lessonTitle(lesson, index)} style={styles.row}>
            <Text style={styles.rowTitle}>{lessonTitle(lesson, index)}</Text>
            <Text style={styles.meta}>
              {lesson.content ? "Text" : ""} {lesson.videoUrl ? "Video" : ""}{" "}
              {lesson.pdfUrl ? "PDF" : ""} {lesson.audioUrl ? "Audio" : ""}
            </Text>
            <View style={styles.actions}>
              <Pressable
                disabled={
                  !enrolled && Number(course?.priceCents || course?.price || 0) > 0
                }
                onPress={() => openLesson(lesson)}
                style={styles.secondaryBtn}
              >
                <Text style={styles.secondaryText}>Open Lesson</Text>
              </Pressable>
              {access.canCreateCourses && navigation?.navigate ? (
                <Pressable onPress={() => editLesson(lesson)} style={styles.secondaryBtn}>
                  <Text style={styles.secondaryText}>Edit</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ))}
        {!lessons.length ? <Text style={styles.meta}>No lessons returned.</Text> : null}
      </View>

      {activeLesson ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{activeLesson.title || "Lesson"}</Text>
          {activeLesson.videoUrl ? (
            <Pressable onPress={() => Linking.openURL(activeLesson.videoUrl)}>
              <Text style={styles.link}>Open video lesson</Text>
            </Pressable>
          ) : null}
          {activeLesson.pdfUrl ? (
            <Pressable onPress={() => Linking.openURL(activeLesson.pdfUrl)}>
              <Text style={styles.link}>Open PDF lesson</Text>
            </Pressable>
          ) : null}
          {activeLesson.audioUrl ? (
            <Pressable onPress={() => Linking.openURL(activeLesson.audioUrl)}>
              <Text style={styles.link}>Open audio lesson</Text>
            </Pressable>
          ) : null}
          {activeLesson.content ? (
            <Text style={styles.body}>{activeLesson.content}</Text>
          ) : null}
          <Pressable
            disabled={saving}
            onPress={() => markLessonComplete(activeLesson)}
            style={styles.primaryBtn}
          >
            <Text style={styles.primaryText}>Mark Complete</Text>
          </Pressable>
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
          style={styles.input}
        />
        <Pressable
          disabled={saving || !reportReason.trim()}
          onPress={reportCourse}
          style={[
            styles.secondaryBtn,
            (!reportReason.trim() || saving) && styles.disabled
          ]}
        >
          <Text style={styles.secondaryText}>Submit Report</Text>
        </Pressable>
      </View>

      {isPaidCourse ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Refunds and Disputes</Text>
          <TextInput
            value={refundReason}
            onChangeText={setRefundReason}
            placeholder="Refund reason"
            style={styles.input}
          />
          <Pressable
            disabled={saving || !refundReason.trim()}
            onPress={submitRefund}
            style={[
              styles.secondaryBtn,
              (!refundReason.trim() || saving) && styles.disabled
            ]}
          >
            <Text style={styles.secondaryText}>Request Refund</Text>
          </Pressable>
          <TextInput
            value={disputeReason}
            onChangeText={setDisputeReason}
            placeholder="Dispute reason"
            style={styles.input}
          />
          <Pressable
            disabled={saving || !disputeReason.trim()}
            onPress={submitDispute}
            style={[
              styles.secondaryBtn,
              (!disputeReason.trim() || saving) && styles.disabled
            ]}
          >
            <Text style={styles.secondaryText}>Open Dispute</Text>
          </Pressable>
        </View>
      ) : null}

      {access.canCreateCourses || access.canPublishCourses ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Creator and Moderation</Text>
          {access.canCreateCourses ? (
            <Pressable
              disabled={saving}
              onPress={submitReview}
              style={styles.secondaryBtn}
            >
              <Text style={styles.secondaryText}>Submit for Review</Text>
            </Pressable>
          ) : null}
          {access.canPublishCourses ? (
            <>
              <Pressable disabled={saving} onPress={approve} style={styles.primaryBtn}>
                <Text style={styles.primaryText}>Approve Course</Text>
              </Pressable>
              <TextInput
                value={rejectReason}
                onChangeText={setRejectReason}
                placeholder="Rejection reason"
                style={styles.input}
              />
              <Pressable
                disabled={saving || !rejectReason.trim()}
                onPress={reject}
                style={[
                  styles.secondaryBtn,
                  (!rejectReason.trim() || saving) && styles.disabled
                ]}
              >
                <Text style={styles.secondaryText}>Reject Course</Text>
              </Pressable>
            </>
          ) : null}
        </View>
      ) : null}

      {access.canViewCourseAnalytics ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Course Sales Report</Text>
          <TextInput
            value={salesRange}
            onChangeText={setSalesRange}
            placeholder="last_30_days"
            style={styles.input}
          />
          <Pressable disabled={saving} onPress={exportSales} style={styles.secondaryBtn}>
            <Text style={styles.secondaryText}>Export Sales</Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  content: { padding: 18, paddingBottom: 36, gap: 12 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  title: { fontSize: 24, fontWeight: "800", color: "#0F172A" },
  body: { color: "#334155", lineHeight: 20 },
  meta: { color: "#64748B", fontSize: 13 },
  feedback: { color: "#334155", backgroundColor: "#F1F5F9", borderRadius: 8, padding: 8 },
  badge: { alignSelf: "flex-start", color: "#166534", fontWeight: "800" },
  card: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    padding: 12,
    gap: 8,
    backgroundColor: "#F8FAFC"
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#0F172A" },
  row: { borderTopWidth: 1, borderTopColor: "#E2E8F0", paddingTop: 8, gap: 4 },
  rowTitle: { fontWeight: "800", color: "#0F172A" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    backgroundColor: "#FFFFFF"
  },
  primaryBtn: {
    alignSelf: "flex-start",
    backgroundColor: "#166534",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  primaryText: { color: "#FFFFFF", fontWeight: "800" },
  secondaryBtn: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: "#FFFFFF"
  },
  secondaryText: { color: "#0F172A", fontWeight: "800" },
  link: { color: "#166534", fontWeight: "800" },
  disabled: { opacity: 0.5 }
});
