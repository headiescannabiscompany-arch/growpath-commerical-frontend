import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  Switch
} from "react-native";

import ScreenContainer from "../components/ScreenContainer";
import {
  getCourse,
  deleteLesson,
  submitCourseForReview,
  updateCourse
} from "../api/courses";
import GrowInterestPicker from "../components/GrowInterestPicker";
import {
  buildEmptyTierSelection,
  flattenTierSelections,
  groupTagsByTier
} from "../utils/growInterests";

export default function ManageCourseScreen({ route, navigation }) {
  const { id } = route.params;
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [publishLoading, setPublishLoading] = useState(false);
  const [courseTagSelections, setCourseTagSelections] = useState(() =>
    buildEmptyTierSelection()
  );
  const [savingTags, setSavingTags] = useState(false);

  async function load() {
    const res = await getCourse(id);
    const normalizedCourse = res.course || res.data?.course || res;
    setCourse(normalizedCourse);
    setLessons(res.lessons || res.data?.lessons || []);
    setCourseTagSelections(groupTagsByTier(normalizedCourse?.growTags || []));
  }

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", load);
    return unsubscribe;
  }, [navigation]);

  async function handleSubmitForReview() {
    if (lessons.length === 0) {
      Alert.alert(
        "No Lessons",
        "Please add at least one lesson before submitting for review."
      );
      return;
    }

    Alert.alert(
      "Submit for Review?",
      "Your course will be reviewed by our team before going live. This usually takes 1-2 business days.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Submit",
          onPress: async () => {
            try {
              await submitCourseForReview(id);
              Alert.alert(
                "Submitted!",
                "Your course has been submitted for review. You'll receive an email when it's approved."
              );
              load();
            } catch (err) {
              Alert.alert("Error", err.message || "Failed to submit course");
            }
          }
        }
      ]
    );
  }

  async function handleDeleteLesson(lessonId) {
    Alert.alert("Delete lesson?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteLesson(lessonId);
          load();
        }
      }
    ]);
  }

  const readyToPublish = lessons.length > 0 || !!course?.contentUrl;
  const statusAllowsPublish = !course?.status || course.status === "approved";

  async function handlePublishToggle(nextValue) {
    if (!course) return;
    if (nextValue && !readyToPublish) {
      Alert.alert("Add content first", "Add lessons or a course link before publishing.");
      return;
    }
    if (nextValue && !statusAllowsPublish) {
      Alert.alert("Pending approval", "This course must be approved before publishing.");
      return;
    }
    setPublishLoading(true);
    try {
      await updateCourse(course._id, { isPublished: nextValue });
      setCourse((prev) => ({ ...prev, isPublished: nextValue }));
    } catch (err) {
      Alert.alert("Error", err?.message || "Failed to update publish status");
    } finally {
      setPublishLoading(false);
    }
  }

  function renderLesson({ item }) {
    const typeLabel = item.videoUrl
      ? "Video"
      : item.pdfUrl
        ? "PDF"
        : item.content
          ? "Text"
          : "Empty";

    return (
      <View style={styles.lessonRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.lessonTitle}>
            {item.order}. {item.title}
          </Text>
          <Text style={styles.lessonMeta}>{typeLabel}</Text>
        </View>

        <TouchableOpacity
          onPress={() =>
            navigation.navigate("EditLesson", { lessonId: item._id, lesson: item })
          }
        >
          <Text style={styles.link}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => handleDeleteLesson(item._id)}>
          <Text style={[styles.link, { color: "red" }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleCourseTagsChange = (next) => {
    setCourseTagSelections(next);
  };

  async function handleSaveCourseTags() {
    if (!course) return;
    setSavingTags(true);
    try {
      const updated = await updateCourse(course._id, {
        growTags: flattenTierSelections(courseTagSelections)
      });
      setCourse(updated);
      setCourseTagSelections(groupTagsByTier(updated?.growTags || []));
      Alert.alert("Saved", "Course tags updated.");
    } catch (err) {
      Alert.alert("Error", err?.message || "Failed to update grow interests");
    } finally {
      setSavingTags(false);
    }
  }

  if (!course)
    return (
      <ScreenContainer>
        <Text>Loading…</Text>
      </ScreenContainer>
    );

  return (
    <ScreenContainer scroll>
      {course.coverImage ? (
        <Image source={{ uri: course.coverImage }} style={styles.cover} />
      ) : null}

      <Text style={styles.title}>{course.title}</Text>
      <Text style={styles.sub}>{course.category || "Uncategorized"}</Text>
      <Text style={styles.desc}>{course.description}</Text>

        <GrowInterestPicker
          title="Grow Interest Tags"
          helperText="Select the tiers that best describe this course. You can leave any tier empty."
          value={courseTagSelections}
          onChange={handleCourseTagsChange}
        />
      <TouchableOpacity
        style={[styles.saveTagsBtn, savingTags && styles.saveTagsBtnDisabled]}
        onPress={handleSaveCourseTags}
        disabled={savingTags}
      >
        <Text style={styles.saveTagsText}>{savingTags ? "Saving…" : "Save Grow Tags"}</Text>
      </TouchableOpacity>

      <View style={styles.row}>
        <Text style={styles.price}>
          {course.price > 0 ? `$${course.price.toFixed(2)}` : "Free"}
        </Text>
        <Text style={styles.status}>{course.isPublished ? "Published" : "Draft"}</Text>
      </View>

      <View style={styles.publishToggle}>
        <View style={{ flex: 1 }}>
          <Text style={styles.publishToggleTitle}>Publish Course</Text>
          <Text style={styles.publishToggleSubtitle}>
            {readyToPublish
              ? statusAllowsPublish
                ? "Toggle visibility when you're ready to go live."
                : "Course must be approved before publishing."
              : "Add lessons or a course link to enable publishing."}
          </Text>
        </View>
        <Switch
          value={!!course.isPublished}
          onValueChange={handlePublishToggle}
          disabled={
            publishLoading ||
            (!readyToPublish && !course.isPublished) ||
            (!statusAllowsPublish && !course.isPublished)
          }
        />
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => navigation.navigate("AddLesson", { courseId: course._id })}
        >
          <Text style={styles.secondaryText}>+ Add Lesson</Text>
        </TouchableOpacity>

        {course.status === "draft" && (
          <TouchableOpacity style={styles.reviewBtn} onPress={handleSubmitForReview}>
            <Text style={styles.reviewText}>📝 Submit for Review</Text>
          </TouchableOpacity>
        )}

        {course.status === "pending" && (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingText}>⏳ Pending Review</Text>
          </View>
        )}

        {course.status === "rejected" && (
          <View style={styles.rejectedSection}>
            <Text style={styles.rejectedText}>❌ Course Rejected</Text>
            {course.rejectionReason && (
              <Text style={styles.rejectionReason}>Reason: {course.rejectionReason}</Text>
            )}
            <TouchableOpacity
              style={[styles.secondaryBtn, { marginTop: 8 }]}
              onPress={handleSubmitForReview}
            >
              <Text style={styles.secondaryText}>Resubmit for Review</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Text style={styles.sectionHeader}>Lessons</Text>

      <FlatList data={lessons} keyExtractor={(l) => l._id} renderItem={renderLesson} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  cover: { width: "100%", height: 200, borderRadius: 10, marginBottom: 10 },
  title: { fontSize: 22, fontWeight: "700" },
  sub: { color: "#777", marginBottom: 4 },
  desc: { marginBottom: 10, color: "#333" },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  price: { fontWeight: "700", fontSize: 16 },
  status: { color: "#27ae60", fontWeight: "600" },
  actionsRow: {
    flexDirection: "row",
    marginBottom: 16
  },
  secondaryBtn: {
    flex: 1,
    marginRight: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#eee",
    alignItems: "center"
  },
  secondaryText: { fontWeight: "600" },
  publishToggle: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    marginBottom: 16
  },
  publishToggleTitle: {
    fontWeight: "700",
    fontSize: 16,
    color: "#111827"
  },
  publishToggleSubtitle: {
    color: "#6B7280",
    fontSize: 13,
    marginTop: 4
  },
  reviewBtn: {
    flex: 1,
    marginLeft: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#007AFF",
    alignItems: "center"
  },
  reviewText: { color: "white", fontWeight: "700" },
  saveTagsBtn: {
    backgroundColor: "#10B981",
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 24
  },
  saveTagsBtnDisabled: {
    opacity: 0.7
  },
  saveTagsText: {
    color: "#FFFFFF",
    fontWeight: "700",
    textAlign: "center",
    fontSize: 16
  },
  pendingBadge: {
    flex: 1,
    marginLeft: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#FFA500",
    alignItems: "center"
  },
  pendingText: { color: "white", fontWeight: "600" },
  rejectedSection: {
    flex: 1,
    marginLeft: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#FFE5E5",
    alignItems: "center"
  },
  rejectedText: {
    color: "#CC0000",
    fontWeight: "700",
    marginBottom: 4
  },
  rejectionReason: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    marginTop: 4
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    marginTop: 4
  },
  lessonRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomColor: "#eee",
    borderBottomWidth: 1
  },
  lessonTitle: { fontWeight: "600" },
  lessonMeta: { color: "#777", fontSize: 12 },
  link: {
    marginLeft: 10,
    color: "#3498db",
    fontWeight: "600"
  }
});
