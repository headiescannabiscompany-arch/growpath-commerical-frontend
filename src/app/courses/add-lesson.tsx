import React from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ScreenBoundary } from "@/components/ScreenBoundary";
import AddLessonScreen from "@/screens/AddLessonScreen";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

export default function AddLessonRoute() {
  const router = useRouter();
  const { palette } = useAppTheme();
  const styles = createStyles(palette);
  const params = useLocalSearchParams();
  const rawCourseId = params.courseId;
  const courseId = Array.isArray(rawCourseId) ? rawCourseId[0] : rawCourseId;
  const rawFrom = params.from;
  const from = Array.isArray(rawFrom) ? rawFrom[0] : rawFrom;
  const backTarget = from || "/home/personal/courses";

  if (!courseId) {
    return (
      <ScreenBoundary title="Add Lesson" showBack backFallbackHref={backTarget}>
        <View style={styles.missingCard}>
          <Text accessibilityRole="header" aria-level={1} style={styles.missingTitle}>
            Select a course before adding a lesson
          </Text>
          <Text style={styles.missingText}>
            Open one of your courses, then choose its Add Lesson action so the lesson is
            saved to the correct course.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Browse courses"
            onPress={() => router.replace(backTarget)}
            style={styles.returnButton}
          >
            <Text style={styles.returnText}>Browse Courses</Text>
          </Pressable>
        </View>
      </ScreenBoundary>
    );
  }

  return (
    <ScreenBoundary title="Add Lesson" showBack backFallbackHref={backTarget}>
      <AddLessonScreen
        route={{ params: { courseId } }}
        navigation={{ goBack: () => router.replace(backTarget) }}
      />
    </ScreenBoundary>
  );
}

export function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    missingCard: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 10,
      margin: 16,
      padding: 16
    },
    missingTitle: { color: palette.text, fontSize: 20, fontWeight: "800" },
    missingText: { color: palette.textMuted, lineHeight: 21 },
    returnButton: {
      alignItems: "center",
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      paddingHorizontal: 14,
      paddingVertical: 11
    },
    returnText: { color: palette.accentText, fontWeight: "800" }
  });
}
