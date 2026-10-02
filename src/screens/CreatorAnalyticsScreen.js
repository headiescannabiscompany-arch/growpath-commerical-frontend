import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Pressable
} from "react-native";
import ScreenContainer from "../components/ScreenContainer.js";
import { getCreatorCourses, getCourseAnalytics } from "../api/creator.js";
import { useAppTheme } from "../theme/appTheme";
import { radius } from "../theme/theme.js";

function courseIdentity(course) {
  const id = course?.id ?? course?._id;
  return typeof id === "string" && id.trim() ? id : null;
}

function readAnalytics(response) {
  const value = response?.data ?? response;
  const validLessons = (rows) =>
    Array.isArray(rows) &&
    rows.every(
      (row) =>
        row && typeof row === "object" && !Array.isArray(row) && courseIdentity(row)
    );
  // The current creator endpoint returns lesson rows, not course financial totals.
  if (validLessons(value)) return { summary: null, lessons: value };
  if (value && typeof value === "object" && !Array.isArray(value.summary)) {
    const summary = value.summary ?? value;
    if (
      summary &&
      typeof summary === "object" &&
      ["views", "enrollments", "sales", "completions"].some((key) => key in summary)
    ) {
      if (value.lessons !== undefined && !validLessons(value.lessons)) {
        throw new Error("Invalid lesson analytics");
      }
      return { summary, lessons: value.lessons ?? [] };
    }
  }
  throw new Error("Invalid analytics response");
}

export default function CreatorAnalyticsScreen() {
  const { palette } = useAppTheme();
  const styles = createCreatorAnalyticsStyles(palette);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [listError, setListError] = useState(false);
  const [analyticsError, setAnalyticsError] = useState(false);
  const mounted = useRef(false);
  const listInFlight = useRef(false);
  const selectionRequest = useRef(0);
  const activeCourse = useRef(null);

  const loadCourses = useCallback(async () => {
    if (listInFlight.current) return;
    listInFlight.current = true;
    setLoading(true);
    setListError(false);
    try {
      const res = await getCreatorCourses();
      const rows = res?.data ?? res;
      if (!Array.isArray(rows) || rows.some((row) => !courseIdentity(row))) {
        throw new Error("Invalid course list");
      }
      if (mounted.current) setCourses(rows);
    } catch {
      if (mounted.current) setListError(true);
    } finally {
      listInFlight.current = false;
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    loadCourses();
    return () => {
      mounted.current = false;
      selectionRequest.current += 1;
    };
  }, [loadCourses]);

  const handleSelectCourse = async (course) => {
    const id = courseIdentity(course);
    if (!id || activeCourse.current === id) return;
    activeCourse.current = id;
    const request = ++selectionRequest.current;
    setSelectedCourse(course);
    setAnalytics(null);
    setAnalyticsError(false);
    setLoadingAnalytics(true);
    try {
      const res = await getCourseAnalytics(id);
      const result = readAnalytics(res);
      if (mounted.current && request === selectionRequest.current) setAnalytics(result);
    } catch {
      if (mounted.current && request === selectionRequest.current)
        setAnalyticsError(true);
    } finally {
      if (mounted.current && request === selectionRequest.current) {
        activeCourse.current = null;
        setLoadingAnalytics(false);
      }
    }
  };

  const summary = analytics?.summary;
  const lessons = Array.isArray(analytics?.lessons) ? analytics.lessons : [];

  return (
    <ScreenContainer scroll>
      <Text accessibilityRole="header" aria-level={1} style={styles.header}>
        Course Analytics
      </Text>
      {loading ? (
        <ActivityIndicator size="large" color={palette.accent} />
      ) : listError ? (
        <View>
          <Text accessibilityRole="alert" style={styles.empty}>
            Courses could not load. Try again; this does not mean you have no courses.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry analytics course list"
            style={styles.courseItem}
            onPress={loadCourses}
          >
            <Text style={styles.courseItemText}>Retry courses</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={courses}
          keyExtractor={courseIdentity}
          renderItem={({ item }) => (
            <Pressable
              style={styles.courseItem}
              onPress={() => handleSelectCourse(item)}
              accessibilityRole="button"
              accessibilityLabel={`View analytics for ${item.title}`}
              accessibilityState={{
                selected: courseIdentity(selectedCourse) === courseIdentity(item)
              }}
            >
              <Text style={styles.courseItemText}>{item.title}</Text>
            </Pressable>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No courses found.</Text>}
        />
      )}
      {selectedCourse && (
        <View style={styles.analyticsCard}>
          <Text accessibilityRole="header" aria-level={2} style={styles.analyticsTitle}>
            Analytics for: {selectedCourse.title}
          </Text>
          {loadingAnalytics ? (
            <ActivityIndicator size="small" color={palette.accent} />
          ) : analyticsError ? (
            <View>
              <Text accessibilityRole="alert" style={styles.empty}>
                Analytics could not load for this course. No totals are available yet.
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Retry selected course analytics"
                style={styles.courseItem}
                onPress={() => handleSelectCourse(selectedCourse)}
              >
                <Text style={styles.courseItemText}>Retry analytics</Text>
              </Pressable>
            </View>
          ) : analytics ? (
            <>
              {summary ? (
                <>
                  <Text style={styles.analyticsLabel}>
                    Views: {summary.views || 0} ({summary.uniqueViewers || 0} unique)
                  </Text>
                  <Text style={styles.analyticsLabel}>
                    Enrollments: {summary.enrollments || 0}
                  </Text>
                  <Text style={styles.analyticsLabel}>
                    Completions: {summary.completions || 0}
                  </Text>
                  <Text style={styles.analyticsLabel}>
                    Average Progress: {summary.avgProgress || 0}%
                  </Text>
                  <Text style={styles.analyticsLabel}>
                    Sales: {summary.sales || 0} | Gross: $
                    {Number(summary.grossSales || 0).toFixed(2)} | Earnings: $
                    {Number(summary.creatorEarnings || 0).toFixed(2)}
                  </Text>
                  <Text style={styles.analyticsLabel}>
                    Assignment Tasks: {summary.assignmentTasksCompleted || 0}/
                    {summary.assignmentTasks || 0} complete
                  </Text>
                  <Text style={styles.analyticsLabel}>
                    Live RSVPs: {summary.liveRsvps || 0} | Product Clicks:{" "}
                    {summary.productClicks || 0}
                  </Text>
                  <Text style={styles.analyticsLabel}>
                    Questions: {summary.questions || 0} | Unanswered:{" "}
                    {summary.unansweredQuestions || 0}
                  </Text>
                </>
              ) : (
                <Text style={styles.analyticsLabel}>
                  Course totals are not provided by this report. Available lesson metrics
                  are shown below.
                </Text>
              )}
              {!lessons.length && (
                <Text style={styles.analyticsLabel}>No lesson analytics recorded.</Text>
              )}
              {lessons.map((lesson) => (
                <View key={courseIdentity(lesson)} style={styles.lessonRow}>
                  <Text style={styles.lessonTitle}>{lesson.title}</Text>
                  <Text style={styles.analyticsLabel}>
                    {lesson.views || 0} views | {lesson.completionRate || 0}% complete |{" "}
                    {typeof lesson.dropoffs === "number"
                      ? `${lesson.dropoffs} drop-offs`
                      : "Drop-offs not reported"}
                  </Text>
                </View>
              ))}
            </>
          ) : (
            <Text style={styles.empty}>No analytics data.</Text>
          )}
        </View>
      )}
    </ScreenContainer>
  );
}

export function createCreatorAnalyticsStyles(palette) {
  return StyleSheet.create({
    header: {
      fontSize: 24,
      fontWeight: "700",
      marginBottom: 16,
      textAlign: "center",
      color: palette.text
    },
    courseItem: {
      padding: 12,
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderWidth: 1,
      borderRadius: radius.card,
      marginBottom: 8
    },
    courseItemText: { fontSize: 16, color: palette.text },
    empty: {
      textAlign: "center",
      color: palette.textMuted,
      marginTop: 40
    },
    analyticsCard: {
      backgroundColor: palette.card,
      borderColor: palette.border,
      borderWidth: 1,
      borderRadius: radius.card,
      padding: 16,
      marginTop: 24,
      elevation: 2
    },
    analyticsTitle: {
      fontSize: 18,
      fontWeight: "700",
      marginBottom: 10,
      color: palette.text
    },
    analyticsLabel: {
      fontSize: 15,
      color: palette.textSoft,
      marginBottom: 6
    },
    lessonRow: { borderTopWidth: 1, borderTopColor: palette.border, paddingTop: 8 },
    lessonTitle: { fontSize: 15, fontWeight: "700", color: palette.text }
  });
}
