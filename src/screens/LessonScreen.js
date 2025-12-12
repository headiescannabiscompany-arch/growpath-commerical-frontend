import React from "react";
import { View, Text, Linking, TouchableOpacity, StyleSheet, Alert } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import { Video } from "expo-av";
import { completeLesson } from "../api/courses";

export default function LessonScreen({ route, navigation }) {
  const { lesson, courseId } = route.params;

  return (
    <ScreenContainer scroll>
      <Text style={styles.title}>{lesson.title}</Text>

      {/* VIDEO */}
      {lesson.videoUrl ? (
        <Video
          source={{ uri: lesson.videoUrl }}
          style={styles.video}
          useNativeControls
          resizeMode="contain"
          onPlaybackStatusUpdate={(status) => {
            if (status.isLoaded && status.durationMillis > 0) {
              const progress = status.positionMillis / status.durationMillis;
              if (progress > 0.9 && courseId) {
                completeLesson(lesson._id, courseId).catch(err => {
                  // Silent fail on auto-complete
                  console.log("Auto-complete error:", err.message);
                });
              }
            }
          }}
        />
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
  video: { width: "100%", height: 220, borderRadius: 10, marginBottom: 20 },
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