import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import {
  getEarnings,
  getCreatorCourses,
  getEnrollmentTimeline,
  getRevenueTimeline,
  getCourseAnalytics,
} from "../api/creator";
import { LineChart, BarChart } from "react-native-chart-kit";

const screenWidth = Dimensions.get("window").width;

export default function CreatorDashboardV2({ navigation }) {
  const [earnings, setEarnings] = useState(null);
  const [courses, setCourses] = useState([]);
  const [enrollmentTimeline, setEnrollmentTimeline] = useState({});
  const [revenueTimeline, setRevenueTimeline] = useState({});
  const [lessonAnalytics, setLessonAnalytics] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const [e, c, tEnroll, tRev] = await Promise.all([
        getEarnings(),
        getCreatorCourses(),
        getEnrollmentTimeline(),
        getRevenueTimeline(),
      ]);

      setEarnings(e.data || e);
      setCourses(c.data || c);
      setEnrollmentTimeline(tEnroll.data || tEnroll);
      setRevenueTimeline(tRev.data || tRev);

      if ((c.data || c).length > 0) {
        const firstCourseId = (c.data || c)[0].id;
        setSelectedCourseId(firstCourseId);
        const analyticsRes = await getCourseAnalytics(firstCourseId);
        setLessonAnalytics(analyticsRes.data || analyticsRes);
      }

      setLoading(false);
    } catch (err) {
      console.log("Error loading dashboard:", err.message);
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function changeCourse(courseId) {
    try {
      setSelectedCourseId(courseId);
      const analyticsRes = await getCourseAnalytics(courseId);
      setLessonAnalytics(analyticsRes.data || analyticsRes);
    } catch (err) {
      console.log("Error loading course analytics:", err.message);
    }
  }

  if (loading || !earnings) {
    return (
      <ScreenContainer>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Loading analytics…</Text>
        </View>
      </ScreenContainer>
    );
  }

  // Convert timelines to chart data
  const revenueDates = Object.keys(revenueTimeline).slice(-14); // Last 14 days
  const revenueValues = revenueDates.map((d) => revenueTimeline[d] || 0);

  const enrollDates = Object.keys(enrollmentTimeline).slice(-14);
  const enrollValues = enrollDates.map((d) => enrollmentTimeline[d] || 0);

  const lessonLabels = lessonAnalytics.map((l) =>
    l.title.length > 10 ? l.title.slice(0, 10) + "…" : l.title
  );
  const lessonCompletionRates = lessonAnalytics.map((l) => l.completionRate || 0);

  const chartConfig = {
    backgroundGradientFrom: "#ffffff",
    backgroundGradientTo: "#ffffff",
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(46, 204, 113, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(100, 100, 100, ${opacity})`,
    propsForDots: {
      r: "4",
      strokeWidth: "2",
      stroke: "#27ae60",
    },
    propsForLabels: {
      fontSize: 11,
    },
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Creator Dashboard</Text>

        {/* Earnings Summary Card */}
        <View style={styles.earningsCard}>
          <View>
            <Text style={styles.summaryLabel}>Total Earnings</Text>
            <Text style={styles.totalAmount}>
              ${(earnings.total || 0).toFixed(2)}
            </Text>
            <Text style={styles.feeText}>
              Platform Fees: ${(earnings.totalFees || 0).toFixed(2)}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.payoutButton}
            onPress={() => navigation.navigate("CreatorPayouts")}
          >
            <Text style={styles.payoutButtonText}>View Payout Details →</Text>
          </TouchableOpacity>
        </View>

        {/* Revenue Trend Chart */}
        {revenueDates.length > 0 && revenueValues.some((v) => v > 0) && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>📈 Revenue Trend (Last 14 days)</Text>
            <LineChart
              data={{
                labels: revenueDates.map((d) => d.slice(5)), // MM-DD format
                datasets: [
                  {
                    data:
                      revenueValues.length > 0 && revenueValues.some((v) => v > 0)
                        ? revenueValues
                        : [0],
                  },
                ],
              }}
              width={screenWidth - 40}
              height={240}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
            />
          </View>
        )}

        {/* Enrollments Trend Chart */}
        {enrollDates.length > 0 && enrollValues.some((v) => v > 0) && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>
              👥 Enrollments Trend (Last 14 days)
            </Text>
            <LineChart
              data={{
                labels: enrollDates.map((d) => d.slice(5)), // MM-DD format
                datasets: [
                  {
                    data:
                      enrollValues.length > 0 && enrollValues.some((v) => v > 0)
                        ? enrollValues
                        : [0],
                  },
                ],
              }}
              width={screenWidth - 40}
              height={240}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
            />
          </View>
        )}

        {/* Course Selector */}
        {courses.length > 0 && (
          <View style={styles.courseSelectorContainer}>
            <Text style={styles.selectorLabel}>Select Course for Details</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.courseScroll}
            >
              {courses.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[
                    styles.courseCard,
                    selectedCourseId === c.id && styles.courseCardActive,
                  ]}
                  onPress={() => changeCourse(c.id)}
                >
                  <Text style={styles.courseCardTitle} numberOfLines={2}>
                    {c.title}
                  </Text>
                  <Text style={styles.courseCardStat}>👥 {c.enrollments}</Text>
                  <Text style={styles.courseCardStat}>
                    ⭐ {c.rating.toFixed(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Lesson Completion Chart */}
        {lessonLabels.length > 0 && lessonCompletionRates.some((v) => v > 0) && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>📚 Lesson Completion Rates</Text>
            <BarChart
              data={{
                labels: lessonLabels,
                datasets: [
                  {
                    data:
                      lessonCompletionRates.length > 0
                        ? lessonCompletionRates
                        : [0],
                  },
                ],
              }}
              width={screenWidth - 40}
              height={240}
              yAxisLabel=""
              yAxisSuffix="%"
              chartConfig={chartConfig}
              style={styles.chart}
            />
          </View>
        )}

        {/* Lesson Details Table */}
        {lessonAnalytics.length > 0 && selectedCourseId && (
          <View style={styles.detailsCard}>
            <Text style={styles.detailsTitle}>📊 Lesson Analytics Details</Text>
            {lessonAnalytics.map((lesson, idx) => (
              <View key={lesson.lessonId || idx} style={styles.lessonRow}>
                <View style={styles.lessonInfo}>
                  <Text style={styles.lessonName} numberOfLines={2}>
                    {lesson.title}
                  </Text>
                  <Text style={styles.lessonMeta}>
                    {lesson.views} views • {lesson.completedCount} completed
                  </Text>
                </View>
                <View style={styles.lessonStats}>
                  <Text style={styles.statBadge}>
                    {lesson.completionRate.toFixed(0)}%
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Empty State */}
        {courses.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>📚 No courses yet</Text>
            <Text style={styles.emptyStateText}>
              Create your first course to see analytics
            </Text>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 20,
    color: "#2c3e50",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666",
  },
  earningsCard: {
    backgroundColor: "#d5f4e6",
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    borderLeftWidth: 5,
    borderLeftColor: "#27ae60",
  },
  summaryLabel: {
    fontSize: 13,
    color: "#555",
    fontWeight: "600",
    marginBottom: 6,
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: "700",
    color: "#27ae60",
    marginBottom: 4,
  },
  feeText: {
    fontSize: 12,
    color: "#666",
  },
  payoutButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#27ae60",
    borderRadius: 8,
    alignItems: "center",
  },
  payoutButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
  chartCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 16,
    color: "#2c3e50",
  },
  chart: {
    borderRadius: 8,
  },
  courseSelectorContainer: {
    marginBottom: 20,
  },
  selectorLabel: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
    color: "#2c3e50",
  },
  courseScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  courseCard: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 12,
    minWidth: 140,
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#e0e0e0",
  },
  courseCardActive: {
    backgroundColor: "#27ae60",
    borderColor: "#27ae60",
  },
  courseCardTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
    color: "#2c3e50",
  },
  courseCardStat: {
    fontSize: 12,
    color: "#555",
    marginBottom: 4,
  },
  detailsCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
    color: "#2c3e50",
  },
  lessonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#3498db",
  },
  lessonInfo: {
    flex: 1,
    marginRight: 12,
  },
  lessonName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2c3e50",
    marginBottom: 4,
  },
  lessonMeta: {
    fontSize: 12,
    color: "#888",
  },
  lessonStats: {
    alignItems: "flex-end",
  },
  statBadge: {
    fontSize: 14,
    fontWeight: "700",
    color: "#27ae60",
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#d5f4e6",
    borderRadius: 12,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2c3e50",
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#888",
  },
});
