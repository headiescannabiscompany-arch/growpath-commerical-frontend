import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  Switch,
  TextInput
} from "react-native";

import ScreenContainer from "../components/ScreenContainer";
import {
  getCourse,
  deleteLesson,
  submitCourseForReview,
  updateCourse,
  publishCourse,
  getMyCourses
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
  const [editPrice, setEditPrice] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [activeCount, setActiveCount] = useState(0);

  async function load() {
    const res = await getCourse(id);
    const normalizedCourse = res.course || res.data?.course || res;
    setCourse(normalizedCourse);
    setLessons(res.lessons || res.data?.lessons || []);
    setCourseTagSelections(groupTagsByTier(normalizedCourse?.growTags || []));
    const priceValue =
      typeof normalizedCourse?.price === "number"
        ? normalizedCourse.price
        : typeof normalizedCourse?.priceCents === "number"
          ? normalizedCourse.priceCents / 100
          : 0;
    setEditPrice(priceValue ? priceValue.toString() : "");
    setEditDescription(normalizedCourse?.description || "");
    setEditCategory(normalizedCourse?.category || "");

    try {
      const mine = await getMyCourses();
      const active = Array.isArray(mine)
        ? mine.filter((c) => c.isPublished || ["pending", "approved"].includes(c.status))
        : [];
      setActiveCount(active.length);
    } catch (err) {
      setActiveCount(0);
    }
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

    if (activeCount >= 3) {
      Alert.alert(
        "Limit reached",
        "You already have 3 active courses (published or pending). Unpublish one before submitting another."
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
    if (nextValue && activeCount >= 3) {
      Alert.alert(
        "Limit reached",
        "You already have 3 active courses (published or pending). Unpublish one first."
      );
      return;
    }
    setPublishLoading(true);
    try {
      if (nextValue) {
        const updated = await publishCourse(course._id);
        setCourse(updated || { ...course, isPublished: true });
      } else {
        const updated = await updateCourse(course._id, { isPublished: false });
        setCourse(updated || { ...course, isPublished: false });
      }
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

  async function handleSaveDetails() {
    if (!course) return;
    if (!editDescription.trim()) {
      Alert.alert("Add description", "Description is required.");
      return;
    }
    if (!editCategory.trim()) {
      Alert.alert("Add category", "Category is required.");
      return;
    }
    if (editPrice) {
      const parsed = parseFloat(editPrice);
      if (Number.isNaN(parsed)) {
        Alert.alert("Price invalid", "Enter a number or leave blank for free.");
        return;
      }
      if (parsed < 10 || parsed > 250) {
        Alert.alert("Price out of range", "Set price between $10 and $250.");
        return;
      }
    }

    try {
      const updated = await updateCourse(course._id, {
        description: editDescription.trim(),
        category: editCategory.trim(),
        price: editPrice ? parseFloat(editPrice) : 0,
        priceCents: editPrice ? Math.round(parseFloat(editPrice) * 100) : 0
      });
      setCourse(updated);
      Alert.alert("Saved", "Course details updated.");
    } catch (err) {
      Alert.alert("Error", err?.message || "Failed to update course details");
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

      <View style={styles.editCard}>
        <Text style={styles.sectionHeader}>Edit details</Text>
        <Text style={styles.editLabel}>Category</Text>
        <TextInput
          style={styles.editInput}
          value={editCategory}
          onChangeText={setEditCategory}
          placeholder="Training, nutrients, lighting"
        />
        <Text style={styles.editLabel}>Description</Text>
        <TextInput
          style={[styles.editInput, { height: 100, textAlignVertical: "top" }]}
          value={editDescription}
          onChangeText={setEditDescription}
          multiline
        />
        <Text style={styles.editLabel}>Price (USD, 10-250)</Text>
        <View style={styles.priceRow}>
          <Text style={styles.priceSymbol}>$</Text>
          <TextInput
            style={[styles.editInput, { flex: 1 }]}
            value={editPrice}
            onChangeText={setEditPrice}
            keyboardType="decimal-pad"
            placeholder="0 for free"
          />
        </View>
        <TouchableOpacity style={styles.saveDetailsBtn} onPress={handleSaveDetails}>
          <Text style={styles.saveDetailsText}>Save details</Text>
        </TouchableOpacity>
      </View>

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
        <Text style={styles.saveTagsText}>
          {savingTags ? "Saving…" : "Save Grow Tags"}
        </Text>
      </TouchableOpacity>

      <View style={styles.row}>
        <Text style={styles.price}>
          {course.price > 0
            ? `$${course.price.toFixed(2)}`
            : course.priceCents > 0
              ? `$${(course.priceCents / 100).toFixed(2)}`
              : "Free"}
        </Text>
        <Text style={styles.status}>{course.isPublished ? "Published" : "Draft"}</Text>
      </View>

      <View style={styles.statusRow}>
        <Text style={styles.statusChip}>
          {course.isPublished
            ? "Published"
            : course.status === "pending"
              ? "Pending review"
              : course.status === "approved"
                ? "Approved"
                : course.status === "rejected"
                  ? "Rejected"
                  : "Draft"}
        </Text>
        <Text style={styles.statusHelper}>
          Publishing requires approval. Submit for review first, then toggle publish once
          approved.
        </Text>
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
  editCard: {
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 16
  },
  editLabel: {
    fontWeight: "600",
    color: "#111827",
    marginTop: 8,
    marginBottom: 4
  },
  editInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF"
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  priceSymbol: {
    fontWeight: "800",
    fontSize: 16,
    color: "#111827"
  },
  saveDetailsBtn: {
    marginTop: 10,
    backgroundColor: "#0ea5e9",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center"
  },
  saveDetailsText: {
    color: "#fff",
    fontWeight: "700"
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
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8
  },
  statusChip: {
    backgroundColor: "#ECFDF3",
    color: "#166534",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    fontWeight: "700"
  },
  statusHelper: {
    flex: 1,
    fontSize: 12,
    color: "#6B7280"
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
