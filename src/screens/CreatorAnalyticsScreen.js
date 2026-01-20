import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import ScreenContainer from "../components/ScreenContainer.js";
import FeatureGate from "../components/FeatureGate.js";
import { getCreatorCourses, getCourseAnalytics } from "../api/creator.js";

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

  return (
    <FeatureGate plan="creator" navigation={navigation} fallback={null}>
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
            <Text style={styles.analyticsTitle}>
              Analytics for: {selectedCourse.title}
            </Text>
            {loadingAnalytics ? (
              <ActivityIndicator size="small" />
            ) : analytics ? (
              <>
                <Text style={styles.analyticsLabel}>
                  Enrollments: {analytics.enrollments}
                </Text>
                <Text style={styles.analyticsLabel}>
                  Completions: {analytics.completions}
                </Text>
                <Text style={styles.analyticsLabel}>
                  Average Progress: {analytics.avgProgress}%
                </Text>
                <Text style={styles.analyticsLabel}>
                  Earnings: ${analytics.earnings?.toFixed(2) ?? 0}
                </Text>
                {/* Add more analytics fields as needed */}
              </>
            ) : (
              <Text style={styles.empty}>No analytics data.</Text>
            )}
          </View>
        )}
      </ScreenContainer>
    </FeatureGate>
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
    borderRadius: 8,
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
    borderRadius: 10,
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
  }
});
