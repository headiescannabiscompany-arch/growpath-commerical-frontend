import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import { addLesson } from "../api/courses";

export default function AddLessonScreen({ route, navigation }) {
  const { courseId } = route.params;

  const [title, setTitle] = useState("");
  const [order, setOrder] = useState("");
  const [content, setContent] = useState("");    // text lesson
  const [videoUrl, setVideoUrl] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");

  async function submit() {
    if (!title.trim()) {
      return Alert.alert("Missing title", "Please add a lesson title.");
    }

    await addLesson(courseId, {
      title,
      order: order ? Number(order) : 1,
      content,
      videoUrl,
      pdfUrl,
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
        placeholder="Write the lesson notes here…"
        value={content}
        onChangeText={setContent}
        multiline
      />

      <Text style={styles.label}>Video URL (optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="https://…"
        value={videoUrl}
        onChangeText={setVideoUrl}
      />

      <Text style={styles.label}>PDF URL (optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="https://…"
        value={pdfUrl}
        onChangeText={setPdfUrl}
      />

      <TouchableOpacity style={styles.btn} onPress={submit}>
        <Text style={styles.btnText}>Save Lesson</Text>
      </TouchableOpacity>
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
    marginBottom: 8,
  },
  textBox: {
    height: 120,
    textAlignVertical: "top",
  },
  btn: {
    marginTop: 16,
    backgroundColor: "#2ecc71",
    paddingVertical: 12,
    borderRadius: 8,
  },
  btnText: {
    textAlign: "center",
    color: "white",
    fontWeight: "700",
    fontSize: 16,
  },
});