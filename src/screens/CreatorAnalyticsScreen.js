import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import ScreenContainer from "../components/ScreenContainer.js";
import { getCreatorCourses, getCourseAnalytics } from "../api/creator.js";
import { radius } from "../theme/theme.js";

export default function CreatorAnalyticsScreen({ navigation }) {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  useEffect(() => {
    async function loadCourses() {
      setLoading(true);
      try {
        const res = await getCreatorCourses();
        setCourses(res.data || res);
      } finally {
        setLoading(false);
      }
    }
    loadCourses();
  }, []);

  const handleSelectCourse = async (course) => {
    setSelectedCourse(course);
    setLoadingAnalytics(true);
    try {
      const res = await getCourseAnalytics(course._id);
      setAnalytics(res.data || res);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const summary = analytics?.summary || analytics || {};
  const lessons = Array.isArray(analytics?.lessons) ? analytics.lessons : [];

  return (
    <ScreenContainer scroll>
      <Text style={styles.header}>Course Analytics</Text>
      {loading ? (
        <ActivityIndicator size="large" />
      ) : (
        <FlatList
          data={courses}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <Text style={styles.courseItem} onPress={() => handleSelectCourse(item)}>
              {item.title}
            </Text>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No courses found.</Text>}
        />
      )}
      {selectedCourse && (
        <View style={styles.analyticsCard}>
          <Text style={styles.analyticsTitle}>Analytics for: {selectedCourse.title}</Text>
          {loadingAnalytics ? (
            <ActivityIndicator size="small" />
          ) : analytics ? (
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
              {lessons.map((lesson) => (
                <View key={String(lesson.id)} style={styles.lessonRow}>
                  <Text style={styles.lessonTitle}>{lesson.title}</Text>
                  <Text style={styles.analyticsLabel}>
                    {lesson.views || 0} views | {lesson.completionRate || 0}% complete |{" "}
                    {lesson.dropoffs || 0} drop-offs
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

const styles = StyleSheet.create({
  header: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center"
  },
  courseItem: {
    fontSize: 16,
    padding: 12,
    backgroundColor: "#f3f4f6",
    borderRadius: radius.card,
    marginBottom: 8,
    color: "#111827"
  },
  empty: {
    textAlign: "center",
    color: "#888",
    marginTop: 40
  },
  analyticsCard: {
    backgroundColor: "#fff",
    borderRadius: radius.card,
    padding: 16,
    marginTop: 24,
    elevation: 2
  },
  analyticsTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10
  },
  analyticsLabel: {
    fontSize: 15,
    color: "#34495e",
    marginBottom: 6
  },
  lessonRow: { borderTopWidth: 1, borderTopColor: "#e5e7eb", paddingTop: 8 },
  lessonTitle: { fontSize: 15, fontWeight: "700", color: "#111827" }
});
