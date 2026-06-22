import React, { useEffect, useState } from "react";
import { Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import GrowInterestPicker from "../components/GrowInterestPicker";
import { updateLesson } from "../api/courses";
import { useEntitlements } from "@/entitlements";
import { getLearningAccess } from "@/features/learning/learningAccess";
import { buildEmptyTierSelection, flattenTierSelections, groupTagsByTier } from "../utils/growInterests";

export default function EditLessonScreen({ route, navigation }) {
  const entitlements = useEntitlements();
  const access = getLearningAccess(entitlements);
  const { lessonId } = route.params;

  const [lesson, setLesson] = useState(null);
  const [title, setTitle] = useState("");
  const [order, setOrder] = useState("");
  const [content, setContent] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
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
      setVideoUrl(l.videoUrl || "");
      setPdfUrl(l.pdfUrl || "");
      setGrowInterestSelections(groupTagsByTier(l.growTags || []));
    } else {
      Alert.alert("Missing lesson data");
      navigation.goBack();
    }
  }, []);

  async function submit() {
    if (!access.canCreateCourses) {
      return Alert.alert("Unavailable", "Editing lessons requires COURSES_CREATE.");
    }
    await updateLesson(lessonId, {
      title,
      order: order ? Number(order) : 1,
      content,
      videoUrl,
      pdfUrl,
      growTags: flattenTierSelections(growInterestSelections)
    });

    navigation.goBack();
  }

  if (!lesson) return <ScreenContainer><Text>Loading…</Text></ScreenContainer>;

  return (
    <ScreenContainer scroll>
      <Text style={styles.header}>Edit Lesson</Text>
      {!access.canCreateCourses ? (
        <Text style={styles.helpText}>This account does not have COURSES_CREATE.</Text>
      ) : null}
      <Text style={styles.helpText}>
        Lesson limit per course:{" "}
        {access.maxLessonsPerCourse === null ? "unlimited" : access.maxLessonsPerCourse}
      </Text>

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

      <Text style={styles.label}>Video URL</Text>
      <TextInput
        style={styles.input}
        value={videoUrl}
        onChangeText={setVideoUrl}
        editable={access.canCreateCourses}
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

      <TouchableOpacity
        style={[styles.btn, !access.canCreateCourses && styles.disabled]}
        onPress={submit}
        disabled={!access.canCreateCourses}
      >
        <Text style={styles.btnText}>Save Changes</Text>
      </TouchableOpacity>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { fontSize: 22, fontWeight: "700", marginBottom: 10 },
  label: { marginTop: 10, marginBottom: 4, fontWeight: "600" },
  input: {
    backgroundColor: "#eee",
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  textBox: {
    height: 120,
    textAlignVertical: "top",
  },
  btn: {
    marginTop: 16,
    backgroundColor: "#2ecc71",
    paddingVertical: 12,
    borderRadius: 8,
  },
  btnText: {
    textAlign: "center",
    color: "white",
    fontWeight: "700",
    fontSize: 16,
  },
  helpText: { color: "#64748b", fontSize: 12, marginBottom: 8 },
  disabled: { opacity: 0.5 },
});
