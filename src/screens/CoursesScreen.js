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
import { listCourses, getMyCourses } from "../api/courses.js";
import { useAuth } from "../context/AuthContext";
import { getCreatorName } from "../utils/creator";

export default function CoursesScreen() {
  const [courses, setCourses] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDrafts, setShowDrafts] = useState(false);
  const navigation = useNavigation();
  const { isGuildMember } = useAuth();

  async function load() {
    try {
      const [publishedResult, mineResult] = await Promise.allSettled([
        listCourses(),
        getMyCourses()
      ]);

      if (publishedResult.status === "fulfilled") {
        const data = publishedResult.value;
        const normalized = Array.isArray(data)
          ? data
          : Array.isArray(data?.courses)
            ? data.courses
            : [];
        setCourses(normalized);
      } else {
        throw publishedResult.reason || new Error("Failed to load courses");
      }

      if (mineResult.status === "fulfilled") {
        const mine = Array.isArray(mineResult.value) ? mineResult.value : mineResult.value || [];
        const myDrafts = mine.filter((course) => !course.isPublished);
        setDrafts(myDrafts);
      } else {
        setDrafts([]);
      }
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function renderDraftsSection() {
    if (!drafts.length) return null;

    return (
      <View style={styles.draftSection}>
        <View style={styles.draftHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.draftTitle}>
              My Draft Courses <Text style={styles.draftCount}>({drafts.length})</Text>
            </Text>
            <Text style={styles.draftSubtitle}>
              Drafts stay private until you publish. Tap Show to review or keep building.
            </Text>
          </View>
          <View style={styles.draftHeaderActions}>
            <TouchableOpacity
              style={styles.toggleDraftsBtn}
              onPress={() => setShowDrafts((prev) => !prev)}
            >
              <Text style={styles.toggleDraftsText}>{showDrafts ? "Hide" : "Show"}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.manageAllBtn}
              onPress={() => navigation.navigate("CreatorDashboard")}
            >
              <Text style={styles.manageAllText}>Creator Hub</Text>
            </TouchableOpacity>
          </View>
        </View>

        {showDrafts &&
          drafts.map((course) => {
            const lessonsCount =
              typeof course.lessonsCount === "number"
                ? course.lessonsCount
                : Array.isArray(course.lessons)
                  ? course.lessons.length
                  : 0;
            return (
              <View key={course._id} style={styles.draftCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.draftCourseTitle} numberOfLines={1}>
                    {course.title || "Untitled course"}
                  </Text>
                  <Text style={styles.draftMeta}>
                    {lessonsCount} lesson{lessonsCount === 1 ? "" : "s"} ·{" "}
                    {course.category || "Uncategorized"}
                  </Text>
                  <Text style={styles.draftStatus}>
                    {course.isPublished ? "Published" : "Draft"}
                  </Text>
                </View>
                <View style={styles.draftActions}>
                  <TouchableOpacity
                    style={styles.manageBtn}
                    onPress={() => navigation.navigate("ManageCourse", { id: course._id })}
                  >
                    <Text style={styles.manageBtnText}>Manage</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.viewBtn}
                    onPress={() => navigation.navigate("CourseDetail", { course })}
                  >
                    <Text style={styles.viewBtnText}>Open</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
      </View>
    );
  }

  const renderHeaderComponent = () => (
    <View>
      <View
        style={{
          backgroundColor: "#F0FDF4",
          borderRadius: 8,
          padding: 12,
          marginHorizontal: spacing(4),
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
      {renderDraftsSection()}
    </View>
  );

  return (
    <ScreenContainer>
      <FlatList
        data={courses}
        contentContainerStyle={styles.listContent}
        keyExtractor={(c) => c._id}
        ListHeaderComponent={renderHeaderComponent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.courseCard}
            onPress={() => navigation.navigate("CourseDetail", { course: item })}
          >
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

            <View style={styles.courseInfo}>
              <Text style={styles.courseTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={styles.creator} numberOfLines={1}>
                {getCreatorName(item.creator, "Instructor")}
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
  },
  draftSection: {
    marginHorizontal: spacing(4),
    marginBottom: spacing(4),
    backgroundColor: "#F5F3FF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E7FF",
    padding: spacing(4)
  },
  draftHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing(3),
    marginBottom: spacing(3)
  },
  draftTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#312E81"
  },
  draftCount: {
    fontSize: 14,
    color: "#5B21B6"
  },
  draftSubtitle: {
    fontSize: 13,
    color: "#4338CA",
    marginTop: 4
  },
  draftHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  toggleDraftsBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#A5B4FC"
  },
  toggleDraftsText: {
    color: "#4338CA",
    fontWeight: "600"
  },
  manageAllBtn: {
    alignSelf: "flex-start",
    backgroundColor: "#4338CA",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999
  },
  manageAllText: {
    color: "#fff",
    fontWeight: "600"
  },
  draftCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: spacing(3),
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing(3)
  },
  draftCourseTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827"
  },
  draftMeta: {
    marginTop: 4,
    color: "#4B5563"
  },
  draftStatus: {
    color: "#7C3AED",
    marginTop: 4,
    fontSize: 13
  },
  draftActions: {
    flexDirection: "row",
    gap: 8,
    marginLeft: spacing(2)
  },
  manageBtn: {
    backgroundColor: "#0EA5E9",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8
  },
  manageBtnText: {
    color: "#fff",
    fontWeight: "600"
  },
  viewBtn: {
    backgroundColor: "#E0E7FF",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8
  },
  viewBtnText: {
    color: "#3730A3",
    fontWeight: "600"
  }
});
