import React from "react";
import { Alert, Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { completeLesson } from "../api/courses";
import ScreenContainer from "../components/ScreenContainer";
import { useEntitlements } from "@/entitlements";
import { getLearningAccess } from "@/features/learning/learningAccess";

export default function LessonScreen({ route, navigation }) {
  const entitlements = useEntitlements();
  const access = getLearningAccess(entitlements);
  const { lesson, courseId } = route.params;

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

      {lesson.videoUrl ? (
        <TouchableOpacity
          style={styles.videoLink}
          onPress={() => Linking.openURL(lesson.videoUrl)}
        >
          <Text style={styles.videoIcon}>Play</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.videoTitle}>Watch Video Lesson</Text>
            <Text numberOfLines={1} style={styles.videoSubtitle}>
              {lesson.videoUrl}
            </Text>
          </View>
        </TouchableOpacity>
      ) : null}

      {lesson.pdfUrl ? (
        <Text style={styles.link} onPress={() => Linking.openURL(lesson.pdfUrl)}>
          Open PDF Lesson
        </Text>
      ) : null}

      {lesson.audioUrl ? (
        <Text style={styles.link} onPress={() => Linking.openURL(lesson.audioUrl)}>
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
  videoLink: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111827",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20
  },
  videoIcon: { color: "#fff", fontWeight: "800", marginRight: 12 },
  videoTitle: { color: "#fff", fontWeight: "700", marginBottom: 4 },
  videoSubtitle: { color: "rgba(255,255,255,0.7)", fontSize: 12 },
  link: { color: "#3498db", marginBottom: 20, fontWeight: "600" },
  content: { fontSize: 16, lineHeight: 22 },
  completeBtn: {
    backgroundColor: "#2ecc71",
    padding: 12,
    borderRadius: 8,
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
    borderRadius: 8,
    padding: 12
  }
});
