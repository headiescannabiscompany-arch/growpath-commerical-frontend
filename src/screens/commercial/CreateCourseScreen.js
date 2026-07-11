import React, { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import ScreenContainer from "../../components/ScreenContainer";
import { createCourse } from "@/api/courses";
import PersonalFeedPlacement from "@/components/feed/PersonalFeedPlacement";
import { useEntitlements } from "@/entitlements";
import { getLearningAccess } from "@/features/learning/learningAccess";
import { radius } from "@/theme/theme";

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

function buildLessons(input) {
  return splitPlanLines(input).map((title, index) => ({
    title,
    description: "",
    body: "",
    videoUrl: "",
    uploadedVideoId: "",
    documentIds: [],
    imageIds: [],
    estimatedDurationMinutes: null,
    order: index + 1,
    status: "draft"
  }));
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

function buildLiveSessions(input) {
  return splitPlanLines(input).map((title) => ({
    title,
    description: "",
    scheduledStart: null,
    scheduledEnd: null,
    timezone: "",
    platform: "",
    meetingUrl: "",
    replayVideoId: "",
    status: "scheduled"
  }));
}

export default function CreateCourseScreen({ navigation }) {
  const router = useRouter();
  const entitlements = useEntitlements();
  const access = getLearningAccess(entitlements);
  const backTarget =
    entitlements.mode === "commercial"
      ? "/home/commercial/courses"
      : "/home/personal/courses";
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [category, setCategory] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [cropType, setCropType] = useState("");
  const [curriculumPlan, setCurriculumPlan] = useState("");
  const [documentPlan, setDocumentPlan] = useState("");
  const [mediaPlan, setMediaPlan] = useState("");
  const [liveSessionPlan, setLiveSessionPlan] = useState("");
  const [linkedProductIds, setLinkedProductIds] = useState("");
  const [linkedGrowIds, setLinkedGrowIds] = useState("");
  const [linkedForumThreadIds, setLinkedForumThreadIds] = useState("");
  const [price, setPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const priceCents = useMemo(() => toPriceCents(price.trim()), [price]);
  const canSubmit = access.canCreateCourses && title.trim().length >= 3 && !submitting;

  function backToCourses() {
    if (navigation?.goBack) {
      navigation.goBack();
    } else if (router?.replace) {
      router.replace(backTarget);
    }
  }

  async function submitCourse() {
    if (!canSubmit) return;
    if (!access.canCreateCourses) {
      Alert.alert("Unavailable", "Course creation is unavailable for this account.");
      return;
    }
    if (price.trim() && priceCents == null) {
      Alert.alert("Invalid price", "Price must be a number greater than or equal to 0.");
      return;
    }
    if ((priceCents || 0) > 0 && !access.canSellPaidCourses) {
      Alert.alert(
        "Paid courses unavailable",
        "Paid course sales require COURSES_SELL_PAID."
      );
      return;
    }

    setSubmitting(true);
    try {
      const lessons = buildLessons(curriculumPlan);
      const documents = buildDocuments(documentPlan);
      const liveSessions = buildLiveSessions(liveSessionPlan);
      const course = await createCourse({
        title: title.trim(),
        summary: summary.trim(),
        description: description.trim(),
        coverImageUrl: coverImageUrl.trim(),
        category: category.trim(),
        difficulty: difficulty.trim(),
        cropType: cropType.trim(),
        curriculumPlan: curriculumPlan.trim(),
        documentPlan: documentPlan.trim(),
        mediaPlan: mediaPlan.trim(),
        liveSessionPlan: liveSessionPlan.trim(),
        lessons,
        documents,
        liveSessions,
        linkedProductIds: splitPlanLines(linkedProductIds),
        linkedGrowIds: splitPlanLines(linkedGrowIds),
        linkedForumThreadIds: splitPlanLines(linkedForumThreadIds),
        priceCents: priceCents ?? 0,
        access: (priceCents || 0) > 0 ? "paid" : "free",
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
            videoStorage: "plan_limit",
            liveSessionsPerMonth: "plan_limit"
          }
        }
      });

      Alert.alert("Course created", "Your course draft has been created.");
      if (navigation?.replace) {
        navigation.replace("CourseDetail", { course, id: course?._id || course?.id });
      } else if (router?.replace) {
        router.replace(backTarget);
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
          <Text style={styles.title}>Create Course</Text>
          <TouchableOpacity
            onPress={backToCourses}
            accessibilityRole="button"
            accessibilityLabel="Back to Courses"
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>Back to Courses</Text>
          </TouchableOpacity>
        </View>
        <PersonalFeedPlacement placement="top" routeKey="personal_course_create" />
        <View style={styles.workflowCard}>
          <Text style={styles.workflowTitle}>Course builder workflow</Text>
          <Text style={styles.helpText}>
            1. Course basics 2. Curriculum / lessons 3. Documents / media 4. Live sessions
            5. Links 6. Pricing / access 7. Preview / publish
          </Text>
        </View>
        {!access.canCreateCourses ? (
          <View style={styles.lockedCard}>
            <Text style={styles.lockedTitle}>Course creation unavailable</Text>
            <Text style={styles.helpText}>
              Sign in to an account with course access to create drafts.
            </Text>
          </View>
        ) : null}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>1. Course basics</Text>
          <Text style={styles.label}>Course title</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Enter a course title"
            editable={access.canCreateCourses && !submitting}
            style={styles.input}
            accessibilityLabel="Course title"
          />
          <Text style={styles.label}>Summary</Text>
          <TextInput
            value={summary}
            onChangeText={setSummary}
            placeholder="What learners will get from this course"
            multiline
            editable={access.canCreateCourses && !submitting}
            style={[styles.input, styles.multiline]}
            accessibilityLabel="Course summary"
          />
          <Text style={styles.label}>Description / outline</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Longer course description, outcomes, and prerequisites"
            multiline
            editable={access.canCreateCourses && !submitting}
            style={[styles.input, styles.multiline]}
            accessibilityLabel="Course description"
          />
          <Text style={styles.label}>Cover image URL</Text>
          <TextInput
            value={coverImageUrl}
            onChangeText={setCoverImageUrl}
            placeholder="Image URL or uploaded asset URL"
            editable={access.canCreateCourses && !submitting}
            style={styles.input}
            accessibilityLabel="Course cover image URL"
          />
          <Text style={styles.label}>Category</Text>
          <TextInput
            value={category}
            onChangeText={setCategory}
            placeholder="Plant health, living soil, lighting, business, etc."
            editable={access.canCreateCourses && !submitting}
            style={styles.input}
            accessibilityLabel="Course category"
          />
          <Text style={styles.label}>Difficulty</Text>
          <TextInput
            value={difficulty}
            onChangeText={setDifficulty}
            placeholder="Beginner, intermediate, advanced, or pro"
            editable={access.canCreateCourses && !submitting}
            style={styles.input}
            accessibilityLabel="Course difficulty"
          />
          <Text style={styles.label}>Crop type</Text>
          <TextInput
            value={cropType}
            onChangeText={setCropType}
            placeholder="Tomatoes, houseplants, microgreens, specialty crops, etc."
            editable={access.canCreateCourses && !submitting}
            style={styles.input}
            accessibilityLabel="Course crop type"
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>2. Curriculum / lessons</Text>
          <Text style={styles.helpText}>
            Put each lesson, assignment, checklist, or section on its own line.
          </Text>
          <TextInput
            value={curriculumPlan}
            onChangeText={setCurriculumPlan}
            placeholder={"Lesson 1: Soil basics\nLesson 2: Amendment timing"}
            multiline
            editable={access.canCreateCourses && !submitting}
            style={[styles.input, styles.multiline]}
            accessibilityLabel="Course curriculum lessons"
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>3. Documents / media</Text>
          <TextInput
            value={documentPlan}
            onChangeText={setDocumentPlan}
            placeholder="PDFs, worksheets, checklists, SOPs, or handouts"
            multiline
            editable={access.canCreateCourses && !submitting}
            style={[styles.input, styles.multiline]}
            accessibilityLabel="Course documents"
          />
          <TextInput
            value={mediaPlan}
            onChangeText={setMediaPlan}
            placeholder="Video topics, replay files, image sets, estimated storage needs"
            multiline
            editable={access.canCreateCourses && !submitting}
            style={[styles.input, styles.multiline]}
            accessibilityLabel="Course media plan"
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>4. Live sessions</Text>
          <TextInput
            value={liveSessionPlan}
            onChangeText={setLiveSessionPlan}
            placeholder="Live topics, schedule windows, duration, replay plan"
            multiline
            editable={access.canCreateCourses && !submitting}
            style={[styles.input, styles.multiline]}
            accessibilityLabel="Course live sessions"
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>5. Links</Text>
          <TextInput
            value={linkedProductIds}
            onChangeText={setLinkedProductIds}
            placeholder="Linked product IDs, one per line"
            multiline
            editable={access.canCreateCourses && !submitting}
            style={styles.input}
            accessibilityLabel="Linked product ids"
          />
          <TextInput
            value={linkedGrowIds}
            onChangeText={setLinkedGrowIds}
            placeholder="Linked grow IDs, one per line"
            multiline
            editable={access.canCreateCourses && !submitting}
            style={styles.input}
            accessibilityLabel="Linked grow ids"
          />
          <TextInput
            value={linkedForumThreadIds}
            onChangeText={setLinkedForumThreadIds}
            placeholder="Linked forum thread IDs, one per line"
            multiline
            editable={access.canCreateCourses && !submitting}
            style={styles.input}
            accessibilityLabel="Linked forum thread ids"
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>6. Pricing / access</Text>
          {!access.canSellPaidCourses ? (
            <Text style={styles.helpText}>Paid prices require COURSES_SELL_PAID.</Text>
          ) : null}
          <TextInput
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
            placeholder="0.00"
            editable={access.canCreateCourses && access.canSellPaidCourses && !submitting}
            style={styles.input}
            accessibilityLabel="Course price USD"
          />
          <Text style={styles.helpText}>
            Paid course limit:{" "}
            {access.maxPaidCourses === null ? "unlimited" : access.maxPaidCourses}
          </Text>
          <Text style={styles.helpText}>Lessons: 0 / plan limit</Text>
          <Text style={styles.helpText}>Storage used: 0 MB / plan limit</Text>
          <Text style={styles.helpText}>Live sessions this month: 0 / plan limit</Text>
          <Text style={styles.helpText}>Uploaded video storage: 0 GB / plan limit</Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>7. Preview / publish</Text>
          <Text style={styles.helpText}>
            This saves a draft. Use course detail to review, add uploaded assets, preview,
            and publish when the course is ready.
          </Text>
        </View>
        <PersonalFeedPlacement placement="bottom" routeKey="personal_course_create" />

        <TouchableOpacity
          onPress={submitCourse}
          disabled={!canSubmit}
          style={[styles.button, !canSubmit && styles.buttonDisabled]}
        >
          <Text style={styles.buttonText}>
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
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  multiline: { minHeight: 96, textAlignVertical: "top" },
  button: {
    marginTop: 8,
    backgroundColor: "#15803d",
    borderRadius: radius.card,
    paddingVertical: 12,
    alignItems: "center"
  },
  buttonDisabled: { opacity: 0.55 },
  buttonText: { color: "#fff", fontWeight: "800" },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#15803d",
    borderRadius: radius.card,
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
