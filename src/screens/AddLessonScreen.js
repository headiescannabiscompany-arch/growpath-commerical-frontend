import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import ScreenContainer from "../components/ScreenContainer";
import GrowInterestPicker from "../components/GrowInterestPicker";
import { addLesson } from "../api/courses";
import { uploadCourseMedia } from "@/api/uploads";
import { useEntitlements } from "@/entitlements";
import { getLearningAccess } from "@/features/learning/learningAccess";
import { maybePromptAttachPhotosToGrow } from "@/utils/growPhotoAttachment";
import { persistImageUris } from "@/utils/photoUploads";
import { buildEmptyTierSelection, flattenTierSelections } from "../utils/growInterests";

function firstDocumentAsset(result) {
  if (!result || result.canceled) return null;
  if (Array.isArray(result.assets) && result.assets[0]) return result.assets[0];
  if (result.type === "success") return result;
  return null;
}

export default function AddLessonScreen({ route, navigation }) {
  const entitlements = useEntitlements();
  const access = getLearningAccess(entitlements);
  const { courseId } = route.params;

  const [title, setTitle] = useState("");
  const [order, setOrder] = useState("");
  const [content, setContent] = useState(""); // text lesson
  const [videoUrl, setVideoUrl] = useState("");
  const [videoFile, setVideoFile] = useState(null);
  const [pdfUrl, setPdfUrl] = useState("");
  const [pdfFile, setPdfFile] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [images, setImages] = useState([]);
  const [growInterestSelections, setGrowInterestSelections] = useState(() =>
    buildEmptyTierSelection()
  );

  async function pickVideo() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        quality: 1
      });

      if (!result.canceled && result.assets[0]) {
        setVideoFile(result.assets[0]);
        Alert.alert("Video selected", "Video will upload when you save the lesson.");
      }
    } catch (_err) {
      Alert.alert("Error", "Failed to pick video");
    }
  }

  async function pickPDF() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf"
      });

      const asset = firstDocumentAsset(result);
      if (asset) {
        setPdfFile(asset);
        Alert.alert("PDF selected", "PDF will upload when you save the lesson.");
      }
    } catch (_err) {
      Alert.alert("Error", "Failed to pick PDF");
    }
  }

  async function pickAudio() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "audio/*"
      });

      const asset = firstDocumentAsset(result);
      if (asset) {
        setAudioFile(asset);
        Alert.alert("Audio selected", "Audio will upload when you save the lesson.");
      }
    } catch (_err) {
      Alert.alert("Error", "Failed to pick audio");
    }
  }

  async function pickImages() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8
      });

      if (!result.canceled) {
        setImages([...images, ...result.assets]);
      }
    } catch (_err) {
      Alert.alert("Error", "Failed to pick images");
    }
  }

  async function submit() {
    if (!access.canCreateCourses) {
      return Alert.alert("Unavailable", "Adding lessons requires COURSES_CREATE.");
    }
    if (!title.trim()) {
      return Alert.alert("Missing title", "Please add a lesson title.");
    }

    const [imageUrls, uploadedVideo, uploadedPdf, uploadedAudio] = await Promise.all([
      persistImageUris(images.map((image) => image.uri)),
      videoFile ? uploadCourseMedia(videoFile) : Promise.resolve(null),
      pdfFile ? uploadCourseMedia(pdfFile) : Promise.resolve(null),
      audioFile ? uploadCourseMedia(audioFile) : Promise.resolve(null)
    ]);

    await addLesson(courseId, {
      title,
      order: order ? Number(order) : 1,
      content,
      videoUrl: uploadedVideo?.url || videoUrl,
      pdfUrl: uploadedPdf?.url || pdfUrl,
      audioUrl: uploadedAudio?.url || "",
      imageUrls,
      growTags: flattenTierSelections(growInterestSelections)
    });
    if (imageUrls.length) {
      try {
        await maybePromptAttachPhotosToGrow(imageUrls);
      } catch (attachError) {
        console.warn("Unable to attach lesson images to grow:", attachError);
      }
    }
    navigation.goBack();
  }

  return (
    <ScreenContainer scroll>
      <Text style={styles.header}>Add Lesson</Text>
      {!access.canCreateCourses ? (
        <View style={styles.lockedCard}>
          <Text style={styles.lockedTitle}>Lesson authoring unavailable</Text>
          <Text style={styles.helpText}>This account does not have COURSES_CREATE.</Text>
        </View>
      ) : null}
      <Text style={styles.helpText}>
        Lesson limit per course:{" "}
        {access.maxLessonsPerCourse === null ? "unlimited" : access.maxLessonsPerCourse}
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Title"
        value={title}
        onChangeText={setTitle}
        editable={access.canCreateCourses}
      />

      <TextInput
        style={styles.input}
        placeholder="Order (1, 2, 3...)"
        value={order}
        onChangeText={setOrder}
        keyboardType="numeric"
        editable={access.canCreateCourses}
      />

      <Text style={styles.label}>Text Content (optional)</Text>
      <TextInput
        style={[styles.input, styles.textBox]}
        placeholder="Write the lesson notes here..."
        value={content}
        onChangeText={setContent}
        multiline
        editable={access.canCreateCourses}
      />

      <Text style={styles.label}>Video</Text>
      <TouchableOpacity
        style={[styles.uploadBtn, !access.canCreateCourses && styles.disabled]}
        onPress={pickVideo}
        disabled={!access.canCreateCourses}
      >
        <Text style={styles.uploadBtnText}>
          {videoFile ? "Video Selected" : "Upload Video File"}
        </Text>
      </TouchableOpacity>
      <TextInput
        style={styles.input}
        placeholder="Or paste video URL (YouTube, Vimeo, etc.)"
        value={videoUrl}
        onChangeText={setVideoUrl}
        editable={access.canCreateCourses}
      />

      <Text style={styles.label}>PDF Document</Text>
      <TouchableOpacity
        style={[styles.uploadBtn, !access.canCreateCourses && styles.disabled]}
        onPress={pickPDF}
        disabled={!access.canCreateCourses}
      >
        <Text style={styles.uploadBtnText}>
          {pdfFile ? `${pdfFile.name || "PDF Selected"}` : "Upload PDF"}
        </Text>
      </TouchableOpacity>
      <TextInput
        style={styles.input}
        placeholder="Or paste PDF URL"
        value={pdfUrl}
        onChangeText={setPdfUrl}
        editable={access.canCreateCourses}
      />

      <Text style={styles.label}>Audio (Optional)</Text>
      <TouchableOpacity
        style={[styles.uploadBtn, !access.canCreateCourses && styles.disabled]}
        onPress={pickAudio}
        disabled={!access.canCreateCourses}
      >
        <Text style={styles.uploadBtnText}>
          {audioFile ? `${audioFile.name || "Audio Selected"}` : "Upload Audio"}
        </Text>
      </TouchableOpacity>

      <Text style={styles.label}>Images (Optional)</Text>
      <TouchableOpacity
        style={[styles.uploadBtn, !access.canCreateCourses && styles.disabled]}
        onPress={pickImages}
        disabled={!access.canCreateCourses}
      >
        <Text style={styles.uploadBtnText}>Add Images</Text>
      </TouchableOpacity>
      {images.length > 0 && (
        <View style={styles.imageGrid}>
          {images.map((img, idx) => (
            <Image key={idx} source={{ uri: img.uri }} style={styles.imageThumb} />
          ))}
        </View>
      )}

      <GrowInterestPicker
        title="Lesson Grow Tags"
        helperText="Mark which growers will find this lesson relevant. Leave any tier empty."
        value={growInterestSelections}
        onChange={setGrowInterestSelections}
        defaultExpanded={false}
      />

      <TouchableOpacity
        style={[styles.btn, !access.canCreateCourses && styles.disabled]}
        onPress={submit}
        disabled={!access.canCreateCourses}
      >
        <Text style={styles.btnText}>Save Lesson</Text>
      </TouchableOpacity>

      <Text style={styles.helpText}>
        Selected images, videos, PDFs, and audio upload when you save. Pasted video and
        PDF links are saved as provided.
      </Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { fontSize: 22, fontWeight: "700", marginBottom: 10 },
  label: { marginTop: 10, marginBottom: 4, fontWeight: "600" },
  input: {
    backgroundColor: "#eee",
    padding: 10,
    borderRadius: 8,
    marginBottom: 8
  },
  textBox: {
    height: 120,
    textAlignVertical: "top"
  },
  uploadBtn: {
    backgroundColor: "#007AFF",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: "center"
  },
  uploadBtnText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 15
  },
  btn: {
    marginTop: 16,
    backgroundColor: "#2ecc71",
    paddingVertical: 12,
    borderRadius: 8
  },
  btnText: {
    textAlign: "center",
    color: "white",
    fontWeight: "700",
    fontSize: 16
  },
  imageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12
  },
  imageThumb: {
    width: 80,
    height: 80,
    borderRadius: 8
  },
  helpText: {
    fontSize: 13,
    color: "#666",
    marginTop: 16,
    textAlign: "center",
    paddingHorizontal: 20
  },
  lockedCard: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    backgroundColor: "#f8fafc"
  },
  lockedTitle: { fontWeight: "700" },
  disabled: { opacity: 0.5 }
});
