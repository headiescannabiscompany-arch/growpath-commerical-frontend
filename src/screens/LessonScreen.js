import React from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { completeLesson } from "../api/courses";
import { openCourseMedia } from "../api/uploads";
import ScreenContainer from "../components/ScreenContainer";
import AuthorizedCourseImage from "@/components/learning/AuthorizedCourseImage";
import LessonMediaCard from "@/components/learning/LessonMediaCard";
import { useEntitlements } from "@/entitlements";
import { getLearningAccess } from "@/features/learning/learningAccess";
import { lessonDocumentUrls } from "@/features/learning/lessonMedia";
import { radius } from "../theme/theme";

function lessonImageUrls(lesson) {
  if (!Array.isArray(lesson?.imageUrls)) return [];
  return [
    ...new Set(lesson.imageUrls.map((url) => String(url || "").trim()).filter(Boolean))
  ];
}

export default function LessonScreen({ route, navigation }) {
  const entitlements = useEntitlements();
  const access = getLearningAccess(entitlements);
  const { lesson, courseId, facilityManagedCourse = false } = route.params;
  const documentUrls = lessonDocumentUrls(lesson);
  const imageUrls = facilityManagedCourse ? lessonImageUrls(lesson) : [];

  if (!access.canViewCourses) {
    return (
      <ScreenContainer>
        <View style={styles.lockedCard}>
          <Text style={styles.title}>Lesson unavailable</Text>
          <Text>This account does not have COURSES_VIEW.</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll>
      <Text style={styles.title}>{lesson.title}</Text>

      <LessonMediaCard lesson={lesson} />

      {imageUrls.map((url, index) => (
        <AuthorizedCourseImage
          key={url}
          accessibilityLabel={`${lesson.title || "Lesson"} image ${index + 1}`}
          resizeMode="cover"
          uri={url}
          style={styles.lessonImage}
        />
      ))}

      {documentUrls.map((url, index) => {
        const legacySinglePdf =
          documentUrls.length === 1 && url === String(lesson.pdfUrl || "").trim();
        const label = legacySinglePdf
          ? "Open PDF Lesson"
          : documentUrls.length === 1
            ? "Open Lesson Document"
            : `Open Lesson Document ${index + 1} of ${documentUrls.length}`;
        return (
          <Text
            key={url}
            accessibilityRole="link"
            accessibilityLabel={label}
            style={styles.link}
            onPress={() =>
              openCourseMedia(url, {
                filename: legacySinglePdf ? "lesson.pdf" : `lesson-document-${index + 1}`,
                mimeType: legacySinglePdf ? "application/pdf" : ""
              }).catch((error) =>
                Alert.alert("Unable to open resource", error?.message || "Try again.")
              )
            }
          >
            {label}
          </Text>
        );
      })}

      {lesson.audioUrl ? (
        <Text
          style={styles.link}
          onPress={() =>
            openCourseMedia(lesson.audioUrl, {
              filename: "lesson-audio",
              mimeType: "audio/mpeg"
            }).catch((error) =>
              Alert.alert("Unable to open resource", error?.message || "Try again.")
            )
          }
        >
          Open Audio Lesson
        </Text>
      ) : null}

      {lesson.content ? <Text style={styles.content}>{lesson.content}</Text> : null}

      {courseId ? (
        <TouchableOpacity
          style={styles.completeBtn}
          onPress={async () => {
            try {
              await completeLesson(lesson._id, courseId);
              Alert.alert("Completed", "Lesson marked as complete.");
              navigation.goBack();
            } catch (err) {
              Alert.alert("Error", err.message || "Failed to mark complete");
            }
          }}
        >
          <Text style={styles.completeText}>Mark as Complete</Text>
        </TouchableOpacity>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: "700", marginBottom: 10 },
  lessonImage: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: radius.card,
    marginBottom: 12
  },
  link: { color: "#3498db", marginBottom: 20, fontWeight: "600" },
  content: { fontSize: 16, lineHeight: 22 },
  completeBtn: {
    backgroundColor: "#2ecc71",
    padding: 12,
    borderRadius: radius.card,
    marginTop: 20
  },
  completeText: {
    color: "white",
    fontWeight: "700",
    textAlign: "center"
  },
  lockedCard: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: radius.card,
    padding: 12
  }
});
