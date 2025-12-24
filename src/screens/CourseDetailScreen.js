import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
  Platform
} from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import Card from "../components/Card";
import PrimaryButton from "../components/PrimaryButton";
import { colors, spacing, radius } from "../theme/theme";
import { enroll, buyCourse } from "../api/courses";

export default function CourseDetailScreen({ route, navigation }) {
  const course = route.params.course;
  const [enrolled, setEnrolled] = useState(
    (course.students || []).includes(global.user?.id)
  );
  const [loading, setLoading] = useState(false);

  async function handleEnroll() {
    try {
      setLoading(true);

      if (course.priceCents === 0) {
        // Free course – enroll directly
        await enroll(course._id);
        setEnrolled(true);
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

  function openContent() {
    if (!course.contentUrl) {
      return Alert.alert("No content available");
    }
    Linking.openURL(course.contentUrl);
  }

  return (
    <ScreenContainer scroll>
      <Text style={styles.title}>{course.title}</Text>

      <Card style={{ marginBottom: spacing(5) }}>
        <Text style={styles.label}>By: {course.creator?.name || "Unknown"}</Text>

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
          <PrimaryButton title="Open Course" onPress={openContent} />
        )}
      </Card>
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
  }
});
