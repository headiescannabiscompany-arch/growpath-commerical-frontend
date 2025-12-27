import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import ScreenContainer from "../components/ScreenContainer.js";
import { colors, spacing, radius } from "../theme/theme.js";
import { listCourses } from "../api/courses.js";
import { useAuth } from "../context/AuthContext";

export default function CoursesScreen() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();
  const { isGuildMember } = useAuth();

  async function load() {
    try {
      const data = await listCourses();
      setCourses(data || []);
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <ScreenContainer>
      <View
        style={{
          backgroundColor: "#F0FDF4",
          borderRadius: 8,
          padding: 12,
          marginBottom: 12
        }}
      >
        <Text
          style={{ color: "#10B981", fontWeight: "600", fontSize: 15, marginBottom: 2 }}
        >
          🎓 Learn the Why, Not Just the How
        </Text>
        <Text style={{ color: "#222", fontSize: 13 }}>
          These courses are designed to help you understand the principles behind every
          technique. Don’t just follow steps—explore the reasons, ask questions, and adapt
          what you learn to your unique grow. True mastery comes from curiosity and
          context.
        </Text>
      </View>
      {/* Header with Create Button */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Learn & Grow</Text>
          <Text style={styles.subtitle}>
            {isGuildMember ? "Expert-led cannabis courses" : "Expert-led grow courses"}
          </Text>
          {!isGuildMember && (
            <Text style={styles.guildHint}>
              Join a guild when you want crop-specific realms, while keeping your learning
              path focused on the fundamentals until you opt in.
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => navigation.navigate("CreateCourse")}
        >
          <Text style={styles.createBtnText}>+ Create</Text>
        </TouchableOpacity>
      </View>

      {/* Course Grid */}
      <FlatList
        data={courses}
        contentContainerStyle={styles.listContent}
        keyExtractor={(c) => c._id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.courseCard}
            onPress={() => navigation.navigate("CourseDetail", { course: item })}
          >
            {/* Course Thumbnail */}
            <View style={styles.thumbnail}>
              {item.thumbnail ? (
                <Image source={{ uri: item.thumbnail }} style={styles.thumbnailImage} />
              ) : (
                <View style={styles.thumbnailPlaceholder}>
                  <Text style={styles.thumbnailIcon}>📚</Text>
                </View>
              )}
              {item.priceCents === 0 && (
                <View style={styles.freeBadge}>
                  <Text style={styles.freeBadgeText}>FREE</Text>
                </View>
              )}
            </View>

            {/* Course Info */}
            <View style={styles.courseInfo}>
              <Text style={styles.courseTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={styles.creator} numberOfLines={1}>
                {item.creator?.displayName || "Instructor"}
              </Text>

              <View style={styles.courseMeta}>
                <Text style={styles.metaText}>{item.lessons?.length || 0} lessons</Text>
                {item.priceCents > 0 && (
                  <Text style={styles.price}>${(item.priceCents / 100).toFixed(2)}</Text>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🎓</Text>
              <Text style={styles.emptyTitle}>No courses yet</Text>
              <Text style={styles.emptyText}>
                Be the first to create a course and share your expertise
              </Text>
            </View>
          )
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(4),
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6"
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.5
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4
  },
  guildHint: {
    fontSize: 13,
    color: "#4B5563",
    marginTop: 8,
    maxWidth: 280
  },
  createBtn: {
    backgroundColor: "#10B981",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8
  },
  createBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600"
  },
  listContent: {
    padding: spacing(4),
    paddingBottom: 100
  },
  courseCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: spacing(4),
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB"
  },
  thumbnail: {
    width: "100%",
    height: 180,
    backgroundColor: "#F9FAFB",
    position: "relative"
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover"
  },
  thumbnailPlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6"
  },
  thumbnailIcon: {
    fontSize: 64,
    opacity: 0.5
  },
  freeBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "#10B981",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6
  },
  freeBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700"
  },
  courseInfo: {
    padding: spacing(4)
  },
  courseTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
    lineHeight: 24
  },
  creator: {
    color: "#6B7280",
    fontSize: 14,
    marginBottom: 12
  },
  courseMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  metaText: {
    fontSize: 13,
    color: "#9CA3AF"
  },
  price: {
    fontSize: 20,
    fontWeight: "700",
    color: "#10B981"
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: 40
  }
});
