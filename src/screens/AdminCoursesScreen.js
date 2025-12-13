import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  TextInput
} from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import { spacing } from "../theme/theme";
import { getPendingCourses, approveCourse, rejectCourse } from "../api/courses";

export default function AdminCoursesScreen({ navigation }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");

  async function loadCourses() {
    try {
      setLoading(true);
      const data = await getPendingCourses(filter);
      setCourses(data || []);
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to load courses");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCourses();
  }, [filter]);

  const handleApprove = async (courseId) => {
    Alert.alert(
      "Approve Course",
      "This will publish the course and make it available to all users.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve",
          style: "default",
          onPress: async () => {
            try {
              await approveCourse(courseId);
              Alert.alert("Success", "Course approved and published!");
              loadCourses(); // Refresh list
            } catch (err) {
              Alert.alert("Error", err.message || "Failed to approve course");
            }
          }
        }
      ]
    );
  };

  const handleReject = async (courseId) => {
    Alert.prompt(
      "Reject Course",
      "Please provide a reason for rejection:",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: async (reason) => {
            try {
              await rejectCourse(courseId, reason);
              Alert.alert("Success", "Course rejected");
              loadCourses(); // Refresh list
            } catch (err) {
              Alert.alert("Error", err.message || "Failed to reject course");
            }
          }
        }
      ],
      "plain-text",
      "",
      "default"
    );
  };

  const renderFilterButton = (value, label) => (
    <TouchableOpacity
      style={[styles.filterBtn, filter === value && styles.filterBtnActive]}
      onPress={() => setFilter(value)}
    >
      <Text
        style={[styles.filterBtnText, filter === value && styles.filterBtnTextActive]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const getStatusBadge = (status) => {
    const badges = {
      draft: { text: "Draft", color: "#6B7280", bg: "#F3F4F6" },
      pending: { text: "Pending Review", color: "#F59E0B", bg: "#FEF3C7" },
      approved: { text: "Approved", color: "#10B981", bg: "#ECFDF5" },
      rejected: { text: "Rejected", color: "#EF4444", bg: "#FEE2E2" }
    };

    const badge = badges[status] || badges.draft;

    return (
      <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
        <Text style={[styles.statusText, { color: badge.color }]}>{badge.text}</Text>
      </View>
    );
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Review Courses</Text>
          <Text style={styles.subtitle}>Admin dashboard</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {renderFilterButton("pending", "Pending")}
        {renderFilterButton("approved", "Approved")}
        {renderFilterButton("rejected", "Rejected")}
        {renderFilterButton("draft", "Draft")}
      </View>

      {/* Courses List */}
      <FlatList
        data={courses}
        contentContainerStyle={styles.listContent}
        keyExtractor={(c) => c._id}
        renderItem={({ item }) => (
          <View style={styles.courseCard}>
            {/* Course Preview */}
            <View style={styles.coursePreview}>
              <View style={styles.thumbnailSmall}>
                {item.thumbnail || item.coverImage ? (
                  <Image
                    source={{ uri: item.thumbnail || item.coverImage }}
                    style={styles.thumbnailImage}
                  />
                ) : (
                  <Text style={styles.thumbnailIcon}>📚</Text>
                )}
              </View>

              <View style={styles.courseDetails}>
                <Text style={styles.courseTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.creator} numberOfLines={1}>
                  By {item.creator?.name || "Unknown"}
                </Text>
                <View style={styles.metaRow}>
                  <Text style={styles.metaText}>{item.category}</Text>
                  {item.priceCents > 0 && (
                    <Text style={styles.price}>
                      ${(item.priceCents / 100).toFixed(2)}
                    </Text>
                  )}
                  {item.priceCents === 0 && <Text style={styles.freeTag}>FREE</Text>}
                </View>
              </View>
            </View>

            {/* Status & Actions */}
            <View style={styles.cardFooter}>
              {getStatusBadge(item.status)}

              {item.status === "pending" && (
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.rejectBtn]}
                    onPress={() => handleReject(item._id)}
                  >
                    <Text style={styles.rejectBtnText}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.approveBtn]}
                    onPress={() => handleApprove(item._id)}
                  >
                    <Text style={styles.approveBtnText}>Approve</Text>
                  </TouchableOpacity>
                </View>
              )}

              {item.status === "rejected" && item.rejectionReason && (
                <Text style={styles.rejectionReason} numberOfLines={2}>
                  Reason: {item.rejectionReason}
                </Text>
              )}
            </View>

            {/* View Details Button */}
            <TouchableOpacity
              style={styles.viewDetailsBtn}
              onPress={() => navigation.navigate("CourseDetail", { course: item })}
            >
              <Text style={styles.viewDetailsText}>View Details →</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>No {filter} courses</Text>
              <Text style={styles.emptyText}>
                {filter === "pending"
                  ? "No courses waiting for review"
                  : `No ${filter} courses found`}
              </Text>
            </View>
          )
        }
        refreshing={loading}
        onRefresh={loadCourses}
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
    color: "#111827"
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4
  },
  filterRow: {
    flexDirection: "row",
    padding: spacing(4),
    gap: 8
  },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6"
  },
  filterBtnActive: {
    backgroundColor: "#10B981"
  },
  filterBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280"
  },
  filterBtnTextActive: {
    color: "#FFFFFF"
  },
  listContent: {
    padding: spacing(4),
    paddingBottom: 100
  },
  courseCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    marginBottom: spacing(3),
    padding: spacing(3)
  },
  coursePreview: {
    flexDirection: "row",
    marginBottom: spacing(3)
  },
  thumbnailSmall: {
    width: 80,
    height: 60,
    borderRadius: 8,
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing(3),
    overflow: "hidden"
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover"
  },
  thumbnailIcon: {
    fontSize: 32
  },
  courseDetails: {
    flex: 1
  },
  courseTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4
  },
  creator: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 6
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  metaText: {
    fontSize: 12,
    color: "#9CA3AF"
  },
  price: {
    fontSize: 14,
    fontWeight: "700",
    color: "#10B981"
  },
  freeTag: {
    fontSize: 12,
    fontWeight: "700",
    color: "#10B981"
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: spacing(3)
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: spacing(2)
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600"
  },
  actions: {
    flexDirection: "row",
    gap: 8
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center"
  },
  rejectBtn: {
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#EF4444"
  },
  rejectBtnText: {
    color: "#DC2626",
    fontSize: 14,
    fontWeight: "600"
  },
  approveBtn: {
    backgroundColor: "#10B981"
  },
  approveBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600"
  },
  rejectionReason: {
    fontSize: 13,
    color: "#DC2626",
    fontStyle: "italic",
    marginTop: 8
  },
  viewDetailsBtn: {
    marginTop: spacing(2),
    paddingVertical: 8,
    alignItems: "center"
  },
  viewDetailsText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280"
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center"
  }
});
