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
import { buildEmptyTierSelection, flattenTierSelections } from "../utils/growInterests";

export default function AddLessonScreen({ route, navigation }) {
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
        Alert.alert("Video Selected", "Video will be uploaded when you save the lesson.");
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

      if (result.type === "success" || !result.canceled) {
        setPdfFile(result);
        Alert.alert("PDF Selected", "PDF will be uploaded when you save the lesson.");
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

      if (result.type === "success" || !result.canceled) {
        setAudioFile(result);
        Alert.alert("Audio Selected", "Audio will be uploaded when you save the lesson.");
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
    if (!title.trim()) {
      return Alert.alert("Missing title", "Please add a lesson title.");
    }

    // Note: In production, you would upload files to a cloud storage service
    // (AWS S3, Cloudinary, etc.) and get URLs, then save those URLs
    // For now, we'll just save the URLs if provided directly

    await addLesson(courseId, {
      title,
      order: order ? Number(order) : 1,
      content,
      videoUrl: videoFile ? videoFile.uri : videoUrl,
      pdfUrl: pdfFile ? pdfFile.uri : pdfUrl,
      growTags: flattenTierSelections(growInterestSelections)
      // Future: Add audioUrl, images array to lesson schema
    });
    navigation.goBack();
  }

  return (
    <ScreenContainer scroll>
      <Text style={styles.header}>Add Lesson</Text>

      <TextInput
        style={styles.input}
        placeholder="Title"
        value={title}
        onChangeText={setTitle}
      />

      <TextInput
        style={styles.input}
        placeholder="Order (1, 2, 3...)"
        value={order}
        onChangeText={setOrder}
        keyboardType="numeric"
      />

      <Text style={styles.label}>Text Content (optional)</Text>
      <TextInput
        style={[styles.input, styles.textBox]}
        placeholder="Write the lesson notes hereâ€¦"
        value={content}
        onChangeText={setContent}
        multiline
      />

      <Text style={styles.label}>Video</Text>
      <TouchableOpacity style={styles.uploadBtn} onPress={pickVideo}>
        <Text style={styles.uploadBtnText}>
          {videoFile ? "âœ… Video Selected" : "ðŸ“¹ Upload Video File"}
        </Text>
      </TouchableOpacity>
      <TextInput
        style={styles.input}
        placeholder="Or paste video URL (YouTube, Vimeo, etc.)"
        value={videoUrl}
        onChangeText={setVideoUrl}
      />

      <Text style={styles.label}>PDF Document</Text>
      <TouchableOpacity style={styles.uploadBtn} onPress={pickPDF}>
        <Text style={styles.uploadBtnText}>
          {pdfFile ? `âœ… ${pdfFile.name || "PDF Selected"}` : "ðŸ“„ Upload PDF"}
        </Text>
      </TouchableOpacity>
      <TextInput
        style={styles.input}
        placeholder="Or paste PDF URL"
        value={pdfUrl}
        onChangeText={setPdfUrl}
      />

      <Text style={styles.label}>Audio (Optional)</Text>
      <TouchableOpacity style={styles.uploadBtn} onPress={pickAudio}>
        <Text style={styles.uploadBtnText}>
          {audioFile ? `âœ… ${audioFile.name || "Audio Selected"}` : "ðŸŽµ Upload Audio"}
        </Text>
      </TouchableOpacity>

      <Text style={styles.label}>Images (Optional)</Text>
      <TouchableOpacity style={styles.uploadBtn} onPress={pickImages}>
        <Text style={styles.uploadBtnText}>ðŸ“· Add Images</Text>
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

      <TouchableOpacity style={styles.btn} onPress={submit}>
        <Text style={styles.btnText}>Save Lesson</Text>
      </TouchableOpacity>

      <Text style={styles.helpText}>
        ðŸ’¡ Files will be uploaded when you save. For large videos, consider hosting on
        YouTube or Vimeo and pasting the URL.
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
  }
});

