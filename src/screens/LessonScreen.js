import React from "react";
import { View, Text, Linking, TouchableOpacity, StyleSheet, Alert } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import { completeLesson } from "../api/courses";

export default function LessonScreen({ route, navigation }) {
  const { lesson, courseId } = route.params;

  return (
    <ScreenContainer scroll>
      <Text style={styles.title}>{lesson.title}</Text>

      {/* VIDEO */}
      {lesson.videoUrl ? (
        <TouchableOpacity
          style={styles.videoLink}
          onPress={() => Linking.openURL(lesson.videoUrl)}
        >
          <Text style={styles.videoIcon}>▶️</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.videoTitle}>Watch Video Lesson</Text>
            <Text numberOfLines={1} style={styles.videoSubtitle}>
              {lesson.videoUrl}
            </Text>
          </View>
        </TouchableOpacity>
      ) : null}

      {/* PDF */}
      {lesson.pdfUrl ? (
        <Text
          style={styles.link}
          onPress={() => Linking.openURL(lesson.pdfUrl)}
        >
          📄 Open PDF Lesson
        </Text>
      ) : null}

      {/* TEXT */}
      {lesson.content ? (
        <Text style={styles.content}>{lesson.content}</Text>
      ) : null}

      {courseId && (
        <TouchableOpacity
          style={styles.completeBtn}
          onPress={async () => {
            try {
              await completeLesson(lesson._id, courseId);
              Alert.alert("Completed!", "Lesson marked as complete.");
              navigation.goBack();
            } catch (err) {
              Alert.alert("Error", err.message || "Failed to mark complete");
            }
          }}
        >
          <Text style={styles.completeText}>Mark as Complete</Text>
        </TouchableOpacity>
      )}
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
  videoIcon: { fontSize: 24, marginRight: 12 },
  videoTitle: { color: "#fff", fontWeight: "700", marginBottom: 4 },
  videoSubtitle: { color: "rgba(255,255,255,0.7)", fontSize: 12 },
  link: { color: "#3498db", marginBottom: 20, fontWeight: "600" },
  content: { fontSize: 16, lineHeight: 22 },
  completeBtn: {
    backgroundColor: "#2ecc71",
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  completeText: {
    color: "white",
    fontWeight: "700",
    textAlign: "center",
  },
});
