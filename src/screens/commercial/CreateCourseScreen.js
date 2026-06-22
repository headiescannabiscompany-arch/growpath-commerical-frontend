import React, { useMemo, useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import ScreenContainer from "../../components/ScreenContainer";
import { createCourse } from "@/api/courses";
import { useEntitlements } from "@/entitlements";
import { getLearningAccess } from "@/features/learning/learningAccess";

function toPriceCents(input) {
  const n = Number(input);
  if (Number.isNaN(n) || n < 0) return null;
  return Math.round(n * 100);
}

export default function CreateCourseScreen({ navigation }) {
  const entitlements = useEntitlements();
  const access = getLearningAccess(entitlements);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [price, setPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const priceCents = useMemo(() => toPriceCents(price.trim()), [price]);
  const canSubmit = access.canCreateCourses && title.trim().length >= 3 && !submitting;

  async function submitCourse() {
    if (!canSubmit) return;
    if (!access.canCreateCourses) {
      Alert.alert("Unavailable", "Creating courses requires COURSES_CREATE.");
      return;
    }
    if (price.trim() && priceCents == null) {
      Alert.alert("Invalid price", "Price must be a number greater than or equal to 0.");
      return;
    }
    if ((priceCents || 0) > 0 && !access.canSellPaidCourses) {
      Alert.alert("Paid courses unavailable", "Paid course sales require COURSES_SELL_PAID.");
      return;
    }

    setSubmitting(true);
    try {
      const course = await createCourse({
        title: title.trim(),
        summary: summary.trim(),
        priceCents: priceCents ?? 0,
        isPublished: false,
        workspace: "commercial"
      });

      Alert.alert("Course created", "Your course draft has been created.");
      if (navigation?.replace) {
        navigation.replace("CourseDetail", { course, id: course?._id || course?.id });
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
    <ScreenContainer>
      <View style={styles.container}>
        <Text style={styles.title}>Create Course</Text>
        {!access.canCreateCourses ? (
          <View style={styles.lockedCard}>
            <Text style={styles.lockedTitle}>Course creation unavailable</Text>
            <Text style={styles.helpText}>This account does not have COURSES_CREATE.</Text>
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
        <Text style={styles.helpText}>
          Lesson limit per course:{" "}
          {access.maxLessonsPerCourse === null ? "unlimited" : access.maxLessonsPerCourse}
        </Text>

        <TouchableOpacity
          onPress={submitCourse}
          disabled={!canSubmit}
          style={[styles.button, !canSubmit && styles.buttonDisabled]}
        >
          <Text style={styles.buttonText}>{submitting ? "Creating..." : "Create Draft"}</Text>
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
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  multiline: { minHeight: 96, textAlignVertical: "top" },
  button: {
    marginTop: 8,
    backgroundColor: "#15803d",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center"
  },
  buttonDisabled: { opacity: 0.55 },
  buttonText: { color: "#fff", fontWeight: "800" },
  lockedCard: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#f8fafc"
  },
  lockedTitle: { fontWeight: "800" },
  helpText: { color: "#64748b", fontSize: 12 }
});
