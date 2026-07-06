import { Link, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import {
  addCommercialCourseLesson,
  CommercialCourse,
  fetchCommercialCourse,
  publishCommercialCourse,
  updateCommercialCourse
} from "@/api/commercialWorkflows";
import { InlineError } from "@/components/InlineError";
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";

function cleanId(value: unknown) {
  return String(Array.isArray(value) ? value[0] : value || "").trim();
}

function splitIds(value: string) {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function courseTitle(course: CommercialCourse | null) {
  return course?.title || "Commercial Course";
}

function DetailRow({ label, value }: { label: string; value?: unknown }) {
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
  return (
    <Link href={href as any} asChild>
      <Pressable accessibilityRole="button" style={styles.action}>
        <Text style={styles.actionText}>{label}</Text>
      </Pressable>
    </Link>
  );
}

export default function CommercialCourseDetailRoute({ route }: { route?: any } = {}) {
  const params = useLocalSearchParams<{ courseId?: string }>();
  const courseId = useMemo(
    () => cleanId(params.courseId || route?.params?.courseId || route?.params?.id),
    [params.courseId, route?.params?.courseId, route?.params?.id]
  );
  const [course, setCourse] = useState<CommercialCourse | null>(null);
  const [status, setStatus] = useState("");
  const [access, setAccess] = useState("");
  const [description, setDescription] = useState("");
  const [linkedProductIds, setLinkedProductIds] = useState("");
  const [linkedProductLineIds, setLinkedProductLineIds] = useState("");
  const [linkedGrowIds, setLinkedGrowIds] = useState("");
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonBody, setLessonBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addingLesson, setAddingLesson] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<any>(null);
  const [message, setMessage] = useState("");

  const hydrate = useCallback((next: CommercialCourse | null) => {
    setCourse(next);
    setStatus(next?.status || "draft");
    setAccess(next?.access || "free");
    setDescription(next?.description || "");
    setLinkedProductIds((next?.linkedProductIds || []).join(", "));
    setLinkedProductLineIds((next?.linkedProductLineIds || []).join(", "));
    setLinkedGrowIds((next?.linkedGrowIds || []).join(", "));
  }, []);

  const load = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    setError(null);
    try {
      hydrate(await fetchCommercialCourse(courseId));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [courseId, hydrate]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveChanges() {
    if (!courseId) return;
    setSaving(true);
    setMessage("");
    setError(null);
    try {
      const updated = await updateCommercialCourse(courseId, {
        status: (status.trim() || "draft") as CommercialCourse["status"],
        access: (access.trim() || "free") as CommercialCourse["access"],
        description: description.trim(),
        linkedProductIds: splitIds(linkedProductIds),
        linkedProductLineIds: splitIds(linkedProductLineIds),
        linkedGrowIds: splitIds(linkedGrowIds)
      });
      hydrate(updated);
      setMessage("Commercial course updated.");
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  }

  async function addLesson() {
    if (!courseId || !lessonTitle.trim()) return;
    setAddingLesson(true);
    setMessage("");
    setError(null);
    try {
      const updated = await addCommercialCourseLesson(courseId, {
        title: lessonTitle.trim(),
        body: lessonBody.trim(),
        status: "draft"
      });
      hydrate(updated);
      setLessonTitle("");
      setLessonBody("");
      setMessage("Lesson added.");
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
      hydrate(await publishCommercialCourse(courseId));
      setMessage("Course published.");
    } catch (err) {
      setError(err);
    } finally {
      setPublishing(false);
    }
  }

  const lessons = Array.isArray(course?.lessons) ? course.lessons : [];

  return (
    <AppPage
      routeKey="commercial-course-detail"
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

      <AppCard>
        <Text style={styles.cardTitle}>Course Record</Text>
        <Text style={styles.body}>
          Commercial courses can be free or paid, and should connect to products, product
          lines, grow trials, feed campaigns, storefronts, and forum support.
        </Text>
        <View style={styles.detailGrid}>
          <DetailRow label="Category" value={course?.category} />
          <DetailRow label="Access" value={course?.access} />
          <DetailRow label="Status" value={course?.status} />
          <DetailRow label="Lessons" value={lessons.length} />
          <DetailRow label="Linked products" value={course?.linkedProductIds} />
          <DetailRow label="Linked product lines" value={course?.linkedProductLineIds} />
          <DetailRow label="Linked grows" value={course?.linkedGrowIds} />
        </View>
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Update Commercial Course</Text>
        <View style={styles.formGrid}>
          <TextInput
            accessibilityLabel="Commercial course detail status"
            onChangeText={setStatus}
            placeholder="draft, published, archived"
            style={styles.input}
            value={status}
          />
          <TextInput
            accessibilityLabel="Commercial course detail access"
            onChangeText={setAccess}
            placeholder="free, paid, followers, customers, private"
            style={styles.input}
            value={access}
          />
        </View>
        <TextInput
          accessibilityLabel="Commercial course detail description"
          multiline
          onChangeText={setDescription}
          placeholder="Course description and use case"
          style={[styles.input, styles.textArea]}
          value={description}
        />
        <TextInput
          accessibilityLabel="Commercial course detail linked products"
          onChangeText={setLinkedProductIds}
          placeholder="Linked product IDs"
          style={styles.input}
          value={linkedProductIds}
        />
        <TextInput
          accessibilityLabel="Commercial course detail linked product lines"
          onChangeText={setLinkedProductLineIds}
          placeholder="Linked product line IDs"
          style={styles.input}
          value={linkedProductLineIds}
        />
        <TextInput
          accessibilityLabel="Commercial course detail linked grows"
          onChangeText={setLinkedGrowIds}
          placeholder="Linked grow/trial IDs"
          style={styles.input}
          value={linkedGrowIds}
        />
        <View style={styles.actions}>
          <Pressable
            accessibilityLabel="Save commercial course detail"
            accessibilityRole="button"
            disabled={saving || !courseId}
            onPress={saveChanges}
            style={[styles.primaryAction, saving || !courseId ? styles.disabled : null]}
          >
            <Text style={styles.primaryActionText}>
              {saving ? "Saving..." : "Save Course"}
            </Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Publish commercial course"
            accessibilityRole="button"
            disabled={publishing || !courseId}
            onPress={publishCourse}
            style={[
              styles.secondaryAction,
              publishing || !courseId ? styles.disabled : null
            ]}
          >
            <Text style={styles.secondaryActionText}>
              {publishing ? "Publishing..." : "Publish"}
            </Text>
          </Pressable>
        </View>
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Lessons</Text>
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
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.muted}>No lessons yet.</Text>
        )}
        <TextInput
          accessibilityLabel="Commercial course lesson title"
          onChangeText={setLessonTitle}
          placeholder="Lesson title"
          style={styles.input}
          value={lessonTitle}
        />
        <TextInput
          accessibilityLabel="Commercial course lesson body"
          multiline
          onChangeText={setLessonBody}
          placeholder="Lesson body, product instructions, trial evidence, support notes"
          style={[styles.input, styles.textArea]}
          value={lessonBody}
        />
        <Pressable
          accessibilityLabel="Add commercial course lesson"
          accessibilityRole="button"
          disabled={addingLesson || !lessonTitle.trim()}
          onPress={addLesson}
          style={[
            styles.primaryAction,
            addingLesson || !lessonTitle.trim() ? styles.disabled : null
          ]}
        >
          <Text style={styles.primaryActionText}>
            {addingLesson ? "Adding..." : "Add Lesson"}
          </Text>
        </Pressable>
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Commercial Course Loop</Text>
        <Text style={styles.bullet}>
          Attach products and product lines before public launch.
        </Text>
        <Text style={styles.bullet}>
          Use trial/grow evidence in lessons when making product claims.
        </Text>
        <Text style={styles.bullet}>
          Announce published courses in feed and link them from storefront/profile.
        </Text>
        <Text style={styles.bullet}>
          Answer course/product questions in community support threads.
        </Text>
        <View style={styles.actions}>
          <ActionLink href="/home/commercial/products" label="Products" />
          <ActionLink href="/home/commercial/trials" label="Product Trials" />
          <ActionLink href="/home/commercial/storefront" label="Storefront" />
          <ActionLink href="/home/commercial/community" label="Community" />
        </View>
      </AppCard>
    </AppPage>
  );
}

const styles = StyleSheet.create({
  header: { gap: 8 },
  kicker: {
    color: "#166534",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  title: { color: "#0F172A", fontSize: 28, fontWeight: "900" },
  subtitle: { color: "#475569", lineHeight: 21 },
  cardTitle: { color: "#0F172A", fontSize: 17, fontWeight: "900" },
  body: { color: "#475569", fontSize: 14, lineHeight: 21, marginTop: 8 },
  muted: { color: "#64748B", fontSize: 13, marginTop: 4 },
  detailGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  detailRow: {
    borderColor: "#E2E8F0",
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 170,
    padding: 10
  },
  detailLabel: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  detailValue: { color: "#0F172A", fontSize: 14, fontWeight: "800", marginTop: 4 },
  formGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  input: {
    borderColor: "#CBD5E1",
    borderRadius: 8,
    borderWidth: 1,
    color: "#0F172A",
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
    backgroundColor: "#FFFFFF",
    borderColor: "#166534",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 8
  },
  actionText: { color: "#166534", fontSize: 13, fontWeight: "900" },
  primaryAction: {
    alignSelf: "flex-start",
    backgroundColor: "#166534",
    borderRadius: 8,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  primaryActionText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
  secondaryAction: {
    alignSelf: "flex-start",
    borderColor: "#166534",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  secondaryActionText: { color: "#166534", fontSize: 13, fontWeight: "900" },
  disabled: { opacity: 0.55 },
  success: { color: "#166534", fontSize: 13, fontWeight: "800", marginTop: 8 },
  list: { gap: 10, marginTop: 12 },
  row: {
    borderColor: "#E2E8F0",
    borderRadius: 8,
    borderWidth: 1,
    padding: 10
  },
  rowTitle: { color: "#0F172A", fontSize: 15, fontWeight: "900" },
  bullet: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
    marginTop: 6
  }
});
