import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator
} from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import { getCategoryCourses } from "../api/courses";
import { getCreatorName } from "../utils/creator";

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

  // Example entitlement logic: Only Pro users can access paid courses
  const { user } = require("../context/AuthContext.js").useAuth();
  const isPro = user?.plan === "pro" || user?.role === "admin";

  return (
    <ScreenContainer scroll={false}>
      <Text style={styles.header}>{category}</Text>
      {courses.length > 0 ? (
        <FlatList
          data={courses}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const isPaid = item.price > 0;
            const disabled = isPaid && !isPro;
            return (
              <>
                <TouchableOpacity
                  style={[styles.card, disabled && { opacity: 0.5 }]}
                  onPress={() => {
                    if (!disabled) navigation.navigate("Course", { id: item._id });
                  }}
                  disabled={disabled}
                >
                  <View>
                    <Text style={styles.title} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <Text style={styles.creator}>By {getCreatorName(item.creator)}</Text>
                    {item.difficulty && (
                      <Text style={styles.difficulty}>📚 {item.difficulty}</Text>
                    )}
                  </View>
                  <View style={styles.footer}>
                    <Text style={styles.rating}>
                      ⭐ {item.rating.toFixed(1)} ({item.ratingCount})
                    </Text>
                    <Text style={styles.price}>
                      {item.price > 0 ? `$${item.price.toFixed(2)}` : "FREE"}
                    </Text>
                  </View>
                </TouchableOpacity>
                {disabled && (
                  <Text
                    style={{ color: "gray", fontSize: 12, marginTop: 4, marginLeft: 8 }}
                  >
                    Upgrade to Pro to access paid courses
                  </Text>
                )}
              </>
            );
          }}
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
    alignItems: "center"
  },
  loadingText: {
    marginTop: 12,
    color: "#27ae60",
    marginBottom: 8,
    fontWeight: "600"
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8
  },
  rating: {
    fontSize: 12,
    color: "#f39c12",
    fontWeight: "600"
  },
  price: {
    fontSize: 16,
    fontWeight: "700",
    color: "#27ae60"
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 200
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
    fontWeight: "600"
  }
});
