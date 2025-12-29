import React, { useState } from "react";
import { View, Text, StyleSheet, Linking, Alert, Modal, TouchableOpacity } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import Card from "../components/Card";
import PrimaryButton from "../components/PrimaryButton";
import { colors, spacing } from "../theme/theme";
import { enrollInCourse, buyCourse, getCourse } from "../api/courses";
import { getCreatorName } from "../utils/creator";

export default function CourseDetailScreen({ route, navigation }) {
  const initialCourse = route.params.course;
  const [course, setCourse] = useState(initialCourse);
  const [enrolled, setEnrolled] = useState(
    (initialCourse.students || []).includes(global.user?.id)
  );
  const [loading, setLoading] = useState(false);
  const [emptyModalVisible, setEmptyModalVisible] = useState(false);
  const [externalModalVisible, setExternalModalVisible] = useState(false);
  const [pendingContentUrl, setPendingContentUrl] = useState(null);

  async function handleEnroll() {
    try {
      setLoading(true);

      if (course.priceCents === 0) {
        // Free course – enroll directly
        await enrollInCourse(course._id);
        setEnrolled(true);
        const refreshed = await getCourse(course._id);
        const nextCourse = refreshed?.course || refreshed;
        if (nextCourse) {
          setCourse((prev) => ({ ...prev, ...nextCourse }));
        }
        Alert.alert("Success", "You now own this course!");
        return;
      }

      // Paid course – Stripe Checkout
      const data = await buyCourse(course._id);
      if (data.url) {
        Linking.openURL(data.url);
      } else {
        Alert.alert("Error", data.error || "Failed to start checkout");
      }
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  }

  async function openCourse() {
    try {
      console.log("Open course pressed for", course._id);
      const detail = await getCourse(course._id);
      const payload = detail?.course || detail;
      if (payload) {
        setCourse((prev) => ({ ...prev, ...payload }));
      }

      const lessons = detail?.lessons || payload?.lessons || [];
      console.log("Course detail refresh:", {
        lessons: lessons.length,
        hasContentUrl: !!payload?.contentUrl
      });
      if (lessons.length === 0) {
        if (payload?.contentUrl) {
          setPendingContentUrl(payload.contentUrl);
          setExternalModalVisible(true);
          return;
        }

        setEmptyModalVisible(true);
        return;
      }

      navigation.navigate("Course", { id: course._id });
    } catch (err) {
      console.error("Open course failed:", err);
      Alert.alert("Error", err.message || "Failed to open course");
    }
  }

  return (
    <ScreenContainer scroll>
      <Text style={styles.title}>{course.title}</Text>

      <Card style={{ marginBottom: spacing(5) }}>
        <Text style={styles.label}>By: {getCreatorName(course.creator)}</Text>

        <Text style={styles.description}>{course.description}</Text>

        <Text style={styles.price}>
          {course.priceCents > 0
            ? `$${(course.priceCents / 100).toFixed(2)}`
            : "FREE"}
        </Text>

        {!enrolled ? (
          <PrimaryButton
            title={loading ? "Processing..." : (course.priceCents > 0 ? "Buy Course" : "Enroll")}
            onPress={handleEnroll}
            disabled={loading}
          />
        ) : (
          <PrimaryButton title="Open Course" onPress={openCourse} />
        )}
      </Card>

      <Modal
        visible={emptyModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEmptyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Empty Course</Text>
            <Text style={styles.modalText}>
              This creator hasn't added any in-app lessons yet. You can still open the course to see
              its overview and Q&A.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => setEmptyModalVisible(false)}
              >
                <Text style={styles.modalButtonTextSecondary}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={() => {
                  setEmptyModalVisible(false);
                  navigation.navigate("Course", { id: course._id });
                }}
              >
                <Text style={styles.modalButtonTextPrimary}>Open Course</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={externalModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setExternalModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>External Course Content</Text>
            <Text style={styles.modalText}>
              This course hosts its lessons outside the app. Opening the content link will take you
              to the creator's site.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => setExternalModalVisible(false)}
              >
                <Text style={styles.modalButtonTextSecondary}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={() => {
                  const url = pendingContentUrl;
                  setExternalModalVisible(false);
                  setPendingContentUrl(null);
                  if (url) {
                    Linking.openURL(url);
                  }
                }}
              >
                <Text style={styles.modalButtonTextPrimary}>Open Link</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 26,
    fontWeight: "700",
    marginBottom: spacing(6)
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing(2)
  },
  description: {
    color: colors.textSoft,
    marginBottom: spacing(4)
  },
  price: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.accent,
    marginBottom: spacing(4)
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "100%"
  },
  modalTitle: { fontSize: 20, fontWeight: "700", marginBottom: 12 },
  modalText: { fontSize: 15, color: colors.text, marginBottom: 16 },
  modalActions: { flexDirection: "row", justifyContent: "flex-end" },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginLeft: 12
  },
  modalButtonSecondary: {
    backgroundColor: "#EEF2F7"
  },
  modalButtonPrimary: {
    backgroundColor: colors.accent
  },
  modalButtonTextPrimary: {
    color: "#fff",
    fontWeight: "700"
  },
  modalButtonTextSecondary: {
    color: colors.text,
    fontWeight: "600"
  }
});
