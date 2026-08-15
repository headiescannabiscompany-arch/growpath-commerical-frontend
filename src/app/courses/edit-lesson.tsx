import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { getCourse } from "@/api/courses";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import EditLessonScreen from "@/screens/EditLessonScreen";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

function valueOf(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

function courseFromResponse(response: any) {
  return response?.course || response?.data?.course || response?.data || response || null;
}

function rowId(value: any) {
  return String(value?._id || value?.id || "");
}

export default function EditLessonRoute() {
  const params = useLocalSearchParams<{
    courseId?: string | string[];
    lessonId?: string | string[];
    from?: string | string[];
  }>();
  const router = useRouter();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const courseId = valueOf(params.courseId);
  const lessonId = valueOf(params.lessonId);
  const backTarget =
    valueOf(params.from) ||
    (courseId ? `/courses?courseId=${encodeURIComponent(courseId)}` : "/courses");
  const [lesson, setLesson] = useState<any>(null);
  const [loading, setLoading] = useState(Boolean(courseId && lessonId));
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    if (!courseId || !lessonId) {
      setLoading(false);
      return () => {
        active = false;
      };
    }

    setLoading(true);
    setError("");
    getCourse(courseId)
      .then((response: any) => {
        if (!active) return;
        const course = courseFromResponse(response);
        const lessons = Array.isArray(course?.lessons) ? course.lessons : [];
        const match = lessons.find((item: any) => rowId(item) === lessonId) || null;
        if (!match)
          throw new Error("This lesson could not be found in the selected course.");
        setLesson(match);
      })
      .catch((reason: any) => {
        if (active) setError(reason?.message || "Unable to load this lesson.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [courseId, lessonId]);

  return (
    <ScreenBoundary
      title="Edit Lesson"
      showBack
      backFallbackHref={backTarget}
      preferBackFallback
    >
      {loading ? (
        <View style={styles.stateCard}>
          <ActivityIndicator
            accessibilityLabel="Loading lesson editor"
            color={palette.accent}
          />
          <Text style={styles.stateText}>Loading lesson…</Text>
        </View>
      ) : lesson ? (
        <EditLessonScreen
          route={{ params: { courseId, lessonId, lesson } }}
          navigation={{ goBack: () => router.replace(backTarget as any) }}
        />
      ) : (
        <View style={styles.stateCard}>
          <Text accessibilityRole="header" aria-level={1} style={styles.stateTitle}>
            Lesson editor unavailable
          </Text>
          <Text style={styles.stateText}>
            {error || "Open a saved lesson from one of your courses before editing it."}
          </Text>
          <Pressable
            accessibilityLabel="Return to courses"
            accessibilityRole="button"
            onPress={() => router.replace(backTarget as any)}
            style={styles.returnButton}
          >
            <Text style={styles.returnText}>Return to Courses</Text>
          </Pressable>
        </View>
      )}
    </ScreenBoundary>
  );
}

export function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    stateCard: {
      alignItems: "flex-start",
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 10,
      margin: 16,
      padding: 16
    },
    stateTitle: { color: palette.text, fontSize: 20, fontWeight: "800" },
    stateText: { color: palette.textMuted, lineHeight: 21 },
    returnButton: {
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      paddingHorizontal: 14,
      paddingVertical: 11
    },
    returnText: { color: palette.accentText, fontWeight: "800" }
  });
}
