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

export default function CreateCourseScreen({ navigation }) {
  const router = useRouter();
  const entitlements = useEntitlements();
  const access = getLearningAccess(entitlements);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [cropType, setCropType] = useState("");
  const [curriculumPlan, setCurriculumPlan] = useState("");
  const [documentPlan, setDocumentPlan] = useState("");
  const [liveSessionPlan, setLiveSessionPlan] = useState("");
  const [price, setPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const priceCents = useMemo(() => toPriceCents(price.trim()), [price]);
  const canSubmit = access.canCreateCourses && title.trim().length >= 3 && !submitting;

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
      const course = await createCourse({
        title: title.trim(),
        summary: summary.trim(),
        description: description.trim(),
        category: category.trim(),
        difficulty: difficulty.trim(),
        cropType: cropType.trim(),
        curriculumPlan: curriculumPlan.trim(),
        documentPlan: documentPlan.trim(),
        liveSessionPlan: liveSessionPlan.trim(),
        priceCents: priceCents ?? 0,
        access: (priceCents || 0) > 0 ? "paid" : "free",
        isPublished: false,
        workspace: entitlements.mode || "personal"
      });

      Alert.alert("Course created", "Your course draft has been created.");
      if (navigation?.replace) {
        navigation.replace("CourseDetail", { course, id: course?._id || course?.id });
      } else if (router?.replace) {
        router.replace("/home/personal/courses");
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
        <Text style={styles.title}>Create Course</Text>
        <PersonalFeedPlacement placement="top" routeKey="personal_course_create" />
        <View style={styles.workflowCard}>
          <Text style={styles.workflowTitle}>Course builder workflow</Text>
          <Text style={styles.helpText}>
            Basics, curriculum, documents/media, optional live sessions, linked
            products/grows/forum, pricing/access, preview, then publish.
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
        <Text style={styles.label}>Course title</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Enter a course title"
          editable={access.canCreateCourses && !submitting}
          style={styles.input}
        />
        <Text style={styles.label}>Summary</Text>
        <TextInput
          value={summary}
          onChangeText={setSummary}
          placeholder="What learners will get from this course"
          multiline
          editable={access.canCreateCourses && !submitting}
          style={[styles.input, styles.multiline]}
        />
        <Text style={styles.label}>Description / outline</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Longer course description, outcomes, and prerequisites"
          multiline
          editable={access.canCreateCourses && !submitting}
          style={[styles.input, styles.multiline]}
        />
        <Text style={styles.label}>Category</Text>
        <TextInput
          value={category}
          onChangeText={setCategory}
          placeholder="Plant health, living soil, lighting, business, etc."
          editable={access.canCreateCourses && !submitting}
          style={styles.input}
        />
        <Text style={styles.label}>Difficulty</Text>
        <TextInput
          value={difficulty}
          onChangeText={setDifficulty}
          placeholder="Beginner, intermediate, advanced, or pro"
          editable={access.canCreateCourses && !submitting}
          style={styles.input}
        />
        <Text style={styles.label}>Crop type</Text>
        <TextInput
          value={cropType}
          onChangeText={setCropType}
          placeholder="Tomatoes, houseplants, microgreens, specialty crops, etc."
          editable={access.canCreateCourses && !submitting}
          style={styles.input}
        />
        <Text style={styles.label}>Curriculum / lessons</Text>
        <TextInput
          value={curriculumPlan}
          onChangeText={setCurriculumPlan}
          placeholder="Lesson titles, assignments, checklists, or sections"
          multiline
          editable={access.canCreateCourses && !submitting}
          style={[styles.input, styles.multiline]}
        />
        <Text style={styles.label}>Documents / media</Text>
        <TextInput
          value={documentPlan}
          onChangeText={setDocumentPlan}
          placeholder="PDFs, worksheets, images, videos, storage needs"
          multiline
          editable={access.canCreateCourses && !submitting}
          style={[styles.input, styles.multiline]}
        />
        <Text style={styles.label}>Live sessions, optional</Text>
        <TextInput
          value={liveSessionPlan}
          onChangeText={setLiveSessionPlan}
          placeholder="Live topics, schedule windows, duration, replay plan"
          multiline
          editable={access.canCreateCourses && !submitting}
          style={[styles.input, styles.multiline]}
        />
        <Text style={styles.label}>Price (USD)</Text>
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
        />
        <Text style={styles.helpText}>
          Paid course limit:{" "}
          {access.maxPaidCourses === null ? "unlimited" : access.maxPaidCourses}
        </Text>
        <Text style={styles.helpText}>Storage used: 0 MB / plan limit</Text>
        <Text style={styles.helpText}>Live sessions this month: 0 / plan limit</Text>
        <Text style={styles.helpText}>Uploaded video storage: 0 GB / plan limit</Text>
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
  helpText: { color: "#64748b", fontSize: 12 }
});
