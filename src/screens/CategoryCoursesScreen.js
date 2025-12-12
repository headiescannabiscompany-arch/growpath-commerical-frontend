import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import { getCategoryCourses } from "../api/courses";

export default function CategoryCoursesScreen({ route, navigation }) {
  const { category } = route.params;
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setLoading(true);
      const res = await getCategoryCourses(category);
      setCourses(res.data || res || []);
    } catch (err) {
      console.log("Error loading courses:", err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [category]);

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Loading courses…</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll={false}>
      <Text style={styles.header}>{category}</Text>
      <Text style={styles.subtitle}>
        {courses.length} course{courses.length !== 1 ? "s" : ""} available
      </Text>

      {courses.length > 0 ? (
        <FlatList
          data={courses}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() =>
                navigation.navigate("Course", { id: item._id })
              }
            >
              <Text style={styles.title} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={styles.creator}>
                By {item.creator?.username || "Unknown"}
              </Text>
              {item.difficulty && (
                <Text style={styles.difficulty}>📚 {item.difficulty}</Text>
              )}
              <View style={styles.footer}>
                <Text style={styles.rating}>
                  ⭐ {item.rating.toFixed(1)} ({item.ratingCount})
                </Text>
                <Text style={styles.price}>
                  {item.price > 0 ? `$${item.price.toFixed(2)}` : "FREE"}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No courses in this category yet</Text>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
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
  header: {
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 4,
    color: "#2c3e50",
  },
  subtitle: {
    fontSize: 14,
    color: "#777",
    marginBottom: 16,
  },
  listContent: {
    paddingBottom: 80,
  },
  card: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2c3e50",
    marginBottom: 6,
  },
  creator: {
    fontSize: 12,
    color: "#777",
    marginBottom: 4,
  },
  difficulty: {
    fontSize: 12,
    color: "#27ae60",
    marginBottom: 8,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  rating: {
    fontSize: 12,
    color: "#f39c12",
    fontWeight: "600",
  },
  price: {
    fontSize: 16,
    fontWeight: "700",
    color: "#27ae60",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 200,
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
    fontWeight: "600",
  },
});
