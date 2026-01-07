import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import ScreenContainer from "../components/ScreenContainer";
import GrowInterestPicker from "../components/GrowInterestPicker";
import { spacing } from "../theme/theme";
import { createCourse, getCourse } from "../api/courses";
import { buildEmptyTierSelection, flattenTierSelections } from "../utils/growInterests";

export default function CreateCourseScreen({ navigation }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [thumbnail, setThumbnail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [growInterestSelections, setGrowInterestSelections] = useState(() =>
    buildEmptyTierSelection()
  );

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please allow photo access to add a thumbnail"
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8
      });

      if (!result.canceled && result.assets[0]) {
        setThumbnail(result.assets[0]);
      }
    } catch (err) {
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const validateForm = () => {
    if (!title.trim()) {
      Alert.alert("Missing Title", "Please enter a course title");
      return false;
    }
    if (!description.trim()) {
      Alert.alert("Missing Description", "Please enter a course description");
      return false;
    }
    if (!category.trim()) {
      Alert.alert("Missing Category", "Please select a category");
      return false;
    }
    if (price && isNaN(parseFloat(price))) {
      Alert.alert("Invalid Price", "Please enter a valid price or leave blank for free");
      return false;
    }
    return true;
  };

  const handleCreateCourse = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const priceCents = price ? Math.round(parseFloat(price) * 100) : 0;

      const payload = {
        title: title.trim(),
        description: description.trim(),
        category: category.trim(),
        priceCents,
        thumbnail: thumbnail?.uri || "",
        status: "draft", // Courses start as draft
        growTags: flattenTierSelections(growInterestSelections)
      };

      const newCourse = await createCourse(payload);
      let normalizedCourse = newCourse;
      try {
        const detail = await getCourse(newCourse._id);
        normalizedCourse = detail?.course || detail || newCourse;
      } catch (err) {
        // fall back to the original payload if detail fetch fails
      }

      Alert.alert(
        "Course Created! 🎉",
        "Your course has been saved as a draft. Add lessons next, then submit for review."
      );

      navigation.replace("CourseDetail", { course: normalizedCourse });
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to create course");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.headerTitle}>Create New Course</Text>
        <Text style={styles.headerSubtitle}>
          Share your expertise and earn money teaching others
        </Text>

        {/* Thumbnail Upload */}
        <View style={styles.section}>
          <Text style={styles.label}>Course Thumbnail</Text>
          <TouchableOpacity style={styles.thumbnailPicker} onPress={handlePickImage}>
            {thumbnail ? (
              <Image source={{ uri: thumbnail.uri }} style={styles.thumbnailPreview} />
            ) : (
              <View style={styles.thumbnailPlaceholder}>
                <Text style={styles.thumbnailPlaceholderIcon}>📷</Text>
                <Text style={styles.thumbnailPlaceholderText}>Tap to add image</Text>
                <Text style={styles.thumbnailPlaceholderHint}>
                  16:9 ratio recommended
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Title */}
        <View style={styles.section}>
          <Text style={styles.label}>Course Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Advanced LST Training Techniques"
            placeholderTextColor="#9CA3AF"
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />
          <Text style={styles.charCount}>{title.length}/100</Text>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="What will students learn in this course?"
            placeholderTextColor="#9CA3AF"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={6}
            maxLength={500}
          />
          <Text style={styles.charCount}>{description.length}/500</Text>
        </View>

        {/* Category */}
        <View style={styles.section}>
          <Text style={styles.label}>Category *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Training, Nutrients, Lighting"
            placeholderTextColor="#9CA3AF"
            value={category}
            onChangeText={setCategory}
          />
        </View>

        {/* Price */}
        <View style={styles.section}>
          <Text style={styles.label}>Price (USD)</Text>
          <View style={styles.priceInput}>
            <Text style={styles.priceDollar}>$</Text>
            <TextInput
              style={styles.priceField}
              placeholder="0.00"
              placeholderTextColor="#9CA3AF"
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
            />
          </View>
          <Text style={styles.hint}>
            Leave blank or enter 0 for a free course. You'll earn 85% of paid enrollments.
          </Text>
        </View>

        <GrowInterestPicker
          title="Tag this course"
          helperText="Select the crops, environments, and methods this course focuses on. You can leave any tier empty."
          value={growInterestSelections}
          onChange={setGrowInterestSelections}
          defaultExpanded={false}
        />

        {/* Revenue Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>💰</Text>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Revenue Split</Text>
            <Text style={styles.infoText}>
              You keep 85% of course sales. GrowPath takes 15% (since subscribers already
              pay monthly).
            </Text>
          </View>
        </View>

        {/* Create Button */}
        <TouchableOpacity
          style={[styles.createButton, loading && styles.createButtonDisabled]}
          onPress={handleCreateCourse}
          disabled={loading}
        >
          <Text style={styles.createButtonText}>
            {loading ? "Creating..." : "Create Course"}
          </Text>
        </TouchableOpacity>

        <Text style={styles.footerNote}>
          Courses are saved as drafts. After adding lessons, submit for review to publish.
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  content: {
    padding: spacing(4),
    paddingBottom: 100
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8
  },
  headerSubtitle: {
    fontSize: 15,
    color: "#6B7280",
    marginBottom: 32
  },
  section: {
    marginBottom: 24
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111827"
  },
  textArea: {
    height: 120,
    textAlignVertical: "top",
    paddingTop: 12
  },
  charCount: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "right",
    marginTop: 4
  },
  thumbnailPicker: {
    width: "100%",
    height: 180,
    backgroundColor: "#F9FAFB",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
    borderRadius: 12,
    overflow: "hidden"
  },
  thumbnailPreview: {
    width: "100%",
    height: "100%",
    resizeMode: "cover"
  },
  thumbnailPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  thumbnailPlaceholderIcon: {
    fontSize: 48,
    marginBottom: 8
  },
  thumbnailPlaceholderText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 4
  },
  thumbnailPlaceholderHint: {
    fontSize: 13,
    color: "#9CA3AF"
  },
  priceInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 16
  },
  priceDollar: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6B7280",
    marginRight: 4
  },
  priceField: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111827"
  },
  hint: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 6
  },
  infoCard: {
    flexDirection: "row",
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#10B981",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24
  },
  infoIcon: {
    fontSize: 24,
    marginRight: 12
  },
  infoContent: {
    flex: 1
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#065F46",
    marginBottom: 4
  },
  infoText: {
    fontSize: 14,
    color: "#047857",
    lineHeight: 20
  },
  createButton: {
    backgroundColor: "#10B981",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 16
  },
  createButtonDisabled: {
    backgroundColor: "#9CA3AF"
  },
  createButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700"
  },
  footerNote: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 18
  }
});
